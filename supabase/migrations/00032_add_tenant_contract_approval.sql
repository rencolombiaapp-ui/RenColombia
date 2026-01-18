-- ============================================
-- Migración: Aprobación de Contrato por Inquilino
-- ============================================
-- Permite al inquilino ver y aprobar contratos
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVOS:
-- 1. Crear función para que el inquilino apruebe el contrato
-- 2. Validar aceptación del disclaimer legal
-- 3. Cambiar estado del contrato a approved
-- 4. Notificar al propietario
--
-- IMPORTANTE:
-- - El disclaimer legal debe ser aceptado antes de aprobar
-- - Solo inquilinos pueden aprobar contratos en estado pending_tenant
-- ============================================

-- ============================================
-- 1. AGREGAR CAMPO PARA REGISTRAR ACEPTACIÓN DEL DISCLAIMER POR INQUILINO
-- ============================================

ALTER TABLE public.rental_contracts
  ADD COLUMN IF NOT EXISTS tenant_disclaimer_accepted_at timestamp with time zone;

COMMENT ON COLUMN public.rental_contracts.tenant_disclaimer_accepted_at IS 
  'Fecha en que el inquilino aceptó el disclaimer legal antes de aprobar el contrato. Requerido para transición pending_tenant → approved.';

-- ============================================
-- 2. CREAR FUNCIÓN: tenant_approve_contract
-- ============================================
-- Permite al inquilino aprobar el contrato
-- Requiere aceptación del disclaimer legal

CREATE OR REPLACE FUNCTION public.tenant_approve_contract(
  p_contract_id uuid,
  p_disclaimer_accepted boolean DEFAULT false
)
RETURNS jsonb AS $$
DECLARE
  v_contract_record public.rental_contracts%ROWTYPE;
  v_property_title text;
  v_owner_name text;
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
  
  -- Validar que el usuario autenticado sea el inquilino
  IF v_contract_record.tenant_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: solo puedes aprobar tus propios contratos';
  END IF;
  
  -- Validar que el contrato esté en estado pending_tenant
  IF v_contract_record.status != 'pending_tenant' THEN
    RAISE EXCEPTION 'Solo puedes aprobar contratos en estado pending_tenant. Estado actual: %', v_contract_record.status;
  END IF;
  
  -- Validar que el disclaimer haya sido aceptado
  IF NOT p_disclaimer_accepted THEN
    RAISE EXCEPTION 'Debes aceptar el disclaimer legal antes de aprobar el contrato';
  END IF;
  
  -- Obtener título del inmueble para la notificación
  SELECT title INTO v_property_title
  FROM public.properties
  WHERE id = v_contract_record.property_id;
  
  -- Obtener nombre del propietario para la notificación
  SELECT coalesce(
    CASE 
      WHEN publisher_type = 'inmobiliaria' THEN company_name
      ELSE full_name
    END,
    email
  ) INTO v_owner_name
  FROM public.profiles
  WHERE id = v_contract_record.owner_id;
  
  -- Actualizar el contrato: cambiar estado y registrar aceptación del disclaimer
  UPDATE public.rental_contracts
  SET 
    status = 'approved',
    tenant_approved_at = now(),
    tenant_disclaimer_accepted_at = now(),
    updated_at = now()
  WHERE id = p_contract_id;
  
  -- Obtener el contrato actualizado
  SELECT * INTO v_contract_record
  FROM public.rental_contracts
  WHERE id = p_contract_id;
  
  -- Crear notificación para el propietario
  BEGIN
    v_notification_id := public.create_notification(
      v_contract_record.owner_id,
      'contract_approved',
      'Contrato aprobado por el inquilino',
      format('El inquilino ha aprobado el contrato para el inmueble: %s. El contrato está listo para ser firmado.', 
        coalesce(v_property_title, 'Sin título')),
      v_contract_record.property_id
    );
    
    RAISE NOTICE 'Notificación de contrato aprobado creada exitosamente: %', v_notification_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error al crear notificación de contrato aprobado: %', SQLERRM;
  END;
  
  -- Construir resultado JSON
  v_result := jsonb_build_object(
    'id', v_contract_record.id,
    'status', v_contract_record.status,
    'tenant_approved_at', v_contract_record.tenant_approved_at,
    'tenant_disclaimer_accepted_at', v_contract_record.tenant_disclaimer_accepted_at,
    'updated_at', v_contract_record.updated_at,
    'notification_sent', v_notification_id IS NOT NULL
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.tenant_approve_contract IS 
  'Permite al inquilino aprobar el contrato. Requiere aceptación del disclaimer legal. Cambia el estado de pending_tenant a approved y notifica al propietario.';

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. DROP FUNCTION public.tenant_approve_contract(uuid, boolean);
--   2. ALTER TABLE public.rental_contracts DROP COLUMN IF EXISTS tenant_disclaimer_accepted_at;
-- ============================================
