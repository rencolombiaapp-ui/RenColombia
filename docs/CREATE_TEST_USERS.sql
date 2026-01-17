-- ============================================
-- Scripts SQL para crear usuarios de prueba en Supabase
-- RenColombia - Base de datos
-- ============================================
-- 
-- IMPORTANTE:
-- 1. Este script debe ejecutarse desde Supabase SQL Editor
-- 2. Los usuarios se crearán con contraseña: "Test123456!"
-- 3. Los emails estarán confirmados automáticamente
-- 4. El trigger handle_new_user() creará automáticamente el perfil
-- 5. Luego actualizamos el perfil con el role correcto y creamos la suscripción
--
-- REQUISITOS:
-- - Extensión pgcrypto debe estar habilitada (normalmente ya lo está en Supabase)
-- - Permisos para insertar en auth.users (requiere rol service_role o admin)
--
-- ============================================

-- Verificar/crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================

-- ============================================
-- CREAR USUARIO INQUILINO DE PRUEBA
-- ============================================

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'inquilino.test@rencolombia.com';
  v_password text := 'Test123456!';
  v_full_name text := 'Juan Pérez Inquilino';
  v_encrypted_password text;
BEGIN
  -- Generar UUID único para el usuario
  v_user_id := gen_random_uuid();
  
  -- Encriptar contraseña usando bcrypt (Supabase usa bcrypt con factor 10)
  -- NOTA: Supabase usa su propio sistema de hash, pero para pruebas podemos usar crypt
  -- En producción, es mejor usar la API de Supabase Admin
  v_encrypted_password := crypt(v_password, gen_salt('bf', 10));
  
  -- Paso 1: Crear usuario en auth.users
  -- El trigger handle_new_user() creará automáticamente el perfil
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
    '00000000-0000-0000-0000-000000000000', -- instance_id (valor por defecto de Supabase)
    v_user_id, -- UUID generado
    'authenticated', -- aud (audience)
    'authenticated', -- role
    v_email, -- email
    v_encrypted_password, -- encrypted_password (bcrypt)
    now(), -- email_confirmed_at (confirmado inmediatamente)
    now(), -- recovery_sent_at
    now(), -- last_sign_in_at
    '{"provider":"email","providers":["email"]}'::jsonb, -- raw_app_meta_data
    jsonb_build_object('full_name', v_full_name), -- raw_user_meta_data (para el trigger)
    now(), -- created_at
    now(), -- updated_at
    '', -- confirmation_token
    '', -- email_change
    '', -- email_change_token_new
    '' -- recovery_token
  );

  -- Paso 2: Actualizar el perfil creado automáticamente por el trigger
  -- Cambiar role a 'tenant' y mantener publisher_type como NULL (para que aparezca "Seleccionar")
  UPDATE public.profiles
  SET 
    role = 'tenant',
    full_name = v_full_name,
    publisher_type = NULL  -- NULL para que aparezca "Seleccionar" por defecto
  WHERE id = v_user_id;

  -- Paso 3: Crear suscripción al plan Free de inquilino
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    started_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'tenant_free', -- Plan Free para inquilinos
    'active',
    now(),
    now(),
    now()
  )
  ON CONFLICT DO NOTHING; -- Evitar duplicados si se ejecuta dos veces

  RAISE NOTICE 'Usuario INQUILINO creado exitosamente:';
  RAISE NOTICE '  ID: %', v_user_id;
  RAISE NOTICE '  Email: %', v_email;
  RAISE NOTICE '  Password: %', v_password;
  RAISE NOTICE '  Role: tenant';
  RAISE NOTICE '  Plan: tenant_free';

END $$;

-- ============================================
-- CREAR USUARIO INMOBILIARIA DE PRUEBA
-- ============================================

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'inmobiliaria.test@rencolombia.com';
  v_password text := 'Test123456!';
  v_full_name text := 'María García';
  v_company_name text := 'Inmobiliaria Test S.A.S.';
  v_phone text := '+57 300 123 4567';
  v_encrypted_password text;
BEGIN
  -- Generar UUID único para el usuario
  v_user_id := gen_random_uuid();
  
  -- Encriptar contraseña usando bcrypt (Supabase usa bcrypt con factor 10)
  v_encrypted_password := crypt(v_password, gen_salt('bf', 10));
  
  -- Paso 1: Crear usuario en auth.users
  -- El trigger handle_new_user() creará automáticamente el perfil
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
    '00000000-0000-0000-0000-000000000000', -- instance_id (valor por defecto de Supabase)
    v_user_id, -- UUID generado
    'authenticated', -- aud (audience)
    'authenticated', -- role
    v_email, -- email
    v_encrypted_password, -- encrypted_password (bcrypt)
    now(), -- email_confirmed_at (confirmado inmediatamente)
    now(), -- recovery_sent_at
    now(), -- last_sign_in_at
    '{"provider":"email","providers":["email"]}'::jsonb, -- raw_app_meta_data
    jsonb_build_object('full_name', v_full_name), -- raw_user_meta_data (para el trigger)
    now(), -- created_at
    now(), -- updated_at
    '', -- confirmation_token
    '', -- email_change
    '', -- email_change_token_new
    '' -- recovery_token
  );

  -- Paso 2: Actualizar el perfil creado automáticamente por el trigger
  -- Cambiar role a 'landlord' y publisher_type a 'inmobiliaria'
  UPDATE public.profiles
  SET 
    role = 'landlord', -- Las inmobiliarias tienen role 'landlord'
    publisher_type = 'inmobiliaria', -- Tipo de publicador
    company_name = v_company_name, -- Nombre de la empresa
    full_name = v_full_name,
    phone = v_phone
  WHERE id = v_user_id;

  -- Paso 3: Crear suscripción al plan Free de inmobiliaria
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    started_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'inmobiliaria_free', -- Plan Free para inmobiliarias
    'active',
    now(),
    now(),
    now()
  )
  ON CONFLICT DO NOTHING; -- Evitar duplicados si se ejecuta dos veces

  RAISE NOTICE 'Usuario INMOBILIARIA creado exitosamente:';
  RAISE NOTICE '  ID: %', v_user_id;
  RAISE NOTICE '  Email: %', v_email;
  RAISE NOTICE '  Password: %', v_password;
  RAISE NOTICE '  Role: landlord';
  RAISE NOTICE '  Publisher Type: inmobiliaria';
  RAISE NOTICE '  Company Name: %', v_company_name;
  RAISE NOTICE '  Plan: inmobiliaria_free';

END $$;

-- ============================================
-- VERIFICAR USUARIOS CREADOS
-- ============================================

-- Verificar usuarios en auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN (
  'inquilino.test@rencolombia.com',
  'inmobiliaria.test@rencolombia.com'
)
ORDER BY created_at DESC;

-- Verificar perfiles creados
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.publisher_type,
  p.company_name,
  p.phone,
  p.created_at
FROM public.profiles p
WHERE p.email IN (
  'inquilino.test@rencolombia.com',
  'inmobiliaria.test@rencolombia.com'
)
ORDER BY p.created_at DESC;

-- Verificar suscripciones creadas
SELECT 
  s.id,
  s.user_id,
  p.email,
  s.plan_id,
  pl.name as plan_name,
  s.status,
  s.started_at
FROM public.subscriptions s
JOIN public.profiles p ON s.user_id = p.id
JOIN public.plans pl ON s.plan_id = pl.id
WHERE p.email IN (
  'inquilino.test@rencolombia.com',
  'inmobiliaria.test@rencolombia.com'
)
ORDER BY s.created_at DESC;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
--
-- 1. CONTRASEÑA: Todos los usuarios de prueba tienen la contraseña "Test123456!"
-- 2. EMAIL CONFIRMADO: Los emails están confirmados automáticamente (email_confirmed_at = now())
-- 3. TRIGGER AUTOMÁTICO: El trigger handle_new_user() crea automáticamente el perfil
-- 4. RLS: Las políticas RLS permiten que los usuarios vean y editen sus propios perfiles
-- 5. SUSCRIPCIONES: Se crean automáticamente con status 'active' y plan Free correspondiente
-- 6. INMOBILIARIA: Tiene role='landlord' y publisher_type='inmobiliaria'
-- 7. INQUILINO: Tiene role='tenant' y publisher_type='individual' (default)
--
-- IMPORTANTE SOBRE CONTRASEÑAS:
-- Supabase usa su propio sistema de hash de contraseñas. Este script usa crypt() de pgcrypto
-- que debería funcionar, pero si encuentras problemas al iniciar sesión, considera usar
-- la API de Supabase Admin para crear usuarios de prueba:
--
-- ALTERNATIVA (usando Supabase Admin API desde el código):
-- const { data, error } = await supabase.auth.admin.createUser({
--   email: 'inquilino.test@rencolombia.com',
--   password: 'Test123456!',
--   email_confirm: true,
--   user_metadata: { full_name: 'Juan Pérez Inquilino' }
-- });
--
-- Luego actualizar el perfil y crear la suscripción manualmente.
--
-- ============================================
-- ELIMINAR USUARIOS DE PRUEBA (si es necesario)
-- ============================================
--
-- DELETE FROM auth.users 
-- WHERE email IN (
--   'inquilino.test@rencolombia.com',
--   'inmobiliaria.test@rencolombia.com'
-- );
-- 
-- NOTA: Al eliminar de auth.users, se eliminarán automáticamente:
-- - El perfil en public.profiles (CASCADE)
-- - Las suscripciones en public.subscriptions (CASCADE)
-- - Todas las relaciones dependientes
--
-- ============================================
