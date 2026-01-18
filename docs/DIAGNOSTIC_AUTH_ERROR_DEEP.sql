-- ============================================
-- Script de Diagnóstico Profundo: Error de Autenticación
-- ============================================
-- Este script investiga qué está causando el error durante el login
-- ============================================

-- 1. Verificar si hay usuarios en auth.users sin perfil en profiles
SELECT 
  'Usuarios sin perfil' as check_type,
  COUNT(*) as count
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 2. Verificar usuarios específicos que están fallando
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  CASE WHEN p.id IS NOT NULL THEN 'Tiene perfil' ELSE 'SIN PERFIL' END as profile_status,
  p.role,
  p.publisher_type,
  p.email as profile_email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'tiloinquilino@test.com',
  'tilopropietario@test.com',
  'yaoinquilino@test.com',
  'yaopropietario@test.com',
  'jenrryinquilino@test.com',
  'jenrrypropietario@test.com',
  'omarinquilino@test.com',
  'omarpropietario@test.com'
)
ORDER BY u.email;

-- 3. Verificar si hay problemas con el CHECK constraint de role
SELECT 
  id,
  email,
  role,
  CASE 
    WHEN role IS NULL THEN 'NULL'
    WHEN role NOT IN ('tenant', 'landlord') THEN 'INVALIDO: ' || role
    ELSE 'OK'
  END as role_status
FROM public.profiles
WHERE role IS NULL OR role NOT IN ('tenant', 'landlord');

-- 4. Verificar si hay problemas con el CHECK constraint de publisher_type
SELECT 
  id,
  email,
  publisher_type,
  CASE 
    WHEN publisher_type IS NULL THEN 'NULL (OK)'
    WHEN publisher_type NOT IN ('individual', 'inmobiliaria') THEN 'INVALIDO: ' || publisher_type
    ELSE 'OK'
  END as publisher_type_status
FROM public.profiles
WHERE publisher_type IS NOT NULL 
  AND publisher_type NOT IN ('individual', 'inmobiliaria');

-- 5. Verificar funciones que pueden ejecutarse durante la autenticación
-- Buscar funciones que usan auth.uid() y pueden fallar si retorna NULL
SELECT 
  p.proname as function_name,
  n.nspname as schema_name,
  CASE 
    WHEN p.prosrc LIKE '%auth.uid()%' AND p.prosrc NOT LIKE '%IS NULL%' AND p.prosrc NOT LIKE '%COALESCE%' THEN 'POSIBLE PROBLEMA: No maneja NULL'
    ELSE 'OK'
  END as potential_issue
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosrc LIKE '%auth.uid()%'
  AND p.proname NOT LIKE 'pg_%'
ORDER BY potential_issue DESC, p.proname;

-- 6. Verificar políticas RLS que pueden fallar durante la autenticación
-- Políticas que usan auth.uid() sin verificar NULL
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  CASE 
    WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%IS NULL%' AND qual NOT LIKE '%COALESCE%' THEN 'POSIBLE PROBLEMA: No maneja NULL'
    ELSE 'OK'
  END as potential_issue
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%auth.uid()%'
ORDER BY potential_issue DESC, tablename, policyname;

-- 7. Verificar si hay triggers que se ejecutan en auth.users
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  n.nspname as schema_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END as status,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
  AND c.relname = 'users'
ORDER BY t.tgname;

-- 8. Verificar si hay problemas con la función handle_new_user()
-- Intentar ejecutarla con diferentes escenarios
DO $$
DECLARE
  v_test_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Probando función handle_new_user()...';
  RAISE NOTICE '========================================';
  
  -- Verificar que la función existe
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE '✓ Función handle_new_user() existe';
    v_test_count := v_test_count + 1;
  ELSE
    RAISE WARNING '✗ Función handle_new_user() NO existe';
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Verificar que el trigger existe
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' 
      AND c.relname = 'users' 
      AND t.tgname = 'on_auth_user_created'
      AND t.tgenabled = 'O'
  ) THEN
    RAISE NOTICE '✓ Trigger on_auth_user_created existe y está activo';
    v_test_count := v_test_count + 1;
  ELSE
    RAISE WARNING '✗ Trigger on_auth_user_created NO existe o está deshabilitado';
    v_error_count := v_error_count + 1;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Resumen: % pruebas pasadas, % errores encontrados', v_test_count, v_error_count;
  RAISE NOTICE '========================================';
END $$;

-- 9. Verificar si hay problemas con vistas que se consultan automáticamente
SELECT 
  c.relname as view_name,
  n.nspname as schema_name,
  CASE 
    WHEN pg_get_viewdef(c.oid, true) LIKE '%auth.uid()%' 
      AND pg_get_viewdef(c.oid, true) NOT LIKE '%IS NULL%' 
      AND pg_get_viewdef(c.oid, true) NOT LIKE '%COALESCE%' 
    THEN 'POSIBLE PROBLEMA: Vista usa auth.uid() sin manejar NULL'
    ELSE 'OK'
  END as potential_issue
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND pg_get_viewdef(c.oid, true) LIKE '%auth.uid()%'
ORDER BY potential_issue DESC, c.relname;

-- 10. Verificar logs de errores recientes (si están disponibles)
-- Nota: Esto requiere permisos especiales en Supabase
SELECT 
  'Verificar logs de Supabase Dashboard' as instruction,
  'Ve a Dashboard > Logs > Postgres Logs y busca errores relacionados con auth' as details;

-- 11. Verificar si hay problemas con la estructura de la tabla profiles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name = 'role' AND is_nullable = 'NO' AND column_default IS NULL THEN 'POSIBLE PROBLEMA: role es NOT NULL sin default'
    WHEN column_name = 'email' AND is_nullable = 'NO' AND column_default IS NULL THEN 'POSIBLE PROBLEMA: email es NOT NULL sin default'
    ELSE 'OK'
  END as potential_issue
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 12. Comparar estructura de usuarios que funcionan vs usuarios que no funcionan
SELECT 
  'Usuarios que funcionan' as user_group,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE p.role IS NOT NULL) as with_role,
  COUNT(*) FILTER (WHERE p.email IS NOT NULL) as with_email
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'rencolombiaapp@gmail.com',
  'inquilino.test@rencolombia.com',
  'inmobiliaria.test@rencolombia.com',
  'landlord.pro@test.com',
  'tenant.pro@test.com',
  'inmobiliaria.pro@test.com'
)

UNION ALL

SELECT 
  'Usuarios que NO funcionan' as user_group,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE p.role IS NOT NULL) as with_role,
  COUNT(*) FILTER (WHERE p.email IS NOT NULL) as with_email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'tiloinquilino@test.com',
  'tilopropietario@test.com',
  'yaoinquilino@test.com',
  'yaopropietario@test.com',
  'jenrryinquilino@test.com',
  'jenrrypropietario@test.com',
  'omarinquilino@test.com',
  'omarpropietario@test.com'
);

-- ============================================
-- RESUMEN Y RECOMENDACIONES
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNÓSTICO COMPLETADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Revisa los resultados anteriores y busca:';
  RAISE NOTICE '1. Usuarios sin perfil';
  RAISE NOTICE '2. Roles o publisher_type inválidos';
  RAISE NOTICE '3. Funciones que no manejan NULL en auth.uid()';
  RAISE NOTICE '4. Políticas RLS que pueden fallar';
  RAISE NOTICE '5. Vistas problemáticas';
  RAISE NOTICE '';
  RAISE NOTICE 'Si encuentras problemas, ejecuta la migración 00040';
  RAISE NOTICE '========================================';
END $$;
