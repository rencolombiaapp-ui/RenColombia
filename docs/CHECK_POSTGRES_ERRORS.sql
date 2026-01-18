-- ============================================
-- Consulta: Ver errores recientes de Postgres
-- ============================================
-- Ejecuta esto en el SQL Editor de Supabase para ver errores recientes
-- relacionados con autenticación

-- Nota: Los logs de Postgres en Supabase pueden estar en diferentes lugares
-- Esta consulta busca errores en las tablas del sistema

-- Verificar si hay errores recientes en las funciones
SELECT 
  'Errores en funciones' as check_type,
  proname as function_name,
  prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname = 'handle_new_user';

-- Verificar el estado del trigger
SELECT 
  'Estado del trigger' as check_type,
  t.tgname as trigger_name,
  c.relname as table_name,
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

-- Verificar políticas RLS actuales
SELECT 
  'Políticas RLS' as check_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================
-- INSTRUCCIONES PARA VER LOGS EN SUPABASE:
-- ============================================
-- 1. Ve al Dashboard de Supabase
-- 2. En el menú lateral izquierdo, busca "Logs" o "Logs & Analytics"
-- 3. Selecciona "Postgres Logs" o "Database Logs"
-- 4. Intenta iniciar sesión con tiloinquilino@test.com
-- 5. Inmediatamente después, revisa los logs para ver el error exacto
-- 
-- Alternativamente:
-- - Ve a "Settings" → "Database" → "Logs"
-- - O busca "Postgres Logs" en el buscador del dashboard
-- ============================================
