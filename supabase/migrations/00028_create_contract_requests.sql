-- ============================================
-- Migración: Sistema de Solicitudes de Contrato
-- ============================================
-- Crea la tabla y funciones para solicitudes de contratación por inquilinos PRO
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVOS:
-- 1. Crear tabla contract_requests
-- 2. Crear función RPC para crear solicitudes (solo PRO)
-- 3. Crear trigger para notificar al propietario
-- 4. Implementar RLS policies para acceso seguro
--
-- IMPORTANTE:
-- - Solo inquilinos PRO pueden crear solicitudes
-- - Solo inmuebles published pueden recibir solicitudes
-- ============================================

-- ============================================
-- 1. CREAR TABLA contract_requests
-- ============================================

CREATE TABLE IF NOT EXISTS public.contract_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Estado de la solicitud
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  
  -- Información de la solicitud
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone, -- Expiración automática (ej: 7 días)
  
  -- Verificación KYC del inquilino
  tenant_kyc_status text DEFAULT 'pending' 
    CHECK (tenant_kyc_status IN ('pending', 'verified', 'rejected', 'expired')),
  tenant_kyc_verified_at timestamp with time zone,
  
  -- Metadatos
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Comentarios de documentación
COMMENT ON TABLE public.contract_requests IS 
  'Almacena las solicitudes iniciales de contratación realizadas por inquilinos sobre inmuebles específicos.';

COMMENT ON COLUMN public.contract_requests.status IS 
  'Estado de la solicitud: pending (pendiente), approved (aprobada), rejected (rechazada), expired (expirada), cancelled (cancelada)';

COMMENT ON COLUMN public.contract_requests.tenant_kyc_status IS 
  'Estado de verificación KYC del inquilino al momento de la solicitud: pending, verified, rejected, expired';

COMMENT ON COLUMN public.contract_requests.expires_at IS 
  'Fecha de expiración automática de la solicitud (ej: 7 días desde requested_at)';

-- ============================================
-- 2. CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS contract_requests_property_idx 
  ON public.contract_requests(property_id);

CREATE INDEX IF NOT EXISTS contract_requests_tenant_idx 
  ON public.contract_requests(tenant_id);

CREATE INDEX IF NOT EXISTS contract_requests_owner_idx 
  ON public.contract_requests(owner_id);

CREATE INDEX IF NOT EXISTS contract_requests_status_idx 
  ON public.contract_requests(status);

CREATE INDEX IF NOT EXISTS contract_requests_created_idx 
  ON public.contract_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS contract_requests_expires_idx 
  ON public.contract_requests(expires_at) 
  WHERE expires_at IS NOT NULL;

-- Índice único parcial: Un inquilino solo puede tener una solicitud activa por inmueble
CREATE UNIQUE INDEX IF NOT EXISTS contract_requests_tenant_property_active_unique_idx 
  ON public.contract_requests(tenant_id, property_id) 
  WHERE status IN ('pending', 'approved');

-- ============================================
-- 3. CREAR FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_contract_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_contract_request_updated_at() IS 
  'Trigger function que actualiza updated_at automáticamente en contract_requests';

CREATE TRIGGER update_contract_request_updated_at_trigger
  BEFORE UPDATE ON public.contract_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contract_request_updated_at();

-- ============================================
-- 4. CREAR FUNCIÓN RPC: create_contract_request
-- ============================================
-- Crea una nueva solicitud de contrato
-- Solo inquilinos PRO pueden crear solicitudes
-- Solo inmuebles published pueden recibir solicitudes

CREATE OR REPLACE FUNCTION public.create_contract_request(
  p_property_id uuid,
  p_tenant_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_request_id uuid;
  v_owner_id uuid;
  v_property_status text;
  v_has_pro_plan boolean;
  v_tenant_kyc_status text;
BEGIN
  -- Validar que el usuario autenticado sea el inquilino
  IF p_tenant_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: solo puedes crear solicitudes para tu propio usuario';
  END IF;
  
  -- Verificar que el usuario tenga plan PRO activo
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    INNER JOIN public.plans p ON p.id = s.plan_id
    WHERE s.user_id = p_tenant_id
    AND s.status = 'active'
    AND (p.id LIKE '%_pro' OR p.id = 'tenant_pro')
  ) INTO v_has_pro_plan;
  
  IF NOT v_has_pro_plan THEN
    RAISE EXCEPTION 'Debes tener un plan PRO activo para solicitar contratos';
  END IF;
  
  -- Obtener información del inmueble
  SELECT owner_id, status INTO v_owner_id, v_property_status
  FROM public.properties
  WHERE id = p_property_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inmueble no encontrado';
  END IF;
  
  -- Validar que el inmueble esté publicado
  IF v_property_status != 'published' THEN
    RAISE EXCEPTION 'Solo puedes solicitar contratos para inmuebles publicados. Estado actual: %', v_property_status;
  END IF;
  
  -- Validar que el inquilino no sea el propietario
  IF v_owner_id = p_tenant_id THEN
    RAISE EXCEPTION 'No puedes solicitar un contrato para tu propio inmueble';
  END IF;
  
  -- Verificar si ya existe una solicitud activa para este inquilino e inmueble
  IF EXISTS (
    SELECT 1
    FROM public.contract_requests
    WHERE tenant_id = p_tenant_id
    AND property_id = p_property_id
    AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud activa para este inmueble';
  END IF;
  
  -- Obtener estado KYC del inquilino (si existe)
  SELECT status INTO v_tenant_kyc_status
  FROM public.kyc_verifications
  WHERE user_id = p_tenant_id
  AND verification_type = 'person'
  AND status = 'verified'
  ORDER BY verified_at DESC
  LIMIT 1;
  
  -- Si no hay verificación KYC verificada, usar 'pending'
  IF v_tenant_kyc_status IS NULL THEN
    v_tenant_kyc_status := 'pending';
  END IF;
  
  -- Crear la solicitud
  INSERT INTO public.contract_requests (
    property_id,
    tenant_id,
    owner_id,
    status,
    requested_at,
    expires_at,
    tenant_kyc_status,
    tenant_kyc_verified_at
  ) VALUES (
    p_property_id,
    p_tenant_id,
    v_owner_id,
    'pending',
    now(),
    now() + INTERVAL '7 days', -- Expira en 7 días
    v_tenant_kyc_status,
    CASE WHEN v_tenant_kyc_status = 'verified' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_contract_request IS 
  'Crea una nueva solicitud de contrato. Solo inquilinos PRO pueden crear solicitudes. Solo inmuebles published pueden recibir solicitudes. Retorna el ID de la solicitud creada.';

-- ============================================
-- 5. CREAR TRIGGER PARA NOTIFICAR AL PROPIETARIO
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_contract_request_created()
RETURNS TRIGGER AS $$
DECLARE
  v_property_title text;
  v_tenant_name text;
  v_notification_id uuid;
BEGIN
  -- Obtener título de la propiedad
  SELECT title INTO v_property_title
  FROM public.properties
  WHERE id = NEW.property_id;
  
  -- Obtener nombre del inquilino
  SELECT coalesce(full_name, email) INTO v_tenant_name
  FROM public.profiles
  WHERE id = NEW.tenant_id;
  
  -- Verificar que tenemos los datos necesarios antes de crear la notificación
  IF NEW.owner_id IS NULL THEN
    RAISE WARNING 'owner_id es null, no se puede crear notificación';
    RETURN NEW;
  END IF;
  
  -- Crear notificación para el propietario
  BEGIN
    -- Primero actualizar el constraint de notifications para incluir 'contract_request'
    -- Esto se hace en una migración separada si es necesario
    
    v_notification_id := public.create_notification(
      NEW.owner_id,
      'contract_request', -- Tipo de notificación (debe agregarse al constraint)
      'Nueva solicitud de contrato',
      format('El inquilino %s ha solicitado un contrato para tu inmueble: %s', 
        coalesce(v_tenant_name, 'Un inquilino'), 
        coalesce(v_property_title, 'Sin título')),
      NEW.property_id
    );
    
    -- Log para debugging (solo en desarrollo)
    RAISE NOTICE 'Notificación de solicitud de contrato creada exitosamente: %', v_notification_id;
  EXCEPTION WHEN OTHERS THEN
    -- Si hay un error al crear la notificación, registrar pero no fallar el trigger
    RAISE WARNING 'Error al crear notificación de solicitud de contrato: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_contract_request_created() IS 
  'Notifica al propietario cuando se crea una nueva solicitud de contrato';

DROP TRIGGER IF EXISTS notify_contract_request_created_trigger ON public.contract_requests;
CREATE TRIGGER notify_contract_request_created_trigger
  AFTER INSERT ON public.contract_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_contract_request_created();

-- ============================================
-- 6. ACTUALIZAR CHECK CONSTRAINT DE NOTIFICATIONS
-- ============================================
-- Agregar tipo 'contract_request' a las notificaciones

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'property_intention',
    'new_message',
    'property_viewed',
    'property_favorited',
    'review_received',
    'contract_request',
    'system'
  ));

COMMENT ON COLUMN public.notifications.type IS 
  'Tipo de notificación: property_intention, new_message, property_viewed, property_favorited, review_received, contract_request, system';

-- ============================================
-- 7. CREAR RLS POLICIES
-- ============================================

ALTER TABLE public.contract_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Participantes pueden ver sus solicitudes
CREATE POLICY "Participantes pueden ver sus solicitudes"
  ON public.contract_requests FOR SELECT
  USING (tenant_id = auth.uid() OR owner_id = auth.uid());

-- Policy: Solo inquilinos PRO pueden crear solicitudes (validado en RPC)
CREATE POLICY "Inquilinos pueden crear solicitudes"
  ON public.contract_requests FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

-- Policy: Propietarios pueden actualizar solicitudes (aprobar/rechazar)
CREATE POLICY "Propietarios pueden actualizar solicitudes"
  ON public.contract_requests FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy: Inquilinos pueden cancelar sus solicitudes pendientes
CREATE POLICY "Inquilinos pueden cancelar sus solicitudes"
  ON public.contract_requests FOR UPDATE
  USING (tenant_id = auth.uid() AND status = 'pending')
  WITH CHECK (tenant_id = auth.uid() AND status = 'cancelled');

-- Policy: Inquilinos pueden eliminar sus solicitudes canceladas o rechazadas
CREATE POLICY "Inquilinos pueden eliminar solicitudes canceladas o rechazadas"
  ON public.contract_requests FOR DELETE
  USING (
    tenant_id = auth.uid() 
    AND status IN ('cancelled', 'rejected')
  );

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. DROP TRIGGER notify_contract_request_created_trigger ON public.contract_requests;
--   2. DROP FUNCTION public.notify_contract_request_created();
--   3. DROP FUNCTION public.create_contract_request(uuid, uuid);
--   4. DROP FUNCTION public.update_contract_request_updated_at();
--   5. DROP POLICY "Inquilinos pueden eliminar solicitudes canceladas o rechazadas" ON public.contract_requests;
--   6. DROP POLICY "Inquilinos pueden cancelar sus solicitudes" ON public.contract_requests;
--   7. DROP POLICY "Propietarios pueden actualizar solicitudes" ON public.contract_requests;
--   8. DROP POLICY "Inquilinos pueden crear solicitudes" ON public.contract_requests;
--   9. DROP POLICY "Participantes pueden ver sus solicitudes" ON public.contract_requests;
--  10. DROP TABLE IF EXISTS public.contract_requests CASCADE;
--  11. ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
--  12. ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
--      CHECK (type IN ('property_intention', 'new_message', 'property_viewed', 'property_favorited', 'review_received', 'system'));
-- ============================================
