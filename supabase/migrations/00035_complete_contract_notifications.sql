-- ============================================
-- Migración: Completar Integración de Notificaciones de Contratos
-- ============================================
-- Completa la integración del flujo de contratos con el sistema de notificaciones existente
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVOS:
-- 1. Agregar notificación faltante cuando se crea el contrato (E2)
-- 2. Consolidar todos los tipos de notificación de contratos
-- 3. Asegurar que todas las notificaciones usen el patrón existente
-- 4. Verificar que no haya duplicados
--
-- IMPORTANTE:
-- - NO modifica el comportamiento de notificaciones existentes
-- - Solo extiende el sistema para contratos
-- - Usa el mismo patrón: función create_notification + triggers
-- ============================================

-- ============================================
-- ANÁLISIS DEL SISTEMA ACTUAL (Documentación)
-- ============================================
-- 
-- Sistema de notificaciones existente:
-- - Tabla: notifications (id, user_id, type, title, message, related_id, is_read, created_at)
-- - Función: create_notification(p_user_id, p_type, p_title, p_message, p_related_id)
-- - Patrón: Triggers AFTER INSERT/UPDATE que llaman a create_notification
-- - Tipos originales: 'property_intention', 'new_message', 'property_viewed', 'review_received', 'system'
--
-- Notificaciones de contratos ya implementadas:
-- ✅ E1: Inquilino solicita contrato → 00028 (contract_request)
-- ❌ E2: Propietario inicia contrato → FALTA (se agrega aquí)
-- ✅ E3: Contrato aprobado por propietario → 00031 (contract_pending_approval)
-- ✅ E4: Contrato aprobado por inquilino → 00032 (contract_approved)
-- ✅ E5: Contrato cancelado → 00034 (contract_cancelled)
-- ✅ Mensajes de contrato → 00033 (new_message - reutiliza tipo existente)
--
-- ============================================

-- ============================================
-- 1. CONSOLIDAR CHECK CONSTRAINT DE NOTIFICATIONS
-- ============================================
-- Asegurar que todos los tipos de notificación de contratos estén incluidos

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    -- Tipos originales (NO MODIFICAR - orden alfabético para claridad)
    'new_message',
    'property_favorited',
    'property_intention',
    'property_viewed',
    'review_received',
    'system',
    -- Tipos de contratos (NUEVOS - orden alfabético)
    'contract_approved',             -- E4: Contrato aprobado por inquilino
    'contract_cancelled',           -- E5: Contrato cancelado
    'contract_pending_approval',    -- E3: Contrato enviado al inquilino
    'contract_request',             -- E1: Inquilino solicita contrato
    'contract_started'              -- E2: Propietario inicia contrato (NUEVO)
  ));

COMMENT ON COLUMN public.notifications.type IS 
  'Tipo de notificación. Originales: property_intention, new_message, property_viewed, property_favorited, review_received, system. Contratos: contract_request, contract_started, contract_pending_approval, contract_approved, contract_cancelled.';

-- ============================================
-- 2. CREAR TRIGGER PARA NOTIFICAR AL INQUILINO CUANDO SE CREA EL CONTRATO
-- ============================================
-- Evento E2: Propietario inicia contrato → Notificar al inquilino

CREATE OR REPLACE FUNCTION public.notify_contract_started()
RETURNS TRIGGER AS $$
DECLARE
  v_property_title text;
  v_owner_name text;
  v_notification_id uuid;
BEGIN
  -- Solo notificar cuando se crea un nuevo contrato (INSERT)
  -- El contrato se crea en estado 'draft'
  IF NEW.status != 'draft' THEN
    RETURN NEW;
  END IF;
  
  -- Obtener título del inmueble
  SELECT title INTO v_property_title
  FROM public.properties
  WHERE id = NEW.property_id;
  
  -- Obtener nombre del propietario/inmobiliaria
  SELECT coalesce(
    CASE 
      WHEN publisher_type = 'inmobiliaria' THEN company_name
      ELSE full_name
    END,
    email
  ) INTO v_owner_name
  FROM public.profiles
  WHERE id = NEW.owner_id;
  
  -- Verificar que tenemos los datos necesarios antes de crear la notificación
  IF NEW.tenant_id IS NULL THEN
    RAISE WARNING 'tenant_id es null, no se puede crear notificación';
    RETURN NEW;
  END IF;
  
  -- Crear notificación para el inquilino
  BEGIN
    v_notification_id := public.create_notification(
      NEW.tenant_id,
      'contract_started',
      'Contrato iniciado',
      format('El propietario %s ha iniciado un contrato para el inmueble: %s. Revisa el contrato cuando esté listo.', 
        coalesce(v_owner_name, 'Un propietario'), 
        coalesce(v_property_title, 'Sin título')),
      NEW.property_id
    );
    
    RAISE NOTICE 'Notificación de contrato iniciado creada exitosamente: %', v_notification_id;
  EXCEPTION WHEN OTHERS THEN
    -- Si hay un error al crear la notificación, registrar pero no fallar el trigger
    RAISE WARNING 'Error al crear notificación de contrato iniciado: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_contract_started() IS 
  'Notifica al inquilino cuando el propietario inicia un contrato (Evento E2). Se ejecuta cuando se crea un nuevo contrato en estado draft.';

DROP TRIGGER IF EXISTS notify_contract_started_trigger ON public.rental_contracts;
CREATE TRIGGER notify_contract_started_trigger
  AFTER INSERT ON public.rental_contracts
  FOR EACH ROW
  WHEN (NEW.status = 'draft')
  EXECUTE FUNCTION public.notify_contract_started();

-- ============================================
-- 3. VERIFICAR Y DOCUMENTAR TODAS LAS NOTIFICACIONES DE CONTRATOS
-- ============================================
-- 
-- EVENTOS Y NOTIFICACIONES IMPLEMENTADAS:
--
-- E1: Inquilino solicita contrato
--   → Trigger: notify_contract_request_created_trigger (00028)
--   → Tipo: 'contract_request'
--   → Destinatario: Propietario
--   → Estado: ✅ Implementado
--
-- E2: Propietario inicia contrato
--   → Trigger: notify_contract_started_trigger (ESTA MIGRACIÓN)
--   → Tipo: 'contract_started'
--   → Destinatario: Inquilino
--   → Estado: ✅ Implementado aquí
--
-- E3: Contrato aprobado por propietario (enviado al inquilino)
--   → Función: approve_and_send_contract (00031)
--   → Tipo: 'contract_pending_approval'
--   → Destinatario: Inquilino
--   → Estado: ✅ Implementado
--
-- E4: Contrato aprobado por inquilino
--   → Función: tenant_approve_contract (00032)
--   → Tipo: 'contract_approved'
--   → Destinatario: Propietario
--   → Estado: ✅ Implementado
--
-- E5: Contrato cancelado
--   → Trigger: notify_contract_cancelled_trigger (00034)
--   → Tipo: 'contract_cancelled'
--   → Destinatario: Inquilino
--   → Estado: ✅ Implementado
--
-- Mensajes de contrato
--   → Trigger: notify_contract_message_recipient_trigger (00033)
--   → Tipo: 'new_message' (reutiliza tipo existente)
--   → Destinatario: Contraparte
--   → Estado: ✅ Implementado
--
-- ============================================

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
--
-- RESUMEN DE INTEGRACIÓN:
-- 
-- ✅ Todas las notificaciones de contratos están implementadas
-- ✅ Usan el mismo patrón del sistema existente (create_notification)
-- ✅ No modifican notificaciones existentes
-- ✅ Tipos consolidados en el constraint
-- ✅ Triggers y funciones siguen el mismo patrón
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. DROP TRIGGER notify_contract_started_trigger ON public.rental_contracts;
--   2. DROP FUNCTION public.notify_contract_started();
--   3. ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
--   4. ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
--      CHECK (type IN ('property_intention', 'new_message', 'property_viewed', 'property_favorited', 'review_received', 'contract_request', 'contract_pending_approval', 'contract_approved', 'contract_cancelled', 'system'));
-- ============================================
