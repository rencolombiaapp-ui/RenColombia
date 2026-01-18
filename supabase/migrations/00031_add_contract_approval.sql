-- ============================================
-- Migración: Aprobación y Envío de Contratos
-- ============================================
-- Permite al propietario aprobar y enviar contratos al inquilino
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVOS:
-- 1. Crear función para aprobar y enviar contrato
-- 2. Validar aceptación del disclaimer legal
-- 3. Cambiar estado del contrato
-- 4. Notificar al inquilino
--
-- IMPORTANTE:
-- - El disclaimer legal debe ser aceptado antes de enviar
-- - Solo propietarios pueden aprobar y enviar contratos
-- ============================================

-- ============================================
-- 1. AGREGAR CAMPO PARA REGISTRAR ACEPTACIÓN DEL DISCLAIMER
-- ============================================

ALTER TABLE public.rental_contracts
  ADD COLUMN IF NOT EXISTS legal_disclaimer_accepted_at timestamp with time zone;

COMMENT ON COLUMN public.rental_contracts.legal_disclaimer_accepted_at IS 
  'Fecha en que el propietario aceptó el disclaimer legal antes de enviar el contrato al inquilino. Requerido para transición draft → pending_tenant.';

-- ============================================
-- 2. CREAR FUNCIÓN: approve_and_send_contract
-- ============================================
-- Permite al propietario aprobar y enviar el contrato al inquilino
-- Requiere aceptación del disclaimer legal

CREATE OR REPLACE FUNCTION public.approve_and_send_contract(
  p_contract_id uuid,
  p_disclaimer_accepted boolean DEFAULT false
)
RETURNS jsonb AS $$
DECLARE
  v_contract_record public.rental_contracts%ROWTYPE;
  v_property_title text;
  v_tenant_name text;
  v_notification_id uuid;
  v_result jsonb;
BEGIN
  -- Obtener el contrato
  SELECT * INTO v_contract_record
  FROM public.rental_contracts
  WHERE id = p_contract_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato no encontrado';
  END IF;
  
  -- Validar que el usuario autenticado sea el propietario
  IF v_contract_record.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: solo puedes aprobar y enviar tus propios contratos';
  END IF;
  
  -- Validar que el contrato esté en estado draft
  IF v_contract_record.status != 'draft' THEN
    RAISE EXCEPTION 'Solo puedes enviar contratos en estado draft. Estado actual: %', v_contract_record.status;
  END IF;
  
  -- Validar que el disclaimer haya sido aceptado
  IF NOT p_disclaimer_accepted THEN
    RAISE EXCEPTION 'Debes aceptar el disclaimer legal antes de enviar el contrato al inquilino';
  END IF;
  
  -- Obtener título del inmueble para la notificación
  SELECT title INTO v_property_title
  FROM public.properties
  WHERE id = v_contract_record.property_id;
  
  -- Obtener nombre del inquilino para la notificación
  SELECT coalesce(full_name, email) INTO v_tenant_name
  FROM public.profiles
  WHERE id = v_contract_record.tenant_id;
  
  -- Actualizar el contrato: cambiar estado y registrar aceptación del disclaimer
  UPDATE public.rental_contracts
  SET 
    status = 'pending_tenant',
    legal_disclaimer_accepted_at = now(),
    updated_at = now()
  WHERE id = p_contract_id;
  
  -- Obtener el contrato actualizado
  SELECT * INTO v_contract_record
  FROM public.rental_contracts
  WHERE id = p_contract_id;
  
  -- Crear notificación para el inquilino
  BEGIN
    v_notification_id := public.create_notification(
      v_contract_record.tenant_id,
      'contract_pending_approval',
      'Contrato pendiente de tu aprobación',
      format('El propietario ha enviado un contrato para el inmueble: %s. Por favor revisa y aprueba el contrato.', 
        coalesce(v_property_title, 'Sin título')),
      v_contract_record.property_id
    );
    
    RAISE NOTICE 'Notificación de contrato pendiente creada exitosamente: %', v_notification_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error al crear notificación de contrato pendiente: %', SQLERRM;
  END;
  
  -- Construir resultado JSON
  v_result := jsonb_build_object(
    'id', v_contract_record.id,
    'status', v_contract_record.status,
    'legal_disclaimer_accepted_at', v_contract_record.legal_disclaimer_accepted_at,
    'updated_at', v_contract_record.updated_at,
    'notification_sent', v_notification_id IS NOT NULL
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.approve_and_send_contract IS 
  'Permite al propietario aprobar y enviar el contrato al inquilino. Requiere aceptación del disclaimer legal. Cambia el estado de draft a pending_tenant y notifica al inquilino.';

-- ============================================
-- 3. ACTUALIZAR CHECK CONSTRAINT DE NOTIFICATIONS
-- ============================================
-- Agregar tipo 'contract_pending_approval' a las notificaciones

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'property_intention',
    'new_message',
    'property_viewed',
    'property_favorited',
    'review_received',
    'contract_request',
    'contract_pending_approval',
    'contract_approved',
    'system'
  ));

COMMENT ON COLUMN public.notifications.type IS 
  'Tipo de notificación: property_intention, new_message, property_viewed, property_favorited, review_received, contract_request, contract_pending_approval, contract_approved, system';

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
--   2. ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
--      CHECK (type IN ('property_intention', 'new_message', 'property_viewed', 'property_favorited', 'review_received', 'contract_request', 'system'));
--   3. DROP FUNCTION public.approve_and_send_contract(uuid, boolean);
--   4. ALTER TABLE public.rental_contracts DROP COLUMN IF EXISTS legal_disclaimer_accepted_at;
-- ============================================
