-- ============================================
-- Migración: Generación Automática de Contratos
-- ============================================
-- Agrega generación automática de contratos usando datos reales
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVOS:
-- 1. Agregar campo clauses JSONB para cláusulas editables
-- 2. Crear función para generar contrato desde datos reales
-- 3. Actualizar start_contract para usar generación automática
--
-- IMPORTANTE:
-- - Las cláusulas se guardan como JSON para permitir edición posterior
-- - El contrato se genera automáticamente usando datos del inmueble, inquilino y propietario
-- ============================================

-- ============================================
-- 1. AGREGAR CAMPO clauses JSONB
-- ============================================

ALTER TABLE public.rental_contracts
  ADD COLUMN IF NOT EXISTS clauses jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.rental_contracts.clauses IS 
  'Cláusulas del contrato en formato JSON. Permite edición individual de cada cláusula. Estructura: [{"id": "1", "title": "Título", "content": "Contenido", "editable": true}]';

-- Índice para búsqueda en cláusulas
CREATE INDEX IF NOT EXISTS rental_contracts_clauses_idx 
  ON public.rental_contracts USING GIN (clauses);

-- ============================================
-- 2. CREAR FUNCIÓN: generate_contract_content
-- ============================================
-- Genera el contenido del contrato usando datos reales del inmueble, inquilino y propietario

CREATE OR REPLACE FUNCTION public.generate_contract_content(
  p_property_id uuid,
  p_tenant_id uuid,
  p_owner_id uuid,
  p_monthly_rent decimal,
  p_deposit_amount decimal,
  p_contract_duration_months integer,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb AS $$
DECLARE
  v_property_data record;
  v_tenant_data record;
  v_owner_data record;
  v_contract_content text;
  v_clauses jsonb;
  v_result jsonb;
  v_owner_name text;
  v_owner_document text;
BEGIN
  -- Obtener datos del inmueble
  SELECT 
    title,
    address,
    city,
    neighborhood,
    property_type,
    bedrooms,
    bathrooms,
    area,
    estrato,
    price
  INTO v_property_data
  FROM public.properties
  WHERE id = p_property_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inmueble no encontrado';
  END IF;
  
  -- Obtener datos del inquilino
  SELECT 
    full_name,
    email,
    phone,
    document_type,
    document_number
  INTO v_tenant_data
  FROM public.profiles
  WHERE id = p_tenant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquilino no encontrado';
  END IF;
  
  -- Obtener datos del propietario/inmobiliaria
  SELECT 
    full_name,
    email,
    phone,
    company_name,
    publisher_type,
    document_type,
    document_number
  INTO v_owner_data
  FROM public.profiles
  WHERE id = p_owner_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Propietario no encontrado';
  END IF;
  
  -- Determinar nombre del propietario (persona o empresa)
  IF v_owner_data.publisher_type = 'inmobiliaria' AND v_owner_data.company_name IS NOT NULL THEN
    v_owner_name := v_owner_data.company_name;
    v_owner_document := COALESCE(v_owner_data.document_number, 'N/A');
  ELSE
    v_owner_name := COALESCE(v_owner_data.full_name, v_owner_data.email);
    v_owner_document := COALESCE(v_owner_data.document_number, 'N/A');
  END IF;
  
  -- Generar contenido del contrato usando plantilla base
  v_contract_content := format(
    '# CONTRATO DE ARRENDAMIENTO DE INMUEBLE

## DATOS DE LAS PARTES

### ARRENDADOR

**Nombre:** %s
**Documento de Identidad:** %s
**Correo Electrónico:** %s
**Teléfono:** %s

### ARRENDATARIO

**Nombre:** %s
**Documento de Identidad:** %s
**Correo Electrónico:** %s
**Teléfono:** %s

## DATOS DEL INMUEBLE

**Dirección:** %s
**Ciudad:** %s
**Barrio:** %s
**Tipo de Inmueble:** %s
**Área:** %s m²
**Habitaciones:** %s
**Baños:** %s
**Estrato:** %s

## TÉRMINOS DEL CONTRATO

**Renta Mensual:** $%s
**Depósito:** $%s
**Duración del Contrato:** %s meses
**Fecha de Inicio:** %s
**Fecha de Finalización:** %s

## CLÁUSULAS

### CLÁUSULA PRIMERA: OBJETO DEL CONTRATO

El ARRENDADOR cede en arrendamiento al ARRENDATARIO el inmueble ubicado en %s, %s, para que lo use como vivienda, bajo los términos y condiciones establecidos en el presente contrato.

### CLÁUSULA SEGUNDA: PLAZO Y DURACIÓN

El presente contrato tendrá una duración de %s meses, iniciando el %s y finalizando el %s.

### CLÁUSULA TERCERA: CANON DE ARRENDAMIENTO

El ARRENDATARIO se obliga a pagar al ARRENDADOR un canon de arrendamiento mensual de $%s, pagadero por anticipado dentro de los primeros cinco (5) días de cada mes.

### CLÁUSULA CUARTA: DEPÓSITO DE GARANTÍA

El ARRENDATARIO entregará al ARRENDADOR un depósito de garantía equivalente a $%s, el cual será devuelto al término del contrato, previa verificación del estado del inmueble y deducción de los daños que se hubieren causado.

### CLÁUSULA QUINTA: OBLIGACIONES DEL ARRENDADOR

El ARRENDADOR se obliga a:
- Entregar el inmueble en buen estado de conservación y funcionamiento
- Realizar las reparaciones necesarias que no sean atribuibles al uso normal del inmueble
- Mantener el inmueble en condiciones habitables

### CLÁUSULA SEXTA: OBLIGACIONES DEL ARRENDATARIO

El ARRENDATARIO se obliga a:
- Pagar puntualmente el canon de arrendamiento
- Usar el inmueble exclusivamente como vivienda
- Mantener el inmueble en buen estado de conservación
- No realizar modificaciones sin autorización escrita del ARRENDADOR
- Pagar los servicios públicos y administración correspondientes
- Permitir al ARRENDADOR inspeccionar el inmueble con previo aviso

### CLÁUSULA SÉPTIMA: TERMINACIÓN DEL CONTRATO

El presente contrato podrá terminar:
- Por vencimiento del plazo estipulado
- Por mutuo acuerdo entre las partes
- Por incumplimiento de cualquiera de las obligaciones establecidas

### CLÁUSULA OCTAVA: DISPOSICIONES GENERALES

- Cualquier modificación al presente contrato deberá realizarse por escrito y ser firmada por ambas partes
- El presente contrato se rige por las leyes de la República de Colombia
- Para cualquier controversia, las partes se someterán a la jurisdicción de los jueces de %s

## DISCLAIMER LEGAL

**IMPORTANTE:** Este contrato es una plantilla generada automáticamente por RenColombia y no sustituye asesoría legal profesional. Se recomienda consultar con un abogado antes de firmar.

---

**Fecha de Generación:** %s
**Lugar:** %s, Colombia

**ARRENDADOR**                          **ARRENDATARIO**

_________________________              _________________________
%s                                    %s
',
    -- Datos del arrendador
    v_owner_name,
    v_owner_document,
    COALESCE(v_owner_data.email, 'N/A'),
    COALESCE(v_owner_data.phone, 'N/A'),
    
    -- Datos del arrendatario
    COALESCE(v_tenant_data.full_name, v_tenant_data.email),
    COALESCE(v_tenant_data.document_number, 'N/A'),
    COALESCE(v_tenant_data.email, 'N/A'),
    COALESCE(v_tenant_data.phone, 'N/A'),
    
    -- Datos del inmueble
    COALESCE(v_property_data.address, 'N/A'),
    COALESCE(v_property_data.city, 'N/A'),
    COALESCE(v_property_data.neighborhood, 'N/A'),
    COALESCE(v_property_data.property_type, 'N/A'),
    COALESCE(v_property_data.area::text, 'N/A'),
    COALESCE(v_property_data.bedrooms::text, 'N/A'),
    COALESCE(v_property_data.bathrooms::text, 'N/A'),
    COALESCE(v_property_data.estrato::text, 'N/A'),
    
    -- Términos del contrato
    p_monthly_rent,
    p_deposit_amount,
    p_contract_duration_months,
    p_start_date,
    p_end_date,
    
    -- Repeticiones para cláusulas
    COALESCE(v_property_data.address, 'N/A'),
    COALESCE(v_property_data.city, 'N/A'),
    p_contract_duration_months,
    p_start_date,
    p_end_date,
    p_monthly_rent,
    p_deposit_amount,
    COALESCE(v_property_data.city, 'N/A'),
    CURRENT_DATE,
    COALESCE(v_property_data.city, 'N/A'),
    v_owner_name,
    COALESCE(v_tenant_data.full_name, v_tenant_data.email)
  );
  
  -- Generar cláusulas en formato JSON para edición posterior
  v_clauses := jsonb_build_array(
    jsonb_build_object(
      'id', '1',
      'title', 'OBJETO DEL CONTRATO',
      'content', format('El ARRENDADOR cede en arrendamiento al ARRENDATARIO el inmueble ubicado en %s, %s, para que lo use como vivienda, bajo los términos y condiciones establecidos en el presente contrato.', 
        COALESCE(v_property_data.address, 'N/A'), 
        COALESCE(v_property_data.city, 'N/A')),
      'editable', true,
      'order', 1
    ),
    jsonb_build_object(
      'id', '2',
      'title', 'PLAZO Y DURACIÓN',
      'content', format('El presente contrato tendrá una duración de %s meses, iniciando el %s y finalizando el %s.', 
        p_contract_duration_months, 
        p_start_date, 
        p_end_date),
      'editable', true,
      'order', 2
    ),
    jsonb_build_object(
      'id', '3',
      'title', 'CANON DE ARRENDAMIENTO',
      'content', format('El ARRENDATARIO se obliga a pagar al ARRENDADOR un canon de arrendamiento mensual de $%s, pagadero por anticipado dentro de los primeros cinco (5) días de cada mes.', 
        p_monthly_rent),
      'editable', true,
      'order', 3
    ),
    jsonb_build_object(
      'id', '4',
      'title', 'DEPÓSITO DE GARANTÍA',
      'content', format('El ARRENDATARIO entregará al ARRENDADOR un depósito de garantía equivalente a $%s, el cual será devuelto al término del contrato, previa verificación del estado del inmueble y deducción de los daños que se hubieren causado.', 
        p_deposit_amount),
      'editable', true,
      'order', 4
    ),
    jsonb_build_object(
      'id', '5',
      'title', 'OBLIGACIONES DEL ARRENDADOR',
      'content', 'El ARRENDADOR se obliga a: (1) Entregar el inmueble en buen estado de conservación y funcionamiento, (2) Realizar las reparaciones necesarias que no sean atribuibles al uso normal del inmueble, (3) Mantener el inmueble en condiciones habitables.',
      'editable', true,
      'order', 5
    ),
    jsonb_build_object(
      'id', '6',
      'title', 'OBLIGACIONES DEL ARRENDATARIO',
      'content', 'El ARRENDATARIO se obliga a: (1) Pagar puntualmente el canon de arrendamiento, (2) Usar el inmueble exclusivamente como vivienda, (3) Mantener el inmueble en buen estado de conservación, (4) No realizar modificaciones sin autorización escrita del ARRENDADOR, (5) Pagar los servicios públicos y administración correspondientes, (6) Permitir al ARRENDADOR inspeccionar el inmueble con previo aviso.',
      'editable', true,
      'order', 6
    ),
    jsonb_build_object(
      'id', '7',
      'title', 'TERMINACIÓN DEL CONTRATO',
      'content', 'El presente contrato podrá terminar: (1) Por vencimiento del plazo estipulado, (2) Por mutuo acuerdo entre las partes, (3) Por incumplimiento de cualquiera de las obligaciones establecidas.',
      'editable', true,
      'order', 7
    ),
    jsonb_build_object(
      'id', '8',
      'title', 'DISPOSICIONES GENERALES',
      'content', format('Cualquier modificación al presente contrato deberá realizarse por escrito y ser firmada por ambas partes. El presente contrato se rige por las leyes de la República de Colombia. Para cualquier controversia, las partes se someterán a la jurisdicción de los jueces de %s.', 
        COALESCE(v_property_data.city, 'N/A')),
      'editable', true,
      'order', 8
    )
  );
  
  -- Construir resultado JSON
  v_result := jsonb_build_object(
    'content', v_contract_content,
    'clauses', v_clauses
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_contract_content IS 
  'Genera el contenido del contrato y las cláusulas en formato JSON usando datos reales del inmueble, inquilino y propietario. Retorna un objeto JSON con "content" (texto completo) y "clauses" (array de cláusulas editables).';

-- ============================================
-- 3. ACTUALIZAR FUNCIÓN start_contract
-- ============================================
-- Modificar start_contract para usar generate_contract_content

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
  v_end_date date;
  v_contract_data jsonb;
BEGIN
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
  
  -- Calcular valores por defecto si no se proporcionan
  IF p_monthly_rent IS NULL THEN
    p_monthly_rent := v_property_price;
  END IF;
  
  IF p_deposit_amount IS NULL THEN
    p_deposit_amount := p_monthly_rent; -- Por defecto: 1 mes de depósito
  END IF;
  
  IF p_contract_duration_months IS NULL THEN
    p_contract_duration_months := 12; -- Por defecto: 12 meses
  END IF;
  
  IF p_start_date IS NULL THEN
    p_start_date := CURRENT_DATE + INTERVAL '7 days'; -- Por defecto: 7 días desde hoy
  END IF;
  
  -- Calcular fecha de fin
  v_end_date := (p_start_date + (p_contract_duration_months || ' months')::interval)::date;
  
  -- Generar contenido del contrato usando datos reales
  SELECT public.generate_contract_content(
    p_property_id,
    p_tenant_id,
    v_owner_id,
    p_monthly_rent,
    p_deposit_amount,
    p_contract_duration_months,
    p_start_date,
    v_end_date
  ) INTO v_contract_data;
  
  -- Crear el contrato en estado draft
  INSERT INTO public.rental_contracts (
    contract_request_id,
    property_id,
    tenant_id,
    owner_id,
    status,
    contract_template_id,
    contract_content,
    clauses,
    monthly_rent,
    deposit_amount,
    contract_duration_months,
    start_date,
    end_date,
    version
  ) VALUES (
    p_contract_request_id,
    p_property_id,
    p_tenant_id,
    v_owner_id,
    'draft',
    'standard_rental_v1',
    v_contract_data->>'content',
    v_contract_data->'clauses',
    p_monthly_rent,
    p_deposit_amount,
    p_contract_duration_months,
    p_start_date,
    v_end_date,
    1
  )
  RETURNING id INTO v_contract_id;
  
  -- Bloquear el inmueble (cambiar a locked_for_contract)
  UPDATE public.properties
  SET 
    status = 'locked_for_contract',
    locked_at = now(),
    locked_by_contract_id = v_contract_id
  WHERE id = p_property_id;
  
  -- Rechazar otras solicitudes activas para este inmueble
  UPDATE public.contract_requests
  SET 
    status = 'rejected',
    updated_at = now()
  WHERE property_id = p_property_id
  AND status = 'pending'
  AND id != COALESCE(p_contract_request_id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Aprobar la solicitud de contrato si se proporcionó
  IF p_contract_request_id IS NOT NULL THEN
    UPDATE public.contract_requests
    SET 
      status = 'approved',
      updated_at = now()
    WHERE id = p_contract_request_id;
  END IF;
  
  RETURN v_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. CREAR FUNCIÓN: update_contract_clauses
-- ============================================
-- Permite actualizar las cláusulas editables del contrato

CREATE OR REPLACE FUNCTION public.update_contract_clauses(
  p_contract_id uuid,
  p_clauses jsonb
)
RETURNS void AS $$
DECLARE
  v_owner_id uuid;
  v_contract_status text;
BEGIN
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
  
  -- Regenerar contenido completo del contrato desde las cláusulas actualizadas
  -- (Esto se puede hacer en el frontend o con otra función)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_contract_clauses IS 
  'Actualiza las cláusulas editables de un contrato. Solo el propietario puede editar contratos en estado draft o pending_owner.';

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. DROP FUNCTION public.update_contract_clauses(uuid, jsonb);
--   2. DROP FUNCTION public.generate_contract_content(uuid, uuid, uuid, decimal, decimal, integer, date, date);
--   3. DROP INDEX rental_contracts_clauses_idx;
--   4. ALTER TABLE public.rental_contracts DROP COLUMN IF EXISTS clauses;
-- ============================================
