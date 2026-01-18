-- ============================================
-- Script de Diagnóstico: Error de Autenticación
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para diagnosticar el error "Database error querying schema"
-- ============================================

-- 1. Verificar que handle_new_user() existe y está correcta
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND proname = 'handle_new_user';

-- 2. Verificar que el trigger existe y está activo
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  n.nspname as schema_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
  AND c.relname = 'users' 
  AND t.tgname = 'on_auth_user_created';

-- 3. Verificar políticas RLS en profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY policyname;

-- 4. Verificar que RLS está habilitado en profiles
SELECT 
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'profiles';

-- 5. Intentar ejecutar handle_new_user() manualmente (simulación)
-- Esto nos dirá si hay algún error en la función
DO $$
DECLARE
  v_test_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_test_email text := 'test@example.com';
  v_test_name text := 'Test User';
BEGIN
  -- Simular un registro de usuario (sin insertar realmente)
  RAISE NOTICE 'Probando función handle_new_user()...';
  
  -- Verificar que la función puede ser llamada sin errores
  PERFORM public.handle_new_user();
  
  RAISE NOTICE '✓ Función handle_new_user() se puede ejecutar sin errores';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '✗ Error al ejecutar handle_new_user(): %', SQLERRM;
END $$;

-- 6. Verificar si hay funciones problemáticas que usan auth.uid()
SELECT 
  p.proname as function_name,
  n.nspname as schema_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosrc LIKE '%auth.uid()%'
  AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;

-- 7. Verificar si hay vistas problemáticas
SELECT 
  c.relname as view_name,
  n.nspname as schema_name,
  pg_get_viewdef(c.oid, true) as view_definition
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND pg_get_viewdef(c.oid, true) LIKE '%auth.uid()%'
ORDER BY c.relname;

-- 8. Verificar el estado de la tabla profiles
SELECT 
  COUNT(*) as total_profiles,
  COUNT(DISTINCT id) as unique_ids,
  COUNT(*) FILTER (WHERE email IS NULL) as null_emails,
  COUNT(*) FILTER (WHERE full_name IS NULL) as null_names
FROM public.profiles;

-- ============================================
-- INSTRUCCIONES:
-- ============================================
-- 1. Ejecuta este script completo en el SQL Editor de Supabase
-- 2. Revisa los resultados de cada consulta
-- 3. Si encuentras algún error o problema, compártelo
-- 4. Luego ejecuta la migración 00038_fix_auth_schema_error.sql
-- ============================================
