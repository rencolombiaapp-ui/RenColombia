-- ============================================
-- Script SQL para crear usuarios PRO de prueba
-- ============================================
-- Este script crea usuarios de prueba con planes PRO activos:
-- 1. Inquilino PRO
-- 2. Propietario PRO
-- 3. Inmobiliaria PRO
--
-- IMPORTANTE: Ejecutar después de crear los planes en la tabla 'plans'
-- ============================================

-- ============================================
-- 1. CREAR USUARIOS EN AUTH (Supabase Auth)
-- ============================================
-- Nota: Estos usuarios deben crearse manualmente en Supabase Auth Dashboard
-- o usando la API de Supabase Auth. Este script solo crea los perfiles y suscripciones.

-- ============================================
-- 2. CREAR PERFILES Y SUSCRIPCIONES
-- ============================================

-- Usuario 1: Inquilino PRO
-- Email: tenant.pro@test.com
-- Password: Test123456!
-- ID de usuario (reemplazar con el ID real del usuario creado en Auth):
DO $$
DECLARE
  v_tenant_pro_id uuid;
  v_tenant_profile_id uuid;
BEGIN
  -- Obtener el ID del usuario desde auth.users (ajustar email según corresponda)
  SELECT id INTO v_tenant_pro_id
  FROM auth.users
  WHERE email = 'tenant.pro@test.com'
  LIMIT 1;

  IF v_tenant_pro_id IS NULL THEN
    RAISE NOTICE 'Usuario tenant.pro@test.com no encontrado en auth.users. Por favor crea el usuario primero en Supabase Auth Dashboard.';
  ELSE
    -- Crear perfil de inquilino
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      publisher_type,
      created_at,
      updated_at
    ) VALUES (
      v_tenant_pro_id,
      'tenant.pro@test.com',
      'Inquilino PRO Test',
      'tenant',
      NULL,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Inquilino PRO Test',
      role = 'tenant',
      publisher_type = NULL,
      updated_at = NOW();

    -- Crear suscripción PRO para inquilino
    -- Primero cancelar cualquier suscripción activa existente
    UPDATE public.subscriptions
    SET status = 'canceled',
        canceled_at = NOW(),
        updated_at = NOW()
    WHERE user_id = v_tenant_pro_id
      AND status = 'active';

    -- Crear nueva suscripción PRO
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      started_at,
      expires_at,
      created_at,
      updated_at
    )
    SELECT
      v_tenant_pro_id,
      p.id,
      'active',
      NOW(),
      NOW() + INTERVAL '1 month',
      NOW(),
      NOW()
    FROM public.plans p
    WHERE p.id = 'tenant_pro'
    LIMIT 1;

    RAISE NOTICE 'Usuario Inquilino PRO creado/actualizado: %', v_tenant_pro_id;
  END IF;
END $$;

-- Usuario 2: Propietario PRO
-- Email: landlord.pro@test.com
-- Password: Test123456!
DO $$
DECLARE
  v_landlord_pro_id uuid;
BEGIN
  SELECT id INTO v_landlord_pro_id
  FROM auth.users
  WHERE email = 'landlord.pro@test.com'
  LIMIT 1;

  IF v_landlord_pro_id IS NULL THEN
    RAISE NOTICE 'Usuario landlord.pro@test.com no encontrado en auth.users. Por favor crea el usuario primero en Supabase Auth Dashboard.';
  ELSE
    -- Crear perfil de propietario
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      publisher_type,
      created_at,
      updated_at
    ) VALUES (
      v_landlord_pro_id,
      'landlord.pro@test.com',
      'Propietario PRO Test',
      'landlord',
      'individual',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Propietario PRO Test',
      role = 'landlord',
      publisher_type = 'individual',
      updated_at = NOW();

    -- Crear suscripción PRO para propietario
    -- Primero cancelar cualquier suscripción activa existente
    UPDATE public.subscriptions
    SET status = 'canceled',
        canceled_at = NOW(),
        updated_at = NOW()
    WHERE user_id = v_landlord_pro_id
      AND status = 'active';

    -- Crear nueva suscripción PRO
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      started_at,
      expires_at,
      created_at,
      updated_at
    )
    SELECT
      v_landlord_pro_id,
      p.id,
      'active',
      NOW(),
      NOW() + INTERVAL '1 month',
      NOW(),
      NOW()
    FROM public.plans p
    WHERE p.id = 'landlord_pro'
    LIMIT 1;

    RAISE NOTICE 'Usuario Propietario PRO creado/actualizado: %', v_landlord_pro_id;
  END IF;
END $$;

-- Usuario 3: Inmobiliaria PRO
-- Email: inmobiliaria.pro@test.com
-- Password: Test123456!
DO $$
DECLARE
  v_inmobiliaria_pro_id uuid;
BEGIN
  SELECT id INTO v_inmobiliaria_pro_id
  FROM auth.users
  WHERE email = 'inmobiliaria.pro@test.com'
  LIMIT 1;

  IF v_inmobiliaria_pro_id IS NULL THEN
    RAISE NOTICE 'Usuario inmobiliaria.pro@test.com no encontrado en auth.users. Por favor crea el usuario primero en Supabase Auth Dashboard.';
  ELSE
    -- Crear perfil de inmobiliaria
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      publisher_type,
      company_name,
      created_at,
      updated_at
    ) VALUES (
      v_inmobiliaria_pro_id,
      'inmobiliaria.pro@test.com',
      'Admin Inmobiliaria PRO',
      'landlord',
      'inmobiliaria',
      'Inmobiliaria PRO Test S.A.S.',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Admin Inmobiliaria PRO',
      role = 'landlord',
      publisher_type = 'inmobiliaria',
      company_name = 'Inmobiliaria PRO Test S.A.S.',
      updated_at = NOW();

    -- Crear suscripción PRO para inmobiliaria
    -- Primero cancelar cualquier suscripción activa existente
    UPDATE public.subscriptions
    SET status = 'canceled',
        canceled_at = NOW(),
        updated_at = NOW()
    WHERE user_id = v_inmobiliaria_pro_id
      AND status = 'active';

    -- Crear nueva suscripción PRO
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      started_at,
      expires_at,
      created_at,
      updated_at
    )
    SELECT
      v_inmobiliaria_pro_id,
      p.id,
      'active',
      NOW(),
      NOW() + INTERVAL '1 month',
      NOW(),
      NOW()
    FROM public.plans p
    WHERE p.id = 'inmobiliaria_pro'
    LIMIT 1;

    RAISE NOTICE 'Usuario Inmobiliaria PRO creado/actualizado: %', v_inmobiliaria_pro_id;
  END IF;
END $$;

-- ============================================
-- 3. VERIFICAR CREACIÓN
-- ============================================

-- Verificar usuarios creados
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.publisher_type,
  p.company_name,
  s.plan_id,
  s.status as subscription_status,
  s.started_at,
  s.expires_at
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
WHERE p.email IN (
  'tenant.pro@test.com',
  'landlord.pro@test.com',
  'inmobiliaria.pro@test.com'
)
ORDER BY p.email;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Antes de ejecutar este script, debes crear los usuarios en Supabase Auth Dashboard:
--    - Ve a Authentication > Users > Add User
--    - Crea los tres usuarios con los emails especificados
--    - Establece la contraseña: Test123456!
--    - Copia los IDs de usuario generados
--
-- 2. Si prefieres usar la API, puedes crear usuarios con:
--    supabase.auth.admin.createUser({
--      email: 'tenant.pro@test.com',
--      password: 'Test123456!',
--      email_confirm: true
--    })
--
-- 3. Asegúrate de que los planes existan en la tabla 'plans':
--    - tenant_pro
--    - landlord_pro
--    - inmobiliaria_pro
--
-- 4. Para verificar KYC, puedes crear verificaciones de prueba ejecutando:
--    INSERT INTO public.kyc_verifications (
--      user_id,
--      verification_type,
--      status,
--      verified_at,
--      verified_by
--    ) VALUES (
--      'USER_ID_AQUI',
--      'person',
--      'verified',
--      NOW(),
--      'system'
--    );
-- ============================================
