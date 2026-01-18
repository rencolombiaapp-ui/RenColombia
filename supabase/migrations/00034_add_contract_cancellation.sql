-- ============================================
-- Migración: Cancelación de Contratos y Reactivación de Inmuebles
-- ============================================
-- Permite al propietario cancelar el proceso de contratación y reactivar el inmueble
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVOS:
-- 1. Crear función para cancelar contrato y reactivar inmueble
-- 2. Validar que solo propietarios pueden cancelar
-- 3. Cambiar estado del contrato a cancelled
-- 4. Cambiar estado del inmueble a published y limpiar bloqueo
--
-- IMPORTANTE:
-- - Solo propietarios pueden cancelar contratos
-- - El inmueble se reactiva automáticamente cuando se cancela el contrato
-- ============================================

-- ============================================
-- 1. CREAR FUNCIÓN: cancel_contract_and_reactivate_property
-- ============================================
-- Permite al propietario cancelar el contrato y reactivar el inmueble

CREATE OR REPLACE FUNCTION public.cancel_contract_and_reactivate_property(
  p_contract_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_contract_record public.rental_contracts%ROWTYPE;
  v_property_id uuid;
  v_property_status text;
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
    RAISE EXCEPTION 'No autorizado: solo puedes cancelar tus propios contratos';
  END IF;
  
  -- Validar que el contrato esté en un estado cancelable
  -- No se pueden cancelar contratos ya cancelados, expirados, firmados o activos
  IF v_contract_record.status IN ('cancelled', 'expired', 'signed', 'active') THEN
    RAISE EXCEPTION 'No se puede cancelar un contrato en estado: %. Solo se pueden cancelar contratos en estados: draft, pending_tenant, pending_owner, approved', 
      v_contract_record.status;
  END IF;
  
  -- Obtener información del inmueble
  v_property_id := v_contract_record.property_id;
  
  SELECT status INTO v_property_status
  FROM public.properties
  WHERE id = v_property_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inmueble no encontrado';
  END IF;
  
  -- Validar que el inmueble esté bloqueado para contratación
  IF v_property_status != 'locked_for_contract' THEN
    RAISE WARNING 'El inmueble no está bloqueado para contratación. Estado actual: %', v_property_status;
    -- Continuar de todas formas para cancelar el contrato
  END IF;
  
  -- Actualizar el contrato: cambiar estado a cancelled
  UPDATE public.rental_contracts
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_contract_id;
  
  -- Obtener el contrato actualizado
  SELECT * INTO v_contract_record
  FROM public.rental_contracts
  WHERE id = p_contract_id;
  
  -- Reactivar el inmueble: cambiar estado a published y limpiar bloqueo
  UPDATE public.properties
  SET 
    status = 'published',
    locked_at = NULL,
    locked_by_contract_id = NULL
  WHERE id = v_property_id
  AND status = 'locked_for_contract';
  
  -- Construir resultado JSON
  v_result := jsonb_build_object(
    'contract_id', v_contract_record.id,
    'contract_status', v_contract_record.status,
    'property_id', v_property_id,
    'property_status', 'published',
    'updated_at', v_contract_record.updated_at
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cancel_contract_and_reactivate_property IS 
  'Permite al propietario cancelar el contrato y reactivar el inmueble. Cambia el estado del contrato a cancelled y el estado del inmueble a published, limpiando los campos de bloqueo.';

-- ============================================
-- 2. CREAR TRIGGER PARA NOTIFICAR AL INQUILINO (OPCIONAL)
-- ============================================
-- Notifica al inquilino cuando el propietario cancela el contrato

CREATE OR REPLACE FUNCTION public.notify_contract_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  v_property_title text;
  v_owner_name text;
  v_notification_id uuid;
BEGIN
  -- Solo notificar si el estado cambió a cancelled
  IF NEW.status != 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  
  -- Obtener título del inmueble
  SELECT title INTO v_property_title
  FROM public.properties
  WHERE id = NEW.property_id;
  
  -- Obtener nombre del propietario
  SELECT coalesce(
    CASE 
      WHEN publisher_type = 'inmobiliaria' THEN company_name
      ELSE full_name
    END,
    email
  ) INTO v_owner_name
  FROM public.profiles
  WHERE id = NEW.owner_id;
  
  -- Crear notificación para el inquilino
  BEGIN
    v_notification_id := public.create_notification(
      NEW.tenant_id,
      'contract_cancelled',
      'Contrato cancelado',
      format('El propietario %s ha cancelado el contrato para el inmueble: %s', 
        coalesce(v_owner_name, 'Un propietario'), 
        coalesce(v_property_title, 'Sin título')),
      NEW.property_id
    );
    
    RAISE NOTICE 'Notificación de contrato cancelado creada exitosamente: %', v_notification_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error al crear notificación de contrato cancelado: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_contract_cancelled() IS 
  'Notifica al inquilino cuando el propietario cancela el contrato. Se ejecuta cuando el estado del contrato cambia a cancelled.';

DROP TRIGGER IF EXISTS notify_contract_cancelled_trigger ON public.rental_contracts;
CREATE TRIGGER notify_contract_cancelled_trigger
  AFTER UPDATE OF status ON public.rental_contracts
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
  EXECUTE FUNCTION public.notify_contract_cancelled();

-- ============================================
-- 3. ACTUALIZAR CHECK CONSTRAINT DE NOTIFICATIONS
-- ============================================
-- Agregar tipo 'contract_cancelled' a las notificaciones

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
    'contract_cancelled',
    'system'
  ));

COMMENT ON COLUMN public.notifications.type IS 
  'Tipo de notificación: property_intention, new_message, property_viewed, property_favorited, review_received, contract_request, contract_pending_approval, contract_approved, contract_cancelled, system';

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. DROP TRIGGER notify_contract_cancelled_trigger ON public.rental_contracts;
--   2. DROP FUNCTION public.notify_contract_cancelled();
--   3. DROP FUNCTION public.cancel_contract_and_reactivate_property(uuid);
--   4. ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
--   5. ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
--      CHECK (type IN ('property_intention', 'new_message', 'property_viewed', 'property_favorited', 'review_received', 'contract_request', 'contract_pending_approval', 'contract_approved', 'system'));
-- ============================================
