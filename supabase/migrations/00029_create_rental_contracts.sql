-- ============================================
-- Migración: Sistema de Contratos de Arrendamiento
-- ============================================
-- Crea la tabla y funciones para contratos de arrendamiento
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVOS:
-- 1. Crear tabla rental_contracts
-- 2. Crear función RPC para iniciar contrato
-- 3. Validar verificaciones KYC de ambas partes
-- 4. Bloquear inmueble y rechazar otras solicitudes
--
-- IMPORTANTE:
-- - Solo propietarios/inmobiliarias PRO pueden iniciar contratos
-- - Ambos (propietario e inquilino) deben estar verificados KYC
-- ============================================

-- ============================================
-- 1. CREAR TABLA rental_contracts
-- ============================================

CREATE TABLE IF NOT EXISTS public.rental_contracts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_request_id uuid REFERENCES public.contract_requests(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Estado del contrato
  status text NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'signed', 'active', 'cancelled', 'expired')),
  
  -- Contenido del contrato
  contract_template_id text DEFAULT 'standard_rental_v1', -- ID del template usado
  contract_content text NOT NULL DEFAULT '', -- Contenido completo del contrato (Markdown o HTML)
  contract_pdf_url text, -- URL del PDF generado (cuando se genera)
  
  -- Términos del contrato (extraídos para búsqueda y análisis)
  monthly_rent decimal(12, 2) NOT NULL,
  deposit_amount decimal(12, 2),
  contract_duration_months integer,
  start_date date,
  end_date date,
  
  -- Aprobaciones y firmas
  owner_approved_at timestamp with time zone,
  tenant_approved_at timestamp with time zone,
  owner_signed_at timestamp with time zone,
  tenant_signed_at timestamp with time zone,
  
  -- Versión y cambios
  version integer DEFAULT 1 NOT NULL,
  parent_contract_id uuid REFERENCES public.rental_contracts(id) ON DELETE SET NULL, -- Para versionado
  
  -- Metadatos
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  signed_at timestamp with time zone, -- Fecha de firma completa (ambas partes)
  activated_at timestamp with time zone -- Fecha de activación del contrato
);

-- Comentarios de documentación
COMMENT ON TABLE public.rental_contracts IS 
  'Almacena los contratos de arrendamiento generados y gestionados en la plataforma.';

COMMENT ON COLUMN public.rental_contracts.status IS 
  'Estado del contrato: draft (borrador), pending_tenant (pendiente inquilino), pending_owner (pendiente propietario), approved (aprobado), signed (firmado), active (activo), cancelled (cancelado), expired (expirado)';

COMMENT ON COLUMN public.rental_contracts.contract_content IS 
  'Contenido completo del contrato en formato Markdown o HTML. Se genera automáticamente desde el template.';

-- ============================================
-- 2. CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS rental_contracts_property_idx 
  ON public.rental_contracts(property_id);

CREATE INDEX IF NOT EXISTS rental_contracts_tenant_idx 
  ON public.rental_contracts(tenant_id);

CREATE INDEX IF NOT EXISTS rental_contracts_owner_idx 
  ON public.rental_contracts(owner_id);

CREATE INDEX IF NOT EXISTS rental_contracts_status_idx 
  ON public.rental_contracts(status);

CREATE INDEX IF NOT EXISTS rental_contracts_request_idx 
  ON public.rental_contracts(contract_request_id) 
  WHERE contract_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS rental_contracts_created_idx 
  ON public.rental_contracts(created_at DESC);

-- Índice único parcial: Un inmueble solo puede tener un contrato activo
-- Este índice ya está preparado en la migración 00026_add_contract_unique_constraint.sql
-- Pero lo creamos aquí también por si acaso
CREATE UNIQUE INDEX IF NOT EXISTS rental_contracts_property_active_unique_idx 
  ON public.rental_contracts(property_id) 
  WHERE status IN ('draft', 'pending_tenant', 'pending_owner', 'approved', 'active');

-- ============================================
-- 3. CREAR FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_rental_contract_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_rental_contract_updated_at() IS 
  'Trigger function que actualiza updated_at automáticamente en rental_contracts';

CREATE TRIGGER update_rental_contract_updated_at_trigger
  BEFORE UPDATE ON public.rental_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rental_contract_updated_at();

-- ============================================
-- 4. CREAR FUNCIÓN RPC: start_contract
-- ============================================
-- Inicia un nuevo contrato de arrendamiento
-- Solo propietarios/inmobiliarias PRO pueden iniciar contratos
-- Ambos (propietario e inquilino) deben estar verificados KYC

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
  
  -- Generar contenido básico del contrato (template simple)
  v_contract_content := format(
    '# Contrato de Arrendamiento

## Datos de las Partes

**Arrendador:** [Propietario]
**Arrendatario:** [Inquilino]
**Inmueble:** [Dirección]

## Términos del Contrato

- **Renta Mensual:** $%s
- **Depósito:** $%s
- **Duración:** %s meses
- **Fecha de Inicio:** %s
- **Fecha de Fin:** %s

## Cláusulas

Este contrato es una plantilla generada automáticamente por RenColombia y no sustituye asesoría legal profesional.

[Contenido adicional del contrato...]
',
    p_monthly_rent,
    p_deposit_amount,
    p_contract_duration_months,
    p_start_date,
    v_end_date
  );
  
  -- Crear el contrato en estado draft
  INSERT INTO public.rental_contracts (
    contract_request_id,
    property_id,
    tenant_id,
    owner_id,
    status,
    contract_template_id,
    contract_content,
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
    v_contract_content,
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

COMMENT ON FUNCTION public.start_contract IS 
  'Inicia un nuevo contrato de arrendamiento. Solo propietarios/inmobiliarias PRO pueden iniciar contratos. Ambos (propietario e inquilino) deben estar verificados KYC. Bloquea el inmueble y rechaza otras solicitudes.';

-- ============================================
-- 5. CREAR RLS POLICIES
-- ============================================

ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

-- Policy: Participantes pueden ver sus contratos
CREATE POLICY "Participantes pueden ver sus contratos"
  ON public.rental_contracts FOR SELECT
  USING (tenant_id = auth.uid() OR owner_id = auth.uid());

-- Policy: Solo propietarios pueden crear contratos (validado en RPC)
CREATE POLICY "Propietarios pueden crear contratos"
  ON public.rental_contracts FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Policy: Participantes pueden actualizar contratos según estado
CREATE POLICY "Propietarios pueden actualizar contratos en draft"
  ON public.rental_contracts FOR UPDATE
  USING (owner_id = auth.uid() AND status = 'draft')
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Inquilinos pueden actualizar contratos pendientes"
  ON public.rental_contracts FOR UPDATE
  USING (
    tenant_id = auth.uid() 
    AND status IN ('pending_tenant', 'pending_owner')
  )
  WITH CHECK (tenant_id = auth.uid());

-- Policy: Solo propietarios pueden eliminar contratos en draft
CREATE POLICY "Propietarios pueden eliminar contratos en draft"
  ON public.rental_contracts FOR DELETE
  USING (owner_id = auth.uid() AND status = 'draft');

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. DROP POLICY "Propietarios pueden eliminar contratos en draft" ON public.rental_contracts;
--   2. DROP POLICY "Inquilinos pueden actualizar contratos pendientes" ON public.rental_contracts;
--   3. DROP POLICY "Propietarios pueden actualizar contratos en draft" ON public.rental_contracts;
--   4. DROP POLICY "Propietarios pueden crear contratos" ON public.rental_contracts;
--   5. DROP POLICY "Participantes pueden ver sus contratos" ON public.rental_contracts;
--   6. DROP FUNCTION public.start_contract(uuid, uuid, uuid, decimal, decimal, integer, date);
--   7. DROP TRIGGER update_rental_contract_updated_at_trigger ON public.rental_contracts;
--   8. DROP FUNCTION public.update_rental_contract_updated_at();
--   9. DROP TABLE IF EXISTS public.rental_contracts CASCADE;
-- ============================================
