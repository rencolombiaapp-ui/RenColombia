-- ============================================
-- Migración: Sistema de Verificación KYC (Know Your Customer)
-- ============================================
-- Crea la tabla y funciones para verificación de identidad simulada
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVOS:
-- 1. Crear tabla kyc_verifications
-- 2. Crear funciones RPC para iniciar y completar verificaciones (mock)
-- 3. Implementar RLS policies para acceso seguro
--
-- IMPORTANTE:
-- - Verificación es SIMULADA (mock) - no hay OCR ni IA
-- - Solo usuarios PRO pueden iniciar verificaciones
-- ============================================

-- ============================================
-- 1. CREAR TABLA kyc_verifications
-- ============================================

CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo de verificación
  verification_type text NOT NULL 
    CHECK (verification_type IN ('person', 'company', 'property')),
  
  -- Estado de verificación
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  
  -- Datos de verificación (persona natural)
  document_type text CHECK (document_type IN ('cc', 'ce', 'passport', 'nit')),
  document_number text,
  document_front_url text, -- URL en storage
  document_back_url text, -- URL en storage (si aplica)
  selfie_url text, -- Selfie con documento (para persona natural)
  
  -- Datos de verificación (empresa/inmobiliaria)
  company_name text,
  company_nit text,
  company_document_url text, -- Cámara de comercio
  
  -- Datos de verificación (inmueble)
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  property_document_type text CHECK (property_document_type IN ('escritura', 'certificado', 'otro')),
  property_document_url text,
  
  -- Metadatos de verificación
  verified_at timestamp with time zone,
  verified_by text CHECK (verified_by IN ('system', 'manual', 'third_party')),
  rejection_reason text, -- Razón si fue rechazada
  expires_at timestamp with time zone, -- Expiración de verificación (ej: 1 año)
  
  -- Metadatos
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Comentarios de documentación
COMMENT ON TABLE public.kyc_verifications IS 
  'Almacena las verificaciones de identidad (KYC) de usuarios. Soporta personas naturales, empresas e inmuebles.';

COMMENT ON COLUMN public.kyc_verifications.verification_type IS 
  'Tipo de verificación: person (persona natural), company (empresa/inmobiliaria), property (inmueble)';

COMMENT ON COLUMN public.kyc_verifications.status IS 
  'Estado de verificación: pending (pendiente), verified (verificado), rejected (rechazado), expired (expirado)';

COMMENT ON COLUMN public.kyc_verifications.verified_by IS 
  'Quién verificó: system (automático/mock), manual (revisión manual), third_party (servicio externo)';

-- ============================================
-- 2. CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS kyc_verifications_user_idx 
  ON public.kyc_verifications(user_id);

CREATE INDEX IF NOT EXISTS kyc_verifications_status_idx 
  ON public.kyc_verifications(status);

CREATE INDEX IF NOT EXISTS kyc_verifications_type_idx 
  ON public.kyc_verifications(verification_type);

CREATE INDEX IF NOT EXISTS kyc_verifications_expires_idx 
  ON public.kyc_verifications(expires_at) 
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS kyc_verifications_property_idx 
  ON public.kyc_verifications(property_id) 
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS kyc_verifications_user_type_status_idx 
  ON public.kyc_verifications(user_id, verification_type, status);

-- Índice único parcial: Un usuario solo puede tener una verificación activa por tipo
CREATE UNIQUE INDEX IF NOT EXISTS kyc_verifications_user_type_verified_unique_idx 
  ON public.kyc_verifications(user_id, verification_type) 
  WHERE status = 'verified';

-- ============================================
-- 3. CREAR FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_kyc_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_kyc_verification_updated_at() IS 
  'Trigger function que actualiza updated_at automáticamente en kyc_verifications';

CREATE TRIGGER update_kyc_verification_updated_at_trigger
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kyc_verification_updated_at();

-- ============================================
-- 4. CREAR FUNCIÓN RPC: start_verification
-- ============================================
-- Inicia una nueva verificación KYC (mock)
-- Solo usuarios PRO pueden iniciar verificaciones

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
    NULL, -- verified_by se establece cuando se completa
    CASE 
      WHEN p_verification_type = 'property' THEN now() + INTERVAL '1 year'
      ELSE now() + INTERVAL '1 year'
    END -- expires_at: 1 año desde ahora
  )
  RETURNING id INTO v_verification_id;
  
  RETURN v_verification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.start_verification IS 
  'Inicia una nueva verificación KYC. Solo usuarios PRO pueden iniciar verificaciones. Retorna el ID de la verificación creada.';

-- ============================================
-- 5. CREAR FUNCIÓN RPC: complete_verification
-- ============================================
-- Completa una verificación KYC (mock - siempre aprueba)
-- Solo usuarios PRO pueden completar verificaciones

CREATE OR REPLACE FUNCTION public.complete_verification(
  p_verification_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_verification_record public.kyc_verifications%ROWTYPE;
  v_has_pro_plan boolean;
  v_result jsonb;
BEGIN
  -- Obtener la verificación
  SELECT * INTO v_verification_record
  FROM public.kyc_verifications
  WHERE id = p_verification_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verificación no encontrada';
  END IF;
  
  -- Verificar que el usuario tenga plan PRO activo
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    INNER JOIN public.plans p ON p.id = s.plan_id
    WHERE s.user_id = v_verification_record.user_id
    AND s.status = 'active'
    AND (p.id LIKE '%_pro' OR p.id = 'tenant_pro' OR p.id = 'landlord_pro' OR p.id = 'inmobiliaria_pro')
  ) INTO v_has_pro_plan;
  
  IF NOT v_has_pro_plan THEN
    RAISE EXCEPTION 'El usuario debe tener un plan PRO activo para completar verificaciones KYC';
  END IF;
  
  -- Validar que el usuario sea el autenticado
  IF v_verification_record.user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado: solo puedes completar tus propias verificaciones';
  END IF;
  
  -- Validar que la verificación esté en estado pending
  IF v_verification_record.status != 'pending' THEN
    RAISE EXCEPTION 'La verificación debe estar en estado pending para ser completada. Estado actual: %', v_verification_record.status;
  END IF;
  
  -- MOCK: Simular verificación exitosa
  -- En producción real, aquí iría la lógica de OCR, IA, etc.
  -- Por ahora, siempre aprueba después de validar que hay documentos
  
  -- Validar que haya documentos según el tipo
  IF v_verification_record.verification_type = 'person' THEN
    IF v_verification_record.document_front_url IS NULL OR v_verification_record.selfie_url IS NULL THEN
      RAISE EXCEPTION 'Para verificación de persona se requiere document_front_url y selfie_url';
    END IF;
  ELSIF v_verification_record.verification_type = 'company' THEN
    IF v_verification_record.company_document_url IS NULL OR v_verification_record.company_nit IS NULL THEN
      RAISE EXCEPTION 'Para verificación de empresa se requiere company_document_url y company_nit';
    END IF;
  ELSIF v_verification_record.verification_type = 'property' THEN
    IF v_verification_record.property_document_url IS NULL OR v_verification_record.property_id IS NULL THEN
      RAISE EXCEPTION 'Para verificación de inmueble se requiere property_document_url y property_id';
    END IF;
  END IF;
  
  -- Actualizar verificación a verified (MOCK: siempre aprueba)
  UPDATE public.kyc_verifications
  SET 
    status = 'verified',
    verified_at = now(),
    verified_by = 'system', -- Mock: sistema simula aprobación
    updated_at = now()
  WHERE id = p_verification_id;
  
  -- Obtener la verificación actualizada
  SELECT * INTO v_verification_record
  FROM public.kyc_verifications
  WHERE id = p_verification_id;
  
  -- Construir resultado JSON
  v_result := jsonb_build_object(
    'id', v_verification_record.id,
    'user_id', v_verification_record.user_id,
    'verification_type', v_verification_record.verification_type,
    'status', v_verification_record.status,
    'verified_at', v_verification_record.verified_at,
    'verified_by', v_verification_record.verified_by,
    'expires_at', v_verification_record.expires_at,
    'created_at', v_verification_record.created_at,
    'updated_at', v_verification_record.updated_at
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.complete_verification IS 
  'Completa una verificación KYC (mock - siempre aprueba si hay documentos). Solo usuarios PRO pueden completar verificaciones. Retorna el registro actualizado como JSON.';

-- ============================================
-- 6. CREAR FUNCIÓN AUXILIAR: get_user_kyc_status
-- ============================================
-- Obtiene el estado de verificación KYC de un usuario por tipo

CREATE OR REPLACE FUNCTION public.get_user_kyc_status(
  p_user_id uuid,
  p_verification_type text
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'verification_type', verification_type,
    'status', status,
    'verified_at', verified_at,
    'expires_at', expires_at,
    'rejection_reason', rejection_reason,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result
  FROM public.kyc_verifications
  WHERE user_id = p_user_id
  AND verification_type = p_verification_type
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_result, 'null'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_kyc_status IS 
  'Obtiene el estado de verificación KYC más reciente de un usuario por tipo. Retorna null si no existe.';

-- ============================================
-- 7. CREAR RLS POLICIES
-- ============================================

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios pueden ver sus propias verificaciones
CREATE POLICY "Usuarios pueden ver sus propias verificaciones"
  ON public.kyc_verifications FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Propietarios pueden ver verificaciones de sus inmuebles
CREATE POLICY "Propietarios pueden ver verificaciones de sus inmuebles"
  ON public.kyc_verifications FOR SELECT
  USING (
    verification_type = 'property'
    AND property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Policy: Usuarios pueden crear sus propias verificaciones (solo PRO, validado en RPC)
CREATE POLICY "Usuarios pueden crear sus propias verificaciones"
  ON public.kyc_verifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Usuarios pueden actualizar sus propias verificaciones pendientes
CREATE POLICY "Usuarios pueden actualizar sus propias verificaciones pendientes"
  ON public.kyc_verifications FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- Policy: Usuarios pueden eliminar sus propias verificaciones pendientes o rechazadas
CREATE POLICY "Usuarios pueden eliminar sus propias verificaciones pendientes o rechazadas"
  ON public.kyc_verifications FOR DELETE
  USING (
    user_id = auth.uid() 
    AND status IN ('pending', 'rejected')
  );

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. DROP POLICY "Usuarios pueden eliminar sus propias verificaciones pendientes o rechazadas" ON public.kyc_verifications;
--   2. DROP POLICY "Usuarios pueden actualizar sus propias verificaciones pendientes" ON public.kyc_verifications;
--   3. DROP POLICY "Usuarios pueden crear sus propias verificaciones" ON public.kyc_verifications;
--   4. DROP POLICY "Propietarios pueden ver verificaciones de sus inmuebles" ON public.kyc_verifications;
--   5. DROP POLICY "Usuarios pueden ver sus propias verificaciones" ON public.kyc_verifications;
--   6. DROP FUNCTION IF EXISTS public.get_user_kyc_status(uuid, text);
--   7. DROP FUNCTION IF EXISTS public.complete_verification(uuid);
--   8. DROP FUNCTION IF EXISTS public.start_verification(uuid, text, text, text, text, text, text, text, text, text, uuid, text, text);
--   9. DROP TRIGGER update_kyc_verification_updated_at_trigger ON public.kyc_verifications;
--  10. DROP FUNCTION IF EXISTS public.update_kyc_verification_updated_at();
--  11. DROP TABLE IF EXISTS public.kyc_verifications CASCADE;
-- ============================================
