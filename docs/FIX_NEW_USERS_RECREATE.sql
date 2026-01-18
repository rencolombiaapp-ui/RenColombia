-- ============================================
-- Script: Recrear usuarios nuevos exactamente como los antiguos
-- ============================================
-- Este script elimina los usuarios nuevos problemáticos y los recrea
-- exactamente de la misma manera que los usuarios antiguos que funcionan
-- ============================================

DO $$
DECLARE
  -- Usuarios nuevos que NO funcionan (eliminar y recrear)
  problem_users TEXT[] := ARRAY[
    'tiloinquilino@test.com',
    'tilopropietario@test.com',
    'yaoinquilino@test.com',
    'yaopropietario@test.com',
    'jenrryinquilino@test.com',
    'jenrrypropietario@test.com',
    'omarinquilino@test.com',
    'omarpropietario@test.com',
    'inmobiliariatilo@test.com',
    'inmobiliariayao@test.com',
    'inmobiliariajenrry@test.com',
    'inmobiliariaomar@test.com',
    'tiloinquilinoPro@test.com',
    'tilopropietarioPro@test.com',
    'yaoinquilinoPro@test.com',
    'yaopropietarioPro@test.com',
    'jenrryinquilinoPro@test.com',
    'jenrrypropietarioPro@test.com',
    'omarinquilinoPro@test.com',
    'omarpropietarioPro@test.com',
    'inmobiliariatiloPro@test.com',
    'inmobiliariaYaoPro@test.com',
    'inmobiliariajenrryPro@test.com',
    'inmobiliariaomarPro@test.com'
  ];
  
  user_email TEXT;
  user_id UUID;
  user_password TEXT;
  user_full_name TEXT;
  user_role TEXT;
  user_publisher_type TEXT;
  user_plan_id TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Eliminando usuarios problemáticos...';
  RAISE NOTICE '========================================';
  
  -- Eliminar usuarios problemáticos (esto también eliminará sus perfiles por CASCADE)
  -- NOTA: Eliminar de auth.users requiere permisos especiales
  -- Si falla, los usuarios se recrearán de todas formas con ON CONFLICT
  FOREACH user_email IN ARRAY problem_users
  LOOP
    BEGIN
      -- Obtener el ID del usuario
      SELECT id INTO user_id FROM auth.users WHERE email = user_email;
      
      IF user_id IS NOT NULL THEN
        -- Eliminar suscripciones primero
        DELETE FROM public.subscriptions WHERE user_id = user_id;
        RAISE NOTICE '  ✓ Suscripciones eliminadas para: %', user_email;
        
        -- Eliminar perfil (si existe)
        DELETE FROM public.profiles WHERE id = user_id;
        RAISE NOTICE '  ✓ Perfil eliminado para: %', user_email;
        
        -- Intentar eliminar usuario de auth.users
        -- Esto puede fallar si no tienes permisos de superusuario
        BEGIN
          DELETE FROM auth.users WHERE id = user_id;
          RAISE NOTICE '✓ Usuario eliminado de auth.users: %', user_email;
        EXCEPTION
          WHEN insufficient_privilege THEN
            RAISE WARNING '⚠ No tienes permisos para eliminar de auth.users: %', user_email;
            RAISE NOTICE '  → El usuario se recreará de todas formas con ON CONFLICT';
          WHEN OTHERS THEN
            RAISE WARNING '✗ Error al eliminar de auth.users %: %', user_email, SQLERRM;
            RAISE NOTICE '  → El usuario se recreará de todas formas con ON CONFLICT';
        END;
      ELSE
        RAISE NOTICE '⚠ No encontrado: %', user_email;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '✗ Error general al procesar %: %', user_email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Recreando usuarios exactamente como los antiguos...';
  RAISE NOTICE '========================================';
  
  -- Recrear usuarios exactamente como los antiguos que funcionan
  -- Usar el mismo método que CREATE_TEST_USERS_PRO.sql pero con estructura idéntica
  
  -- INQUILINOS FREE
  FOREACH user_email IN ARRAY ARRAY[
    'tiloinquilino@test.com',
    'yaoinquilino@test.com',
    'jenrryinquilino@test.com',
    'omarinquilino@test.com'
  ]
  LOOP
    BEGIN
      user_id := gen_random_uuid();
      user_password := 'Test123456!';
      user_full_name := split_part(user_email, '@', 1) || ' Inquilino';
      user_role := 'tenant';
      user_publisher_type := NULL;
      user_plan_id := 'tenant_free';
      
      -- Crear usuario EXACTAMENTE como los antiguos
      -- Usar ON CONFLICT para evitar errores si el usuario ya existe
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
        user_id,
        'authenticated',
        'authenticated',
        user_email,
        crypt(user_password, gen_salt('bf', 10)),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', user_full_name),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      )
      ON CONFLICT (email) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = EXCLUDED.email_confirmed_at,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        updated_at = NOW();
      
      -- Esperar a que el trigger cree el perfil
      PERFORM pg_sleep(0.1);
      
      -- Actualizar perfil con valores correctos
      UPDATE public.profiles
      SET 
        role = user_role,
        publisher_type = user_publisher_type,
        full_name = user_full_name
      WHERE id = user_id;
      
      -- Crear suscripción
      INSERT INTO public.subscriptions (user_id, plan_id, status, started_at)
      VALUES (user_id, user_plan_id, 'active', NOW())
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE '✓ Creado: %', user_email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '✗ Error al crear %: %', user_email, SQLERRM;
    END;
  END LOOP;
  
  -- PROPIETARIOS FREE
  FOREACH user_email IN ARRAY ARRAY[
    'tilopropietario@test.com',
    'yaopropietario@test.com',
    'jenrrypropietario@test.com',
    'omarpropietario@test.com'
  ]
  LOOP
    BEGIN
      user_id := gen_random_uuid();
      user_password := 'Test123456!';
      user_full_name := split_part(user_email, '@', 1) || ' Propietario';
      user_role := 'landlord';
      user_publisher_type := 'individual';
      user_plan_id := 'landlord_free';
      
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
        user_id,
        'authenticated',
        'authenticated',
        user_email,
        crypt(user_password, gen_salt('bf', 10)),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', user_full_name),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      )
      ON CONFLICT (email) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = EXCLUDED.email_confirmed_at,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        updated_at = NOW();
      
      PERFORM pg_sleep(0.1);
      
      UPDATE public.profiles
      SET 
        role = user_role,
        publisher_type = user_publisher_type,
        full_name = user_full_name
      WHERE id = user_id;
      
      INSERT INTO public.subscriptions (user_id, plan_id, status, started_at)
      VALUES (user_id, user_plan_id, 'active', NOW())
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE '✓ Creado: %', user_email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '✗ Error al crear %: %', user_email, SQLERRM;
    END;
  END LOOP;
  
  -- INMOBILIARIAS FREE
  FOREACH user_email IN ARRAY ARRAY[
    'inmobiliariatilo@test.com',
    'inmobiliariayao@test.com',
    'inmobiliariajenrry@test.com',
    'inmobiliariaomar@test.com'
  ]
  LOOP
    BEGIN
      user_id := gen_random_uuid();
      user_password := 'Test123456!';
      user_full_name := split_part(user_email, '@', 1);
      user_role := 'landlord';
      user_publisher_type := 'inmobiliaria';
      user_plan_id := 'inmobiliaria_free';
      
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
        user_id,
        'authenticated',
        'authenticated',
        user_email,
        crypt(user_password, gen_salt('bf', 10)),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', user_full_name),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      )
      ON CONFLICT (email) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = EXCLUDED.email_confirmed_at,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        updated_at = NOW();
      
      PERFORM pg_sleep(0.1);
      
      UPDATE public.profiles
      SET 
        role = user_role,
        publisher_type = user_publisher_type,
        full_name = user_full_name
      WHERE id = user_id;
      
      INSERT INTO public.subscriptions (user_id, plan_id, status, started_at)
      VALUES (user_id, user_plan_id, 'active', NOW())
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE '✓ Creado: %', user_email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '✗ Error al crear %: %', user_email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuarios recreados. Prueba el login ahora.';
  RAISE NOTICE '========================================';
END $$;
