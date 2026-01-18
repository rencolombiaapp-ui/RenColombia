-- ============================================
-- Script de Prueba: Simular Proceso de Login
-- ============================================
-- Este script intenta simular lo que Supabase hace durante el login
-- para identificar exactamente dónde está fallando
-- ============================================

-- 1. Verificar que podemos consultar el schema básico
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRUEBA 1: Consultar schema básico';
  RAISE NOTICE '========================================';
  
  -- Intentar consultar profiles como lo haría Supabase
  PERFORM COUNT(*) FROM public.profiles;
  RAISE NOTICE '✓ Consulta básica de profiles funciona';
  
  -- Intentar consultar con auth.uid() (simulando un usuario autenticado)
  -- Nota: Esto puede fallar si no hay contexto de autenticación
  BEGIN
    PERFORM COUNT(*) FROM public.profiles WHERE id = auth.uid();
    RAISE NOTICE '✓ Consulta con auth.uid() funciona';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '⚠ Consulta con auth.uid() falló: %', SQLERRM;
  END;
END $$;

-- 2. Verificar usuarios específicos que están fallando
SELECT 
  'Usuarios que fallan' as test_type,
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.id IS NOT NULL as has_profile,
  p.role,
  p.publisher_type
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'tiloinquilino@test.com',
  'tilopropietario@test.com',
  'yaoinquilino@test.com',
  'yaopropietario@test.com'
)
ORDER BY u.email;

-- 3. Verificar usuarios que funcionan (para comparar)
SELECT 
  'Usuarios que funcionan' as test_type,
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.id IS NOT NULL as has_profile,
  p.role,
  p.publisher_type
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'rencolombiaapp@gmail.com',
  'inquilino.test@rencolombia.com',
  'landlord.pro@test.com'
)
ORDER BY u.email;

-- 4. Verificar diferencias en email_confirmed_at
SELECT 
  'Comparación email_confirmed_at' as test_type,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN 'NULL (no confirmado)'
    ELSE 'Confirmado'
  END as confirmation_status,
  COUNT(*) as count
FROM auth.users u
WHERE u.email IN (
  'tiloinquilino@test.com',
  'tilopropietario@test.com',
  'yaoinquilino@test.com',
  'yaopropietario@test.com',
  'rencolombiaapp@gmail.com',
  'inquilino.test@rencolombia.com',
  'landlord.pro@test.com'
)
GROUP BY 
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN 'NULL (no confirmado)'
    ELSE 'Confirmado'
  END;

-- 5. Verificar si hay problemas con el trigger durante la creación
-- Simular lo que pasaría si se crea un nuevo usuario
DO $$
DECLARE
  v_test_id UUID := gen_random_uuid();
  v_test_email TEXT := 'test-login-' || v_test_id::text || '@test.com';
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRUEBA 2: Simular creación de usuario';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ID de prueba: %', v_test_id;
  RAISE NOTICE 'Email de prueba: %', v_test_email;
  
  -- Intentar insertar un perfil directamente (como lo haría el trigger)
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, publisher_type)
    VALUES (v_test_id, v_test_email, 'Test User', 'tenant', NULL);
    
    RAISE NOTICE '✓ Inserción directa en profiles funciona';
    
    -- Limpiar
    DELETE FROM public.profiles WHERE id = v_test_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '✗ Inserción directa en profiles falló: %', SQLERRM;
  END;
END $$;

-- 6. Verificar políticas RLS específicas que pueden estar causando problemas
SELECT 
  'Políticas RLS en profiles' as test_type,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN 'Usa auth.uid()'
    ELSE 'No usa auth.uid()'
  END as uses_auth_uid,
  qual as policy_condition
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 7. Verificar si hay funciones que se ejecutan automáticamente
SELECT 
  'Funciones que pueden ejecutarse durante auth' as test_type,
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%auth.uid()%' THEN 'Usa auth.uid()'
    ELSE 'No usa auth.uid()'
  END as uses_auth_uid,
  CASE 
    WHEN prosrc LIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER'
    ELSE 'Normal'
  END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'handle_new_user',
    'can_user_create_conversation'
  )
ORDER BY proname;

-- 8. Verificar si el problema está relacionado con el email_confirmed_at
-- Supabase puede requerir que el email esté confirmado para algunos usuarios
SELECT 
  'Análisis email_confirmed_at' as test_type,
  u.email,
  u.email_confirmed_at IS NOT NULL as is_confirmed,
  p.role,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN 'POSIBLE PROBLEMA: Email no confirmado'
    ELSE 'OK'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'tiloinquilino@test.com',
  'tilopropietario@test.com',
  'yaoinquilino@test.com',
  'yaopropietario@test.com',
  'rencolombiaapp@gmail.com',
  'inquilino.test@rencolombia.com',
  'landlord.pro@test.com'
)
ORDER BY u.email_confirmed_at IS NULL DESC, u.email;

-- 9. Verificar si hay diferencias en la estructura de auth.users
SELECT 
  'Estructura auth.users' as test_type,
  u.email,
  u.aud,
  u.role as auth_role,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.created_at,
  u.updated_at,
  (u.raw_user_meta_data->>'full_name') as meta_full_name
FROM auth.users u
WHERE u.email IN (
  'tiloinquilino@test.com',
  'rencolombiaapp@gmail.com'
)
ORDER BY u.email;

-- 10. RESUMEN Y RECOMENDACIONES
DO $$
DECLARE
  v_unconfirmed_count INTEGER;
  v_profiles_missing INTEGER;
BEGIN
  -- Contar usuarios sin email confirmado
  SELECT COUNT(*) INTO v_unconfirmed_count
  FROM auth.users u
  WHERE u.email IN (
    'tiloinquilino@test.com',
    'tilopropietario@test.com',
    'yaoinquilino@test.com',
    'yaopropietario@test.com'
  )
  AND u.email_confirmed_at IS NULL;
  
  -- Contar usuarios sin perfil
  SELECT COUNT(*) INTO v_profiles_missing
  FROM auth.users u
  WHERE u.email IN (
    'tiloinquilino@test.com',
    'tilopropietario@test.com',
    'yaoinquilino@test.com',
    'yaopropietario@test.com'
  )
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE PRUEBAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuarios sin email confirmado: %', v_unconfirmed_count;
  RAISE NOTICE 'Usuarios sin perfil: %', v_profiles_missing;
  RAISE NOTICE '========================================';
  
  IF v_unconfirmed_count > 0 THEN
    RAISE WARNING '⚠ POSIBLE CAUSA: Usuarios sin email confirmado';
    RAISE NOTICE 'Solución: Confirmar emails de los usuarios o deshabilitar verificación de email en Supabase';
  END IF;
  
  IF v_profiles_missing > 0 THEN
    RAISE WARNING '⚠ POSIBLE CAUSA: Usuarios sin perfil';
    RAISE NOTICE 'Solución: Ejecutar migración 00039 para crear perfiles faltantes';
  END IF;
END $$;
