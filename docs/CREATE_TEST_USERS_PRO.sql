-- ============================================
-- Script SQL para crear usuarios de prueba en Supabase Auth
-- RenColombia MVP - Usuarios FREE y PRO
-- ============================================
-- 
-- ⚠️  IMPORTANTE - PERMISOS REQUERIDOS:
-- Este script inserta directamente en auth.users, lo cual requiere:
-- 1. Permisos de superusuario en Supabase, O
-- 2. Usar la API REST de Supabase Auth en su lugar
-- 
-- Si no tienes permisos de superusuario:
-- - Usa la API REST de Supabase: POST /auth/v1/admin/users
-- - O ejecuta este script desde el SQL Editor con permisos adecuados
-- 
-- CARACTERÍSTICAS:
-- ✅ Idempotente: se puede ejecutar múltiples veces sin riesgo
-- ✅ No borra usuarios existentes
-- ✅ No duplica usuarios si el email ya existe
-- ✅ Crea usuario en auth.users, perfil en profiles y suscripción
-- ✅ Verifica existencia antes de crear
-- ✅ Actualiza perfiles y suscripciones si el usuario ya existe
-- 
-- USUARIOS CREADOS:
-- - 12 usuarios FREE (4 inquilinos, 4 propietarios, 4 inmobiliarias)
-- - 12 usuarios PRO (4 inquilinos PRO, 4 propietarios PRO, 4 inmobiliarias PRO)
-- Total: 24 usuarios de prueba
-- 
-- USO:
-- 1. Copiar y pegar este script completo en Supabase SQL Editor
-- 2. Ejecutar el script
-- 3. Verificar los mensajes de salida (NOTICE)
-- 4. Revisar la consulta de verificación al final
-- 
-- CONTRASEÑAS:
-- Todas las contraseñas son: Test123456! (o test123456! según el usuario)
-- ============================================

DO $$
DECLARE
  -- Variables para procesar usuarios
  user_data TEXT[];
  new_user_id UUID;
  profile_exists BOOLEAN;
  user_exists BOOLEAN;
  user_email TEXT;
  user_password TEXT;
  user_full_name TEXT;
  user_role TEXT;
  user_publisher_type TEXT;
  user_plan_id TEXT;
  
  -- Array de usuarios a crear
  test_users TEXT[][] := ARRAY[
    -- 🟢 USUARIOS FREE - INQUILINOS
    ['tiloinquilino@test.com', 'Test123456!', 'Tilo Inquilino', 'tenant', NULL, 'tenant_free'],
    ['yaoinquilino@test.com', 'test123456!', 'Yao Inquilino', 'tenant', NULL, 'tenant_free'],
    ['jenrryinquilino@test.com', 'test123456!', 'Jenrry Inquilino', 'tenant', NULL, 'tenant_free'],
    ['omarinquilino@test.com', 'Test123456!', 'Omar Inquilino', 'tenant', NULL, 'tenant_free'],
    
    -- 🟢 USUARIOS FREE - PROPIETARIOS
    ['tilopropietario@test.com', 'Test123456!', 'Tilo Propietario', 'landlord', 'individual', 'landlord_free'],
    ['yaopropietario@test.com', 'Test123456!', 'Yao Propietario', 'landlord', 'individual', 'landlord_free'],
    ['jenrrypropietario@test.com', 'Test123456!', 'Jenrry Propietario', 'landlord', 'individual', 'landlord_free'],
    ['omarpropietario@test.com', 'Test123456!', 'Omar Propietario', 'landlord', 'individual', 'landlord_free'],
    
    -- 🟢 USUARIOS FREE - INMOBILIARIAS
    ['inmobiliariatilo@test.com', 'Test123456!', 'Inmobiliaria Tilo', 'landlord', 'inmobiliaria', 'inmobiliaria_free'],
    ['inmobiliariayao@test.com', 'Test123456!', 'Inmobiliaria Yao', 'landlord', 'inmobiliaria', 'inmobiliaria_free'],
    ['inmobiliariajenrry@test.com', 'Test123456!', 'Inmobiliaria Jenrry', 'landlord', 'inmobiliaria', 'inmobiliaria_free'],
    ['inmobiliariaomar@test.com', 'Test123456!', 'Inmobiliaria Omar', 'landlord', 'inmobiliaria', 'inmobiliaria_free'],
    
    -- 🔵 USUARIOS PRO - INQUILINOS PRO
    ['tiloinquilinoPro@test.com', 'Test123456!', 'Tilo Inquilino PRO', 'tenant', NULL, 'tenant_pro'],
    ['yaoinquilinoPro@test.com', 'test123456!', 'Yao Inquilino PRO', 'tenant', NULL, 'tenant_pro'],
    ['jenrryinquilinoPro@test.com', 'test123456!', 'Jenrry Inquilino PRO', 'tenant', NULL, 'tenant_pro'],
    ['omarinquilinoPro@test.com', 'Test123456!', 'Omar Inquilino PRO', 'tenant', NULL, 'tenant_pro'],
    
    -- 🔵 USUARIOS PRO - PROPIETARIOS PRO
    ['tilopropietarioPro@test.com', 'Test123456!', 'Tilo Propietario PRO', 'landlord', 'individual', 'landlord_pro'],
    ['yaopropietarioPro@test.com', 'Test123456!', 'Yao Propietario PRO', 'landlord', 'individual', 'landlord_pro'],
    ['jenrrypropietarioPro@test.com', 'Test123456!', 'Jenrry Propietario PRO', 'landlord', 'individual', 'landlord_pro'],
    ['omarpropietarioPro@test.com', 'Test123456!', 'Omar Propietario PRO', 'landlord', 'individual', 'landlord_pro'],
    
    -- 🔵 USUARIOS PRO - INMOBILIARIAS PRO
    ['inmobiliariatiloPro@test.com', 'Test123456!', 'Inmobiliaria Tilo PRO', 'landlord', 'inmobiliaria', 'inmobiliaria_pro'],
    ['inmobiliariaYaoPro@test.com', 'Test123456!', 'Inmobiliaria Yao PRO', 'landlord', 'inmobiliaria', 'inmobiliaria_pro'],
    ['inmobiliariajenrryPro@test.com', 'Test123456!', 'Inmobiliaria Jenrry PRO', 'landlord', 'inmobiliaria', 'inmobiliaria_pro'],
    ['inmobiliariaomarPro@test.com', 'Test123456!', 'Inmobiliaria Omar PRO', 'landlord', 'inmobiliaria', 'inmobiliaria_pro']
  ];
  
  users_created INTEGER := 0;
  users_skipped INTEGER := 0;
  profiles_updated INTEGER := 0;
  subscriptions_created INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Iniciando creación de usuarios de prueba';
  RAISE NOTICE '========================================';
  
  -- Iterar sobre cada usuario
  FOREACH user_data SLICE 1 IN ARRAY test_users
  LOOP
    BEGIN
      -- Extraer datos del array (manejar NULLs)
      user_email := COALESCE(user_data[1], '');
      user_password := COALESCE(user_data[2], '');
      user_full_name := COALESCE(user_data[3], '');
      user_role := COALESCE(user_data[4], 'tenant');
      user_publisher_type := NULLIF(user_data[5], '');
      user_plan_id := COALESCE(user_data[6], 'tenant_free');
      -- Verificar si el usuario ya existe en auth.users
      SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE email = user_email
      ) INTO user_exists;
      
      IF user_exists THEN
        -- Usuario ya existe, verificar y actualizar perfil si es necesario
        RAISE NOTICE '⚠️  Usuario ya existe: %', user_email;
        
        -- Obtener el ID del usuario existente
        SELECT id INTO new_user_id FROM auth.users WHERE email = user_email LIMIT 1;
        
        -- Verificar si el perfil existe
        SELECT EXISTS (
          SELECT 1 FROM public.profiles WHERE id = new_user_id
        ) INTO profile_exists;
        
        IF profile_exists THEN
          -- Actualizar perfil con los valores correctos
          UPDATE public.profiles
          SET 
            role = user_role,
            publisher_type = CASE 
              WHEN user_publisher_type IS NOT NULL THEN user_publisher_type::text
              ELSE publisher_type
            END,
            full_name = COALESCE(full_name, user_full_name)
          WHERE id = new_user_id
          AND (role != user_role OR publisher_type IS DISTINCT FROM user_publisher_type);
          
          IF FOUND THEN
            profiles_updated := profiles_updated + 1;
            RAISE NOTICE '   ✓ Perfil actualizado';
          END IF;
        ELSE
          -- Crear perfil si no existe (por si acaso)
          INSERT INTO public.profiles (id, email, full_name, role, publisher_type)
          VALUES (new_user_id, user_email, user_full_name, user_role, user_publisher_type)
          ON CONFLICT (id) DO NOTHING;
          
          IF FOUND THEN
            RAISE NOTICE '   ✓ Perfil creado';
          END IF;
        END IF;
        
        -- Verificar y crear suscripción si no existe
        IF NOT EXISTS (
          SELECT 1 FROM public.subscriptions 
          WHERE user_id = new_user_id 
          AND plan_id = user_plan_id 
          AND status = 'active'
        ) THEN
          -- Cancelar suscripciones activas anteriores (solo puede haber una activa)
          UPDATE public.subscriptions
          SET status = 'canceled', canceled_at = NOW()
          WHERE user_id = new_user_id AND status = 'active';
          
          -- Crear nueva suscripción
          INSERT INTO public.subscriptions (user_id, plan_id, status, started_at)
          VALUES (new_user_id, user_plan_id, 'active', NOW())
          ON CONFLICT DO NOTHING;
          
          IF FOUND THEN
            subscriptions_created := subscriptions_created + 1;
            RAISE NOTICE '   ✓ Suscripción creada/actualizada';
          END IF;
        END IF;
        
        users_skipped := users_skipped + 1;
      ELSE
        -- Usuario NO existe, crear nuevo usuario
        RAISE NOTICE '➕ Creando nuevo usuario: %', user_email;
        
        -- Generar nuevo UUID para el usuario
        new_user_id := gen_random_uuid();
        
        -- Insertar usuario en auth.users
        -- NOTA: En Supabase, esto requiere permisos de superusuario o usar la API REST
        -- Este script asume que se ejecuta con permisos adecuados
        -- Si falla, usar la API REST de Supabase Auth en su lugar
        
        BEGIN
          -- Insertar usuario en auth.users
          -- Usar instance_id por defecto de Supabase
          INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role,
            aud
          ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000'::uuid, -- instance_id por defecto
            user_email,
            crypt(user_password, gen_salt('bf', 10)), -- Hash bcrypt con factor de costo 10
            NOW(), -- Email confirmado automáticamente
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', user_full_name),
            FALSE,
            'authenticated',
            'authenticated'
          );
        EXCEPTION
          WHEN insufficient_privilege THEN
            RAISE EXCEPTION 'No tienes permisos para crear usuarios directamente. Usa la API REST de Supabase Auth o ejecuta este script como superusuario.';
          WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al crear usuario %: %', user_email, SQLERRM;
        END;
        
        -- El trigger debería crear el perfil automáticamente, pero lo verificamos
        -- Esperar un momento para que el trigger se ejecute
        PERFORM pg_sleep(0.1);
        
        -- Verificar si el perfil fue creado por el trigger
        SELECT EXISTS (
          SELECT 1 FROM public.profiles WHERE id = new_user_id
        ) INTO profile_exists;
        
        IF NOT profile_exists THEN
          -- Si el trigger no funcionó, crear el perfil manualmente
          INSERT INTO public.profiles (id, email, full_name, role, publisher_type)
          VALUES (new_user_id, user_email, user_full_name, user_role, user_publisher_type)
          ON CONFLICT (id) DO UPDATE SET
            role = EXCLUDED.role,
            publisher_type = EXCLUDED.publisher_type,
            full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);
        ELSE
          -- Actualizar el perfil creado por el trigger con los valores correctos
          UPDATE public.profiles
          SET 
            role = user_role,
            publisher_type = user_publisher_type,
            full_name = user_full_name
          WHERE id = new_user_id;
        END IF;
        
        -- Crear suscripción para el plan
        INSERT INTO public.subscriptions (user_id, plan_id, status, started_at)
        VALUES (new_user_id, user_plan_id, 'active', NOW())
        ON CONFLICT DO NOTHING;
        
        users_created := users_created + 1;
        subscriptions_created := subscriptions_created + 1;
        RAISE NOTICE '   ✓ Usuario creado con éxito';
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error procesando usuario %: %', user_email, SQLERRM;
        -- Continuar con el siguiente usuario
    END;
  END LOOP;
  
  -- Resumen final
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Resumen de ejecución:';
  RAISE NOTICE '  Usuarios creados: %', users_created;
  RAISE NOTICE '  Usuarios existentes (saltados): %', users_skipped;
  RAISE NOTICE '  Perfiles actualizados: %', profiles_updated;
  RAISE NOTICE '  Suscripciones creadas/actualizadas: %', subscriptions_created;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Script completado exitosamente';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- VERIFICACIÓN: Mostrar usuarios creados
-- ============================================
-- Esta consulta muestra todos los usuarios de prueba creados
-- con sus perfiles y suscripciones asociadas

SELECT 
  u.email,
  p.full_name,
  p.role,
  p.publisher_type,
  s.plan_id,
  s.status as subscription_status,
  u.created_at as user_created_at,
  CASE 
    WHEN s.plan_id LIKE '%_pro' THEN 'PRO'
    ELSE 'FREE'
  END as plan_type
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.subscriptions s ON s.user_id = u.id AND s.status = 'active'
WHERE u.email LIKE '%@test.com'
ORDER BY 
  CASE 
    WHEN s.plan_id LIKE '%_pro' THEN 1
    ELSE 2
  END,
  p.role,
  u.email;

-- ============================================
-- RESUMEN POR TIPO DE USUARIO
-- ============================================
SELECT 
  p.role,
  p.publisher_type,
  COUNT(DISTINCT u.id) as total_usuarios,
  COUNT(DISTINCT CASE WHEN s.plan_id LIKE '%_pro' THEN u.id END) as usuarios_pro,
  COUNT(DISTINCT CASE WHEN s.plan_id NOT LIKE '%_pro' OR s.plan_id IS NULL THEN u.id END) as usuarios_free
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.subscriptions s ON s.user_id = u.id AND s.status = 'active'
WHERE u.email LIKE '%@test.com'
GROUP BY p.role, p.publisher_type
ORDER BY p.role, p.publisher_type;
