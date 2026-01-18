-- ============================================
-- Migración: Constraint de Un Solo Contrato Activo por Inmueble
-- ============================================
-- Prepara el constraint único que garantiza un solo contrato activo por inmueble
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVO:
-- Garantizar que un inmueble solo pueda tener UN contrato en estados activos simultáneamente
--
-- IMPORTANTE:
-- Esta migración crea el constraint cuando se cree la tabla rental_contracts
-- Si la tabla ya existe, aplica el constraint directamente
-- ============================================

-- ============================================
-- CONSTRAINT ÚNICO: UN SOLO CONTRATO ACTIVO POR INMUEBLE
-- ============================================
-- Este constraint se aplicará cuando se cree la tabla rental_contracts
-- Estados considerados "activos": draft, pending_tenant, pending_owner, approved, active

-- Verificar si la tabla rental_contracts existe
DO $$
BEGIN
  -- Si la tabla existe, crear el constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_contracts'
  ) THEN
    -- Crear índice único parcial para garantizar un solo contrato activo por inmueble
    -- Usar IF NOT EXISTS para evitar errores si ya existe
    CREATE UNIQUE INDEX IF NOT EXISTS rental_contracts_property_active_unique_idx 
      ON public.rental_contracts(property_id) 
      WHERE status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active');
    
    -- Comentario del índice
    COMMENT ON INDEX rental_contracts_property_active_unique_idx IS 
      'Garantiza que un inmueble solo puede tener un contrato en estados activos simultáneamente. Estados activos: draft, pending_tenant, pending_owner, approved, active.';
    
    RAISE NOTICE 'Constraint único aplicado a tabla rental_contracts existente';
  ELSE
    -- Si la tabla no existe, solo documentar que se aplicará cuando se cree
    RAISE NOTICE 'Tabla rental_contracts no existe aún. El constraint se aplicará cuando se cree la tabla.';
  END IF;
END $$;

-- ============================================
-- FUNCIÓN DE VALIDACIÓN ANTES DE INSERTAR CONTRATO
-- ============================================
-- Esta función valida que no exista otro contrato activo antes de crear uno nuevo

CREATE OR REPLACE FUNCTION public.validate_single_active_contract()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_contract_id uuid;
BEGIN
  -- Solo validar si el nuevo estado es "activo"
  IF NEW.status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active') THEN
    -- Verificar si existe otro contrato activo para el mismo inmueble
    SELECT id INTO v_existing_contract_id
    FROM public.rental_contracts
    WHERE property_id = NEW.property_id
    AND status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active')
    AND id != NEW.id  -- Excluir el contrato actual si es un UPDATE
    LIMIT 1;
    
    -- Si existe otro contrato activo, lanzar error
    IF v_existing_contract_id IS NOT NULL THEN
      RAISE EXCEPTION 
        'No se puede crear un nuevo contrato. El inmueble % ya tiene un contrato activo (ID: %). Debe cancelar o esperar a que expire el contrato existente.',
        NEW.property_id,
        v_existing_contract_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.validate_single_active_contract() IS 
  'Valida que no exista otro contrato activo antes de crear o actualizar un contrato a estado activo. Se ejecuta como trigger.';

-- Aplicar trigger solo si la tabla existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_contracts'
  ) THEN
    -- Eliminar trigger si existe (para evitar duplicados)
    DROP TRIGGER IF EXISTS validate_single_active_contract_trigger ON public.rental_contracts;
    
    -- Crear trigger
    CREATE TRIGGER validate_single_active_contract_trigger
      BEFORE INSERT OR UPDATE OF status, property_id ON public.rental_contracts
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_single_active_contract();
    
    RAISE NOTICE 'Trigger de validación aplicado a tabla rental_contracts existente';
  ELSE
    RAISE NOTICE 'Tabla rental_contracts no existe aún. El trigger se aplicará cuando se cree la tabla.';
  END IF;
END $$;

-- ============================================
-- FUNCIÓN PARA OBTENER CONTRATO ACTIVO DE UN INMUEBLE
-- ============================================
-- Función auxiliar para consultar el contrato activo de un inmueble

CREATE OR REPLACE FUNCTION public.get_active_contract_for_property(property_uuid uuid)
RETURNS TABLE (
  contract_id uuid,
  tenant_id uuid,
  owner_id uuid,
  status text,
  created_at timestamp with time zone
) AS $$
BEGIN
  -- Verificar si la tabla existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_contracts'
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    rc.id,
    rc.tenant_id,
    rc.owner_id,
    rc.status,
    rc.created_at
  FROM public.rental_contracts rc
  WHERE rc.property_id = property_uuid
  AND rc.status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_active_contract_for_property(uuid) IS 
  'Retorna el contrato activo (si existe) para un inmueble dado. Retorna vacío si no existe tabla o no hay contrato activo.';

-- ============================================
-- DOCUMENTACIÓN DEL CONSTRAINT
-- ============================================
-- 
-- Cuando se cree la tabla rental_contracts, debe incluir:
--
-- CREATE UNIQUE INDEX rental_contracts_property_active_unique_idx 
--   ON public.rental_contracts(property_id) 
--   WHERE status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active');
--
-- Este índice único parcial garantiza que:
-- - Un inmueble solo puede tener UN contrato en estados activos
-- - Múltiples contratos en estados finales (cancelled, expired) están permitidos (historial)
-- - El constraint se aplica solo a estados activos, no a estados finales
--
-- Estados considerados "activos":
-- - draft: Contrato en borrador
-- - pending_tenant: Pendiente aprobación del inquilino
-- - pending_owner: Pendiente aprobación del propietario
-- - approved: Aprobado por ambas partes
-- - active: Contrato activo y vigente
--
-- Estados NO considerados "activos" (permiten múltiples):
-- - signed: Firmado (transitorio antes de active)
-- - cancelled: Cancelado
-- - expired: Expirado
--
-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. DROP TRIGGER IF EXISTS validate_single_active_contract_trigger ON public.rental_contracts;
--   2. DROP FUNCTION IF EXISTS public.validate_single_active_contract();
--   3. DROP FUNCTION IF EXISTS public.get_active_contract_for_property(uuid);
--   4. DROP INDEX IF EXISTS rental_contracts_property_active_unique_idx;
-- ============================================
