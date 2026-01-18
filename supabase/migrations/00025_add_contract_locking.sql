-- ============================================
-- Migración: Sistema de Bloqueo para Contratos
-- ============================================
-- Agrega soporte para bloqueo de inmuebles durante proceso de contratación
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVOS:
-- 1. Agregar estado 'locked_for_contract' a properties.status
-- 2. Agregar columnas para tracking de bloqueo
-- 3. Preparar constraint para un solo contrato activo por inmueble
--
-- IMPORTANTE:
-- - No elimina estados existentes
-- - No afecta inmuebles actuales (todos mantienen su estado)
-- - Todo es reversible mediante migración de rollback
-- ============================================

-- ============================================
-- 1. ACTUALIZAR CHECK CONSTRAINT DE properties.status
-- ============================================
-- Agregar el nuevo estado 'locked_for_contract' sin eliminar los existentes

-- Primero, eliminar el constraint existente
ALTER TABLE public.properties 
  DROP CONSTRAINT IF EXISTS properties_status_check;

-- Agregar el nuevo constraint con todos los estados (existentes + nuevo)
ALTER TABLE public.properties 
  ADD CONSTRAINT properties_status_check 
  CHECK (status IN (
    'draft',                    -- Borrador (existente)
    'published',                -- Publicado (existente)
    'rented',                   -- Arrendado (existente)
    'paused',                   -- Pausado (existente)
    'locked_for_contract'       -- Bloqueado para contratación (NUEVO)
  ));

-- Comentario de documentación
COMMENT ON CONSTRAINT properties_status_check ON public.properties IS 
  'Estados válidos para propiedades. locked_for_contract indica que el inmueble está en proceso de contratación y no está disponible para otros inquilinos.';

-- ============================================
-- 2. AGREGAR COLUMNAS DE TRACKING DE BLOQUEO
-- ============================================

-- Columna: locked_at
-- Indica cuándo se bloqueó el inmueble para contratación
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone;

COMMENT ON COLUMN public.properties.locked_at IS 
  'Fecha y hora en que el inmueble fue bloqueado para contratación. NULL si no está bloqueado.';

-- Columna: locked_by_contract_id
-- Referencia al contrato que causó el bloqueo
-- NOTA: Esta columna será una foreign key cuando se cree la tabla rental_contracts
-- Por ahora la creamos sin constraint para evitar errores de dependencia circular
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS locked_by_contract_id uuid;

COMMENT ON COLUMN public.properties.locked_by_contract_id IS 
  'ID del contrato de arrendamiento que causó el bloqueo del inmueble. NULL si no está bloqueado. Se agregará foreign key cuando se cree la tabla rental_contracts.';

-- ============================================
-- 3. ÍNDICES PARA OPTIMIZAR BÚSQUEDAS
-- ============================================

-- Índice para búsquedas por estado de bloqueo
CREATE INDEX IF NOT EXISTS properties_locked_at_idx 
  ON public.properties(locked_at) 
  WHERE locked_at IS NOT NULL;

-- Índice para búsquedas por contrato que bloqueó
CREATE INDEX IF NOT EXISTS properties_locked_by_contract_idx 
  ON public.properties(locked_by_contract_id) 
  WHERE locked_by_contract_id IS NOT NULL;

-- Índice compuesto para búsquedas de inmuebles bloqueados
CREATE INDEX IF NOT EXISTS properties_status_locked_idx 
  ON public.properties(status, locked_at) 
  WHERE status = 'locked_for_contract';

-- ============================================
-- 4. FUNCIÓN PARA VALIDAR ESTADO DE BLOQUEO
-- ============================================
-- Función auxiliar para validar coherencia entre status y columnas de bloqueo

CREATE OR REPLACE FUNCTION public.validate_property_lock_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el estado es 'locked_for_contract', las columnas de bloqueo deben estar presentes
  IF NEW.status = 'locked_for_contract' THEN
    IF NEW.locked_at IS NULL THEN
      NEW.locked_at := now();
    END IF;
    -- locked_by_contract_id puede ser NULL temporalmente hasta que se cree el contrato
  END IF;
  
  -- Si el estado NO es 'locked_for_contract', limpiar columnas de bloqueo
  IF NEW.status != 'locked_for_contract' AND OLD.status = 'locked_for_contract' THEN
    NEW.locked_at := NULL;
    NEW.locked_by_contract_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.validate_property_lock_status() IS 
  'Trigger function que valida y mantiene coherencia entre status y columnas de bloqueo. Auto-completa locked_at cuando se bloquea.';

-- Trigger para validar estado de bloqueo
DROP TRIGGER IF EXISTS validate_property_lock_status_trigger ON public.properties;
CREATE TRIGGER validate_property_lock_status_trigger
  BEFORE INSERT OR UPDATE OF status, locked_at, locked_by_contract_id ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_property_lock_status();

-- ============================================
-- 5. PREPARAR CONSTRAINT PARA RENTAL_CONTRACTS
-- ============================================
-- NOTA: Esta sección prepara el constraint que se aplicará cuando se cree la tabla rental_contracts
-- El constraint real se creará en la migración de creación de rental_contracts
-- Aquí solo documentamos la estructura esperada

-- Función auxiliar para verificar si existe contrato activo
-- Esta función se usará en la migración de rental_contracts
CREATE OR REPLACE FUNCTION public.has_active_contract_for_property(property_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Verificar si existe tabla rental_contracts (por si acaso se ejecuta antes)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_contracts'
  ) THEN
    RETURN false;
  END IF;
  
  -- Verificar si existe contrato activo
  RETURN EXISTS (
    SELECT 1
    FROM public.rental_contracts
    WHERE property_id = property_uuid
    AND status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.has_active_contract_for_property(uuid) IS 
  'Verifica si un inmueble tiene un contrato activo. Se usará para validaciones antes de crear nuevos contratos.';

-- ============================================
-- 6. ACTUALIZAR RLS POLICY PARA INMUEBLES BLOQUEADOS
-- ============================================
-- Asegurar que los inmuebles bloqueados solo sean visibles para participantes

-- Policy existente ya cubre: "status = 'published' or owner_id = auth.uid()"
-- Necesitamos extenderla para permitir acceso a inquilinos involucrados

-- Crear función auxiliar para verificar si usuario es participante de contrato activo
CREATE OR REPLACE FUNCTION public.is_property_contract_participant(property_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Si no existe tabla rental_contracts, retornar false
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_contracts'
  ) THEN
    RETURN false;
  END IF;
  
  -- Verificar si el usuario es tenant o owner del contrato activo
  RETURN EXISTS (
    SELECT 1
    FROM public.rental_contracts
    WHERE property_id = property_uuid
    AND status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active', 'signed')
    AND (tenant_id = user_uuid OR owner_id = user_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_property_contract_participant(uuid, uuid) IS 
  'Verifica si un usuario es participante (tenant o owner) de un contrato activo para un inmueble.';

-- Actualizar policy existente para incluir acceso a participantes de contratos
-- NOTA: La policy actual ya permite acceso a owner_id, así que solo necesitamos agregar
-- la verificación para inquilinos involucrados en contratos bloqueados

-- Policy adicional para inquilinos con contrato activo
DROP POLICY IF EXISTS "Inquilinos con contrato activo pueden ver inmueble bloqueado" ON public.properties;
CREATE POLICY "Inquilinos con contrato activo pueden ver inmueble bloqueado"
  ON public.properties FOR SELECT
  USING (
    status = 'locked_for_contract'
    AND public.is_property_contract_participant(id, auth.uid())
  );

-- ============================================
-- 7. FUNCIÓN DE LIMPIEZA AUTOMÁTICA (OPCIONAL)
-- ============================================
-- Función para limpiar bloqueos huérfanos (si un contrato se elimina sin actualizar property)

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_locks()
RETURNS void AS $$
BEGIN
  -- Solo ejecutar si existe la tabla rental_contracts
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_contracts'
  ) THEN
    RETURN;
  END IF;
  
  -- Limpiar propiedades bloqueadas cuyo contrato ya no existe o está en estado final
  UPDATE public.properties
  SET 
    status = 'published',
    locked_at = NULL,
    locked_by_contract_id = NULL
  WHERE status = 'locked_for_contract'
  AND locked_by_contract_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.rental_contracts
    WHERE id = properties.locked_by_contract_id
    AND status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active', 'signed')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_orphaned_locks() IS 
  'Limpia bloqueos huérfanos: propiedades bloqueadas cuyo contrato ya no existe o está en estado final. Ejecutar periódicamente.';

-- ============================================
-- 8. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON COLUMN public.properties.status IS 
  'Estado del inmueble: draft (borrador), published (publicado), rented (arrendado), paused (pausado), locked_for_contract (bloqueado para contratación).';

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
-- 
-- PRÓXIMOS PASOS:
-- 1. Crear tabla rental_contracts (en migración posterior)
-- 2. Agregar foreign key de locked_by_contract_id a rental_contracts.id
-- 3. Crear constraint único para un solo contrato activo por inmueble
-- 4. Crear triggers para actualizar status automáticamente
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. DROP TRIGGER validate_property_lock_status_trigger ON public.properties;
--   2. DROP FUNCTION public.validate_property_lock_status();
--   3. DROP FUNCTION public.has_active_contract_for_property(uuid);
--   4. DROP FUNCTION public.is_property_contract_participant(uuid, uuid);
--   5. DROP FUNCTION public.cleanup_orphaned_locks();
--   6. DROP POLICY "Inquilinos con contrato activo pueden ver inmueble bloqueado" ON public.properties;
--   7. DROP INDEX properties_locked_at_idx;
--   8. DROP INDEX properties_locked_by_contract_idx;
--   9. DROP INDEX properties_status_locked_idx;
--  10. ALTER TABLE public.properties DROP COLUMN IF EXISTS locked_at;
--  11. ALTER TABLE public.properties DROP COLUMN IF EXISTS locked_by_contract_id;
--  12. ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
--  13. ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
--      CHECK (status IN ('draft', 'published', 'rented', 'paused'));
-- ============================================
