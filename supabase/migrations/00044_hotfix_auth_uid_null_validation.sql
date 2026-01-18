-- ============================================
-- HOTFIX: Validación defensiva de auth.uid() en funciones SECURITY DEFINER
-- ============================================
-- Problema: Usuarios nuevos reciben "Database error querying schema" al iniciar sesión
-- Causa: Funciones SECURITY DEFINER usan auth.uid() sin validar NULL
-- Solución: Agregar validación defensiva al inicio de cada función
-- ============================================
-- Este fix es SEGURO y MÍNIMO:
-- - NO cambia lógica existente
-- - NO modifica contratos de funciones
-- - NO elimina funcionalidad
-- - Solo agrega validación defensiva
-- ============================================

-- ============================================
-- FUNCIÓN 1: approve_and_send_contract
-- ============================================
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
  -- VALIDACIÓN DEFENSIVA: Verificar que auth.uid() no es NULL
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
  END IF;
  
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

-- ============================================
-- FUNCIÓN 2: tenant_approve_contract
-- ============================================
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
  -- VALIDACIÓN DEFENSIVA: Verificar que auth.uid() no es NULL
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
  END IF;
  
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

-- ============================================
-- FUNCIÓN 3: cancel_contract_and_reactivate_property
-- ============================================
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
  -- VALIDACIÓN DEFENSIVA: Verificar que auth.uid() no es NULL
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
  END IF;
  
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

-- ============================================
-- FUNCIÓN 4: start_verification
-- ============================================
CREATE OR REPLACE FUNCTION public.start_verification(
  p_user_id uuid,
  p_verification_type text,
  p_document_type text DEFAULT NULL,
  p_document_number text DEFAULT NULL,
  p_document_front_url text DEFAULT NULL,
  p_document_back_url text DEFAULT NULL,
  p_selfie_url text DEFAULT NULL,
  p_company_name text DEFAULT NULL,
  p_company_nit text DEFAULT NULL,
  p_company_document_url text DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_property_document_type text DEFAULT NULL,
  p_property_document_url text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_verification_id uuid;
  v_has_pro_plan boolean;
BEGIN
  -- VALIDACIÓN DEFENSIVA: Verificar que auth.uid() no es NULL
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
  END IF;
  
  -- Verificar que el usuario tenga plan PRO activo
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    INNER JOIN public.plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND (p.id LIKE '%_pro' OR p.id = 'tenant_pro' OR p.id = 'landlord_pro' OR p.id = 'inmobiliaria_pro')
  ) INTO v_has_pro_plan;
  
  IF NOT v_has_pro_plan THEN
    RAISE EXCEPTION 'El usuario debe tener un plan PRO activo para iniciar verificaciones KYC';
  END IF;
  
  -- Validar verification_type
  IF p_verification_type NOT IN ('person', 'company', 'property') THEN
    RAISE EXCEPTION 'Tipo de verificación inválido. Debe ser: person, company o property';
  END IF;
  
  -- Validar que el usuario sea el autenticado
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: solo puedes iniciar verificaciones para tu propio usuario';
  END IF;
  
  -- Si existe una verificación activa del mismo tipo, rechazarla primero
  UPDATE public.kyc_verifications
  SET status = 'rejected',
      rejection_reason = 'Reemplazada por nueva verificación',
      updated_at = now()
  WHERE user_id = p_user_id
  AND verification_type = p_verification_type
  AND status IN ('pending', 'verified');
  
  -- Crear nueva verificación
  INSERT INTO public.kyc_verifications (
    user_id,
    verification_type,
    status,
    document_type,
    document_number,
    document_front_url,
    document_back_url,
    selfie_url,
    company_name,
    company_nit,
    company_document_url,
    property_id,
    property_document_type,
    property_document_url,
    verified_by,
    expires_at
  ) VALUES (
    p_user_id,
    p_verification_type,
    'pending',
    p_document_type,
    p_document_number,
    p_document_front_url,
    p_document_back_url,
    p_selfie_url,
    p_company_name,
    p_company_nit,
    p_company_document_url,
    p_property_id,
    p_property_document_type,
    p_property_document_url,
    NULL,
    CASE 
      WHEN p_verification_type = 'property' THEN now() + INTERVAL '1 year'
      ELSE now() + INTERVAL '1 year'
    END
  )
  RETURNING id INTO v_verification_id;
  
  RETURN v_verification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 5: update_contract_clauses
-- ============================================
CREATE OR REPLACE FUNCTION public.update_contract_clauses(
  p_contract_id uuid,
  p_clauses jsonb
)
RETURNS void AS $$
DECLARE
  v_owner_id uuid;
  v_contract_status text;
BEGIN
  -- VALIDACIÓN DEFENSIVA: Verificar que auth.uid() no es NULL
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
  END IF;
  
  -- Obtener información del contrato
  SELECT owner_id, status INTO v_owner_id, v_contract_status
  FROM public.rental_contracts
  WHERE id = p_contract_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato no encontrado';
  END IF;
  
  -- Validar que el usuario autenticado sea el propietario
  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: solo puedes editar tus propios contratos';
  END IF;
  
  -- Validar que el contrato esté en estado editable
  IF v_contract_status NOT IN ('draft', 'pending_owner') THEN
    RAISE EXCEPTION 'Solo puedes editar contratos en estado draft o pending_owner';
  END IF;
  
  -- Actualizar cláusulas
  UPDATE public.rental_contracts
  SET 
    clauses = p_clauses,
    updated_at = now()
  WHERE id = p_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 6: get_pro_plan_interest_stats
-- ============================================
CREATE OR REPLACE FUNCTION get_pro_plan_interest_stats()
RETURNS TABLE (
  plan_type pro_plan_type,
  role pro_plan_role,
  total_count BIGINT,
  latest_interest TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- VALIDACIÓN DEFENSIVA: Verificar que auth.uid() no es NULL
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
  END IF;
  
  -- Verificar que el usuario es admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    ppi.plan_type,
    ppi.role,
    COUNT(*)::BIGINT as total_count,
    MAX(ppi.created_at) as latest_interest
  FROM pro_plan_interest ppi
  GROUP BY ppi.plan_type, ppi.role
  ORDER BY ppi.plan_type, ppi.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 7: start_contract
-- ============================================
CREATE OR REPLACE FUNCTION public.start_contract(
  p_property_id uuid,
  p_tenant_id uuid,
  p_contract_request_id uuid DEFAULT NULL,
  p_monthly_rent decimal DEFAULT NULL,
  p_deposit_amount decimal DEFAULT NULL,
  p_contract_duration_months integer DEFAULT NULL,
  p_start_date date DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_contract_id uuid;
  v_owner_id uuid;
  v_property_status text;
  v_property_price decimal;
  v_has_pro_plan boolean;
  v_owner_kyc_verified boolean;
  v_tenant_kyc_verified boolean;
  v_contract_content text;
  v_end_date date;
BEGIN
  -- VALIDACIÓN DEFENSIVA: Verificar que auth.uid() no es NULL
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
  END IF;
  
  -- Validar que el usuario autenticado sea el propietario
  SELECT owner_id, status, price INTO v_owner_id, v_property_status, v_property_price
  FROM public.properties
  WHERE id = p_property_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inmueble no encontrado';
  END IF;
  
  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: solo puedes iniciar contratos para tus propios inmuebles';
  END IF;
  
  -- Verificar que el propietario tenga plan PRO activo
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    INNER JOIN public.plans p ON p.id = s.plan_id
    WHERE s.user_id = v_owner_id
    AND s.status = 'active'
    AND (p.id LIKE '%_pro' OR p.id = 'landlord_pro' OR p.id = 'inmobiliaria_pro')
  ) INTO v_has_pro_plan;
  
  IF NOT v_has_pro_plan THEN
    RAISE EXCEPTION 'Debes tener un plan PRO activo para iniciar contratos';
  END IF;
  
  -- Validar que el inmueble esté publicado o pausado (no bloqueado)
  IF v_property_status NOT IN ('published', 'paused') THEN
    RAISE EXCEPTION 'Solo puedes iniciar contratos para inmuebles publicados o pausados. Estado actual: %', v_property_status;
  END IF;
  
  -- Verificar que no exista un contrato activo para este inmueble
  IF EXISTS (
    SELECT 1
    FROM public.rental_contracts
    WHERE property_id = p_property_id
    AND status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active')
  ) THEN
    RAISE EXCEPTION 'Ya existe un contrato activo para este inmueble';
  END IF;
  
  -- Validar verificación KYC del propietario
  SELECT EXISTS (
    SELECT 1
    FROM public.kyc_verifications
    WHERE user_id = v_owner_id
    AND verification_type IN ('person', 'company')
    AND status = 'verified'
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_owner_kyc_verified;
  
  IF NOT v_owner_kyc_verified THEN
    RAISE EXCEPTION 'Debes tener una verificación KYC activa (persona o empresa) para iniciar contratos';
  END IF;
  
  -- Validar verificación KYC del inquilino
  SELECT EXISTS (
    SELECT 1
    FROM public.kyc_verifications
    WHERE user_id = p_tenant_id
    AND verification_type = 'person'
    AND status = 'verified'
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_tenant_kyc_verified;
  
  IF NOT v_tenant_kyc_verified THEN
    RAISE EXCEPTION 'El inquilino debe tener una verificación KYC activa para iniciar contratos';
  END IF;
  
  -- Validar contract_request si se proporciona
  IF p_contract_request_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.contract_requests
      WHERE id = p_contract_request_id
      AND property_id = p_property_id
      AND tenant_id = p_tenant_id
      AND owner_id = v_owner_id
      AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'La solicitud de contrato especificada no es válida';
    END IF;
  END IF;
  
  -- Calcular fecha de fin si se proporciona duración
  IF p_start_date IS NOT NULL AND p_contract_duration_months IS NOT NULL THEN
    v_end_date := p_start_date + (p_contract_duration_months || ' months')::interval;
  END IF;
  
  -- Usar precio del inmueble si no se proporciona monthly_rent
  IF p_monthly_rent IS NULL THEN
    p_monthly_rent := v_property_price;
  END IF;
  
  -- Generar contenido del contrato (simplificado para MVP)
  v_contract_content := format(
    'CONTRATO DE ARRENDAMIENTO%n%n' ||
    'Entre las partes:%n' ||
    'Propietario: [DATOS DEL PROPIETARIO]%n' ||
    'Inquilino: [DATOS DEL INQUILINO]%n%n' ||
    'Se acuerda el arrendamiento del inmueble identificado con ID: %s%n' ||
    'Por un valor mensual de: %s%n' ||
    'Con una duración de: %s meses%n%n' ||
    'Este contrato ha sido generado digitalmente a través de RentarColombia.%n' ||
    'RentarColombia proporciona plantillas digitales de contratos de arrendamiento y herramientas de gestión. No sustituye asesoría legal profesional.',
    p_property_id::text,
    p_monthly_rent::text,
    COALESCE(p_contract_duration_months::text, 'No especificado')
  );
  
  -- Crear el contrato
  INSERT INTO public.rental_contracts (
    contract_request_id,
    property_id,
    tenant_id,
    owner_id,
    status,
    contract_content,
    monthly_rent,
    deposit_amount,
    contract_duration_months,
    start_date,
    end_date,
    created_at,
    updated_at
  ) VALUES (
    p_contract_request_id,
    p_property_id,
    p_tenant_id,
    v_owner_id,
    'draft',
    v_contract_content,
    p_monthly_rent,
    p_deposit_amount,
    p_contract_duration_months,
    p_start_date,
    v_end_date,
    now(),
    now()
  )
  RETURNING id INTO v_contract_id;
  
  -- Bloquear el inmueble para contratación
  UPDATE public.properties
  SET 
    status = 'locked_for_contract',
    locked_at = now(),
    locked_by_contract_id = v_contract_id
  WHERE id = p_property_id;
  
  -- Rechazar otras solicitudes de contrato para este inmueble
  UPDATE public.contract_requests
  SET 
    status = 'rejected',
    updated_at = now()
  WHERE property_id = p_property_id
  AND id != COALESCE(p_contract_request_id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND status = 'pending';
  
  RETURN v_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 8: generate_contract_content
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_contract_content(
  p_contract_id uuid
)
RETURNS text AS $$
DECLARE
  v_contract_record public.rental_contracts%ROWTYPE;
  v_owner_data public.profiles%ROWTYPE;
  v_tenant_data public.profiles%ROWTYPE;
  v_property_data public.properties%ROWTYPE;
  v_contract_content text;
BEGIN
  -- VALIDACIÓN DEFENSIVA: Verificar que auth.uid() no es NULL
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
  END IF;
  
  -- Obtener el contrato
  SELECT * INTO v_contract_record
  FROM public.rental_contracts
  WHERE id = p_contract_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato no encontrado';
  END IF;
  
  -- Validar que el usuario autenticado sea el propietario
  IF v_contract_record.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: solo puedes generar contenido para tus propios contratos';
  END IF;
  
  -- Obtener datos del propietario
  SELECT * INTO v_owner_data
  FROM public.profiles
  WHERE id = v_contract_record.owner_id;
  
  -- Obtener datos del inquilino
  SELECT * INTO v_tenant_data
  FROM public.profiles
  WHERE id = v_contract_record.tenant_id;
  
  -- Obtener datos del inmueble
  SELECT * INTO v_property_data
  FROM public.properties
  WHERE id = v_contract_record.property_id;
  
  -- Generar contenido del contrato usando template
  v_contract_content := format(
    'CONTRATO DE ARRENDAMIENTO%n%n' ||
    'Entre las partes:%n' ||
    'Propietario: %s (%s)%n' ||
    'Inquilino: %s (%s)%n%n' ||
    'INMUEBLE OBJETO DEL CONTRATO:%n' ||
    'Dirección: %s%n' ||
    'Ciudad: %s%n' ||
    'Barrio: %s%n%n' ||
    'TÉRMINOS DEL CONTRATO:%n' ||
    'Valor mensual: $%s%n' ||
    'Depósito: $%s%n' ||
    'Duración: %s meses%n' ||
    'Fecha de inicio: %s%n' ||
    'Fecha de fin: %s%n%n' ||
    'Este contrato ha sido generado digitalmente a través de RentarColombia.%n' ||
    'RentarColombia proporciona plantillas digitales de contratos de arrendamiento y herramientas de gestión. No sustituye asesoría legal profesional.',
    COALESCE(
      CASE 
        WHEN v_owner_data.publisher_type = 'inmobiliaria' AND v_owner_data.company_name IS NOT NULL 
        THEN v_owner_data.company_name
        ELSE v_owner_data.full_name
      END,
      v_owner_data.email,
      'No especificado'
    ),
    v_owner_data.email,
    COALESCE(v_tenant_data.full_name, v_tenant_data.email, 'No especificado'),
    v_tenant_data.email,
    COALESCE(v_property_data.address, 'No especificado'),
    v_property_data.city,
    COALESCE(v_property_data.neighborhood, 'No especificado'),
    v_contract_record.monthly_rent::text,
    COALESCE(v_contract_record.deposit_amount::text, '0'),
    COALESCE(v_contract_record.contract_duration_months::text, 'No especificado'),
    COALESCE(v_contract_record.start_date::text, 'No especificado'),
    COALESCE(v_contract_record.end_date::text, 'No especificado')
  );
  
  -- Actualizar el contrato con el contenido generado
  UPDATE public.rental_contracts
  SET 
    contract_content = v_contract_content,
    updated_at = now()
  WHERE id = p_contract_id;
  
  RETURN v_contract_content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 9: create_contract_request
-- ============================================
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
  -- VALIDACIÓN DEFENSIVA: Verificar que auth.uid() no es NULL
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
  END IF;
  
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
    now() + INTERVAL '7 days',
    v_tenant_kyc_status,
    CASE WHEN v_tenant_kyc_status = 'verified' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN 10: send_contract_message
-- ============================================
CREATE OR REPLACE FUNCTION public.send_contract_message(
  p_contract_id uuid,
  p_content text,
  p_message_type text DEFAULT 'comment',
  p_conversation_id uuid DEFAULT NULL,
  p_change_request_data jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_message_id uuid;
  v_contract_record public.rental_contracts%ROWTYPE;
  v_sender_id uuid;
  v_recipient_id uuid;
BEGIN
  -- VALIDACIÓN DEFENSIVA: Verificar que auth.uid() no es NULL
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() is null';
  END IF;
  
  -- Obtener el contrato
  SELECT * INTO v_contract_record
  FROM public.rental_contracts
  WHERE id = p_contract_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato no encontrado';
  END IF;
  
  -- Obtener el usuario autenticado
  v_sender_id := auth.uid();
  
  -- Validar que el usuario sea participante del contrato
  IF v_sender_id != v_contract_record.tenant_id AND v_sender_id != v_contract_record.owner_id THEN
    RAISE EXCEPTION 'No autorizado: solo los participantes del contrato pueden enviar mensajes';
  END IF;
  
  -- Validar tipo de mensaje
  IF p_message_type NOT IN ('comment', 'change_request', 'approval', 'rejection', 'system') THEN
    RAISE EXCEPTION 'Tipo de mensaje inválido. Debe ser: comment, change_request, approval, rejection o system';
  END IF;
  
  -- Validar contenido
  IF p_content IS NULL OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'El contenido del mensaje no puede estar vacío';
  END IF;
  
  -- Validar conversation_id si se proporciona
  IF p_conversation_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE id = p_conversation_id
      AND (tenant_id = v_sender_id OR owner_id = v_sender_id)
    ) THEN
      RAISE EXCEPTION 'La conversación especificada no existe o no tienes acceso a ella';
    END IF;
  END IF;
  
  -- Determinar destinatario (la otra parte del contrato)
  IF v_sender_id = v_contract_record.tenant_id THEN
    v_recipient_id := v_contract_record.owner_id;
  ELSE
    v_recipient_id := v_contract_record.tenant_id;
  END IF;
  
  -- Crear el mensaje
  INSERT INTO public.contract_messages (
    contract_id,
    conversation_id,
    sender_id,
    message_type,
    content,
    change_request_data,
    is_read
  ) VALUES (
    p_contract_id,
    p_conversation_id,
    v_sender_id,
    p_message_type,
    trim(p_content),
    p_change_request_data,
    false
  )
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICACIÓN DEL TRIGGER handle_new_user()
-- ============================================
-- Asegurar que el trigger está correctamente configurado
DO $$
BEGIN
  -- Verificar que handle_new_user() es SECURITY DEFINER
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'handle_new_user'
      AND p.prosecdef = true
  ) THEN
    RAISE EXCEPTION 'handle_new_user() debe ser SECURITY DEFINER';
  END IF;
  
  -- Verificar que el trigger existe y está activo
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' 
      AND c.relname = 'users' 
      AND t.tgname = 'on_auth_user_created'
      AND t.tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created debe existir y estar activo';
  END IF;
  
  RAISE NOTICE '✓ Trigger handle_new_user() verificado correctamente';
END $$;

-- ============================================
-- RESUMEN DE CAMBIOS
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'HOTFIX APLICADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Funciones modificadas:';
  RAISE NOTICE '1. approve_and_send_contract';
  RAISE NOTICE '2. tenant_approve_contract';
  RAISE NOTICE '3. cancel_contract_and_reactivate_property';
  RAISE NOTICE '4. start_verification';
  RAISE NOTICE '5. update_contract_clauses';
  RAISE NOTICE '6. get_pro_plan_interest_stats';
  RAISE NOTICE '7. start_contract';
  RAISE NOTICE '8. generate_contract_content';
  RAISE NOTICE '9. create_contract_request';
  RAISE NOTICE '10. send_contract_message';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cambio aplicado: Validación defensiva';
  RAISE NOTICE 'IF auth.uid() IS NULL THEN RAISE EXCEPTION';
  RAISE NOTICE 'al inicio de cada función SECURITY DEFINER';
  RAISE NOTICE '========================================';
END $$;
