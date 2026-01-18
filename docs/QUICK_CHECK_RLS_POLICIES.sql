-- ============================================
-- Consulta Rápida: Verificar Políticas RLS
-- ============================================
-- Ejecuta esto y comparte los resultados

-- Consulta 6: Políticas RLS en profiles
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN 'Usa auth.uid()'
    ELSE 'No usa auth.uid()'
  END as uses_auth_uid,
  qual as policy_condition,
  with_check as policy_with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Consulta 7: Funciones que pueden ejecutarse durante auth
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%auth.uid()%' THEN 'Usa auth.uid()'
    ELSE 'No usa auth.uid()'
  END as uses_auth_uid,
  CASE 
    WHEN prosrc LIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER'
    ELSE 'Normal'
  END as security_type,
  CASE 
    WHEN prosrc LIKE '%EXCEPTION%' THEN 'Tiene manejo de errores'
    ELSE 'Sin manejo de errores'
  END as has_error_handling
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'handle_new_user',
    'can_user_create_conversation'
  )
ORDER BY proname;
