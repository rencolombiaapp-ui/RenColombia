-- ============================================
-- Script SQL para crear usuarios PRO de prueba
-- ============================================
-- Este script crea usuarios de prueba con planes PRO activos:
-- 1. Inquilino PRO
-- 2. Propietario PRO
-- 3. Inmobiliaria PRO
--
-- IMPORTANTE: 
-- - Requiere extensión pgcrypto habilitada
-- - Crea usuarios directamente en auth.users
-- - Crea automáticamente perfiles y suscripciones PRO
-- ============================================

-- Verificar/crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CREAR PLAN tenant_pro (si no existe)
-- ============================================
INSERT INTO public.plans (id, name, description, price_monthly, user_type, max_properties, includes_price_insights) 
VALUES (
  'tenant_pro', 
  'PRO', 
  'Plan premium para inquilinos - Acceso a contratación digital y funcionalidades avanzadas', 
  19900, 
  'tenant', 
  null, 
  true
)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  includes_price_insights = EXCLUDED.includes_price_insights;

-- ============================================
-- 2. CREAR USUARIOS EN AUTH Y PERFILES
-- ============================================

-- Usuario 1: Inquilino PRO
-- Email: tenant.pro@test.com
-- Password: Test123456!
DO $$
DECLARE
  v_tenant_pro_id uuid;
  v_email text := 'tenant.pro@test.com';
  v_password text := 'Test123456!';
  v_full_name text := 'Inquilino PRO Test';
  v_encrypted_password text;
BEGIN
  -- Verificar si el usuario ya existe
  SELECT id INTO v_tenant_pro_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_tenant_pro_id IS NULL THEN
    -- Generar UUID único para el usuario
    v_tenant_pro_id := gen_random_uuid();
    
    -- Encriptar contraseña usando bcrypt
    v_encrypted_password := crypt(v_password, gen_salt('bf', 10));
    
    -- Crear usuario en auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_tenant_pro_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_password,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Usuario tenant.pro@test.com creado en auth.users con ID: %', v_tenant_pro_id;
  ELSE
    RAISE NOTICE 'Usuario tenant.pro@test.com ya existe con ID: %', v_tenant_pro_id;
  END IF;

  -- Crear o actualizar perfil de inquilino
  IF v_tenant_pro_id IS NOT NULL THEN
    -- Crear perfil de inquilino
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      publisher_type,
      created_at
    ) VALUES (
      v_tenant_pro_id,
      'tenant.pro@test.com',
      'Inquilino PRO Test',
      'tenant',
      NULL,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Inquilino PRO Test',
      role = 'tenant',
      publisher_type = NULL;

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

    RAISE NOTICE 'Perfil y suscripción Inquilino PRO creados/actualizados para usuario: %', v_tenant_pro_id;
  END IF;
END $$;

-- Usuario 2: Propietario PRO
-- Email: landlord.pro@test.com
-- Password: Test123456!
DO $$
DECLARE
  v_landlord_pro_id uuid;
  v_email text := 'landlord.pro@test.com';
  v_password text := 'Test123456!';
  v_full_name text := 'Propietario PRO Test';
  v_encrypted_password text;
BEGIN
  -- Verificar si el usuario ya existe
  SELECT id INTO v_landlord_pro_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_landlord_pro_id IS NULL THEN
    -- Generar UUID único para el usuario
    v_landlord_pro_id := gen_random_uuid();
    
    -- Encriptar contraseña usando bcrypt
    v_encrypted_password := crypt(v_password, gen_salt('bf', 10));
    
    -- Crear usuario en auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_landlord_pro_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_password,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Usuario landlord.pro@test.com creado en auth.users con ID: %', v_landlord_pro_id;
  ELSE
    RAISE NOTICE 'Usuario landlord.pro@test.com ya existe con ID: %', v_landlord_pro_id;
  END IF;

  -- Crear o actualizar perfil de propietario
  IF v_landlord_pro_id IS NOT NULL THEN
    -- Crear perfil de propietario
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      publisher_type,
      created_at
    ) VALUES (
      v_landlord_pro_id,
      'landlord.pro@test.com',
      'Propietario PRO Test',
      'landlord',
      'individual',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Propietario PRO Test',
      role = 'landlord',
      publisher_type = 'individual';

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

    RAISE NOTICE 'Perfil y suscripción Propietario PRO creados/actualizados para usuario: %', v_landlord_pro_id;
  END IF;
END $$;

-- Usuario 3: Inmobiliaria PRO
-- Email: inmobiliaria.pro@test.com
-- Password: Test123456!
DO $$
DECLARE
  v_inmobiliaria_pro_id uuid;
  v_email text := 'inmobiliaria.pro@test.com';
  v_password text := 'Test123456!';
  v_full_name text := 'Admin Inmobiliaria PRO';
  v_company_name text := 'Inmobiliaria PRO Test S.A.S.';
  v_encrypted_password text;
BEGIN
  -- Verificar si el usuario ya existe
  SELECT id INTO v_inmobiliaria_pro_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_inmobiliaria_pro_id IS NULL THEN
    -- Generar UUID único para el usuario
    v_inmobiliaria_pro_id := gen_random_uuid();
    
    -- Encriptar contraseña usando bcrypt
    v_encrypted_password := crypt(v_password, gen_salt('bf', 10));
    
    -- Crear usuario en auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_inmobiliaria_pro_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_password,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Usuario inmobiliaria.pro@test.com creado en auth.users con ID: %', v_inmobiliaria_pro_id;
  ELSE
    RAISE NOTICE 'Usuario inmobiliaria.pro@test.com ya existe con ID: %', v_inmobiliaria_pro_id;
  END IF;

  -- Crear o actualizar perfil de inmobiliaria
  IF v_inmobiliaria_pro_id IS NOT NULL THEN
    -- Crear perfil de inmobiliaria
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      publisher_type,
      company_name,
      created_at
    ) VALUES (
      v_inmobiliaria_pro_id,
      'inmobiliaria.pro@test.com',
      'Admin Inmobiliaria PRO',
      'landlord',
      'inmobiliaria',
      'Inmobiliaria PRO Test S.A.S.',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Admin Inmobiliaria PRO',
      role = 'landlord',
      publisher_type = 'inmobiliaria',
      company_name = 'Inmobiliaria PRO Test S.A.S.';

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

    RAISE NOTICE 'Perfil y suscripción Inmobiliaria PRO creados/actualizados para usuario: %', v_inmobiliaria_pro_id;
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
-- 1. Este script crea automáticamente los usuarios en auth.users
--    No necesitas crearlos manualmente en Supabase Auth Dashboard
--
-- 2. Los usuarios se crean con:
--    - Email confirmado automáticamente
--    - Contraseña: Test123456!
--    - Perfiles creados automáticamente por el trigger handle_new_user()
--    - Suscripciones PRO activas creadas
--
-- 3. El script también crea el plan 'tenant_pro' si no existe
--
-- 4. Si los usuarios ya existen, el script los actualiza sin crear duplicados
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
