-- ============================================
-- Script: Actualizar usuarios nuevos para que sean iguales a los antiguos
-- ============================================
-- Este script NO elimina usuarios, solo los actualiza para que tengan
-- la misma estructura que los usuarios antiguos que funcionan
-- ============================================

DO $$
DECLARE
  user_email TEXT;
  user_id UUID;
  user_password TEXT;
  user_full_name TEXT;
  user_role TEXT;
  user_publisher_type TEXT;
  user_plan_id TEXT;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Actualizando usuarios problemáticos...';
  RAISE NOTICE '========================================';
  
  -- INQUILINOS FREE
  FOREACH user_email IN ARRAY ARRAY[
    'tiloinquilino@test.com',
    'yaoinquilino@test.com',
    'jenrryinquilino@test.com',
    'omarinquilino@test.com'
  ]
  LOOP
    BEGIN
      -- Obtener ID del usuario existente
      SELECT id INTO user_id FROM auth.users WHERE email = user_email;
      
      IF user_id IS NOT NULL THEN
        user_password := 'Test123456!';
        user_full_name := initcap(split_part(user_email, '@', 1)) || ' Inquilino';
        user_role := 'tenant';
        user_publisher_type := NULL;
        user_plan_id := 'tenant_free';
        
        -- Actualizar usuario en auth.users para que sea igual a los antiguos
        UPDATE auth.users SET
          email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
          raw_user_meta_data = jsonb_build_object('full_name', user_full_name),
          updated_at = NOW()
        WHERE id = user_id;
        
        -- Asegurar que el perfil existe y está correcto
        INSERT INTO public.profiles (id, email, full_name, role, publisher_type)
        VALUES (user_id, user_email, user_full_name, user_role, user_publisher_type)
        ON CONFLICT (id) DO UPDATE SET
          email = user_email,
          full_name = user_full_name,
          role = user_role,
          publisher_type = user_publisher_type;
        
        -- Asegurar que la suscripción existe
        INSERT INTO public.subscriptions (user_id, plan_id, status, started_at)
        VALUES (user_id, user_plan_id, 'active', NOW())
        ON CONFLICT (user_id, plan_id) DO UPDATE SET
          status = 'active',
          started_at = COALESCE(subscriptions.started_at, NOW());
        
        updated_count := updated_count + 1;
        RAISE NOTICE '✓ Actualizado: %', user_email;
      ELSE
        RAISE WARNING '⚠ No encontrado: %', user_email;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '✗ Error al actualizar %: %', user_email, SQLERRM;
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
      SELECT id INTO user_id FROM auth.users WHERE email = user_email;
      
      IF user_id IS NOT NULL THEN
        user_password := 'Test123456!';
        user_full_name := initcap(split_part(user_email, '@', 1)) || ' Propietario';
        user_role := 'landlord';
        user_publisher_type := 'individual';
        user_plan_id := 'landlord_free';
        
        UPDATE auth.users SET
          email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
          raw_user_meta_data = jsonb_build_object('full_name', user_full_name),
          updated_at = NOW()
        WHERE id = user_id;
        
        INSERT INTO public.profiles (id, email, full_name, role, publisher_type)
        VALUES (user_id, user_email, user_full_name, user_role, user_publisher_type)
        ON CONFLICT (id) DO UPDATE SET
          email = user_email,
          full_name = user_full_name,
          role = user_role,
          publisher_type = user_publisher_type;
        
        INSERT INTO public.subscriptions (user_id, plan_id, status, started_at)
        VALUES (user_id, user_plan_id, 'active', NOW())
        ON CONFLICT (user_id, plan_id) DO UPDATE SET
          status = 'active',
          started_at = COALESCE(subscriptions.started_at, NOW());
        
        updated_count := updated_count + 1;
        RAISE NOTICE '✓ Actualizado: %', user_email;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '✗ Error al actualizar %: %', user_email, SQLERRM;
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
      SELECT id INTO user_id FROM auth.users WHERE email = user_email;
      
      IF user_id IS NOT NULL THEN
        user_full_name := initcap(split_part(user_email, '@', 1));
        user_role := 'landlord';
        user_publisher_type := 'inmobiliaria';
        user_plan_id := 'inmobiliaria_free';
        
        UPDATE auth.users SET
          email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
          raw_user_meta_data = jsonb_build_object('full_name', user_full_name),
          updated_at = NOW()
        WHERE id = user_id;
        
        INSERT INTO public.profiles (id, email, full_name, role, publisher_type)
        VALUES (user_id, user_email, user_full_name, user_role, user_publisher_type)
        ON CONFLICT (id) DO UPDATE SET
          email = user_email,
          full_name = user_full_name,
          role = user_role,
          publisher_type = user_publisher_type;
        
        INSERT INTO public.subscriptions (user_id, plan_id, status, started_at)
        VALUES (user_id, user_plan_id, 'active', NOW())
        ON CONFLICT (user_id, plan_id) DO UPDATE SET
          status = 'active',
          started_at = COALESCE(subscriptions.started_at, NOW());
        
        updated_count := updated_count + 1;
        RAISE NOTICE '✓ Actualizado: %', user_email;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '✗ Error al actualizar %: %', user_email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total usuarios actualizados: %', updated_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Ahora prueba el login con tiloinquilino@test.com';
  RAISE NOTICE '========================================';
END $$;

-- Verificar que los usuarios están correctos
SELECT 
  'Verificación final' as check_type,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.role,
  p.publisher_type,
  s.plan_id,
  s.status as subscription_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.subscriptions s ON s.user_id = u.id AND s.status = 'active'
WHERE u.email IN (
  'tiloinquilino@test.com',
  'tilopropietario@test.com',
  'rencolombiaapp@gmail.com',
  'landlord.pro@test.com'
)
ORDER BY u.email;
