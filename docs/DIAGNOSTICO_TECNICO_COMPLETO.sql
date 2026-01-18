-- ============================================
-- DIAGNÓSTICO TÉCNICO COMPLETO: Error de Autenticación
-- RentarColombia - Usuarios Nuevos vs Antiguos
-- ============================================
-- Este script SOLO INSPECCIONA y REPORTAR hallazgos
-- NO realiza cambios en la base de datos
-- ============================================

DO $$
DECLARE
  v_report TEXT := '';
  v_new_users_count INTEGER;
  v_old_users_count INTEGER;
  v_new_users_without_profile INTEGER;
  v_old_users_without_profile INTEGER;
BEGIN
  v_report := v_report || E'\n========================================\n';
  v_report := v_report || 'DIAGNÓSTICO TÉCNICO COMPLETO\n';
  v_report := v_report || 'Error: "Database error querying schema"\n';
  v_report := v_report || '========================================\n\n';
  
  -- Contar usuarios nuevos vs antiguos
  SELECT COUNT(*) INTO v_new_users_count
  FROM auth.users
  WHERE email LIKE '%@test.com'
    AND email NOT IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                      'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                      'tenant.pro@test.com', 'inmobiliaria.pro@test.com');
  
  SELECT COUNT(*) INTO v_old_users_count
  FROM auth.users
  WHERE email IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                  'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                  'tenant.pro@test.com', 'inmobiliaria.pro@test.com');
  
  SELECT COUNT(*) INTO v_new_users_without_profile
  FROM auth.users u
  WHERE u.email LIKE '%@test.com'
    AND u.email NOT IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                        'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                        'tenant.pro@test.com', 'inmobiliaria.pro@test.com')
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
  
  SELECT COUNT(*) INTO v_old_users_without_profile
  FROM auth.users u
  WHERE u.email IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                    'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                    'tenant.pro@test.com', 'inmobiliaria.pro@test.com')
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
  
  v_report := v_report || '1. RESUMEN EJECUTIVO\n';
  v_report := v_report || '----------------------------------------\n';
  v_report := v_report || 'Usuarios nuevos (problemáticos): ' || v_new_users_count || E'\n';
  v_report := v_report || 'Usuarios antiguos (funcionan): ' || v_old_users_count || E'\n';
  v_report := v_report || 'Usuarios nuevos sin perfil: ' || v_new_users_without_profile || E'\n';
  v_report := v_report || 'Usuarios antiguos sin perfil: ' || v_old_users_without_profile || E'\n';
  v_report := v_report || E'\n';
  
  RAISE NOTICE '%', v_report;
END $$;

-- ============================================
-- 1. SUPABASE AUTH - Verificación de Usuarios
-- ============================================

-- 1.1 Usuarios nuevos en auth.users
SELECT 
  '1.1 Usuarios nuevos en auth.users' as seccion,
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.created_at,
  CASE WHEN p.id IS NOT NULL THEN 'Tiene perfil' ELSE 'SIN PERFIL' END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email LIKE '%@test.com'
  AND u.email NOT IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                      'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                      'tenant.pro@test.com', 'inmobiliaria.pro@test.com')
ORDER BY u.created_at DESC
LIMIT 10;

-- 1.2 Usuarios antiguos en auth.users (para comparar)
SELECT 
  '1.2 Usuarios antiguos en auth.users' as seccion,
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.created_at,
  CASE WHEN p.id IS NOT NULL THEN 'Tiene perfil' ELSE 'SIN PERFIL' END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                  'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                  'tenant.pro@test.com', 'inmobiliaria.pro@test.com')
ORDER BY u.email;

-- 1.3 Comparación de estructura auth.users
SELECT 
  '1.3 Comparación estructura auth.users' as seccion,
  CASE 
    WHEN u.email LIKE '%@test.com' 
      AND u.email NOT IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                          'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                          'tenant.pro@test.com', 'inmobiliaria.pro@test.com')
    THEN 'Usuario nuevo'
    ELSE 'Usuario antiguo'
  END as tipo_usuario,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE u.email_confirmed_at IS NOT NULL) as email_confirmados,
  COUNT(*) FILTER (WHERE u.raw_user_meta_data IS NOT NULL) as con_metadata,
  COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)) as con_perfil
FROM auth.users u
GROUP BY 
  CASE 
    WHEN u.email LIKE '%@test.com' 
      AND u.email NOT IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                          'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                          'tenant.pro@test.com', 'inmobiliaria.pro@test.com')
    THEN 'Usuario nuevo'
    ELSE 'Usuario antiguo'
  END;

-- ============================================
-- 2. TABLA profiles - Estructura y Datos
-- ============================================

-- 2.1 Estructura de la tabla profiles
SELECT 
  '2.1 Estructura tabla profiles' as seccion,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN '⚠ REQUERIDO SIN DEFAULT'
    WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN '✓ REQUERIDO CON DEFAULT'
    ELSE '✓ OPCIONAL'
  END as estado_columna
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2.2 Constraints y checks en profiles
SELECT 
  '2.2 Constraints tabla profiles' as seccion,
  constraint_name,
  constraint_type,
  CASE 
    WHEN constraint_type = 'CHECK' THEN 'Verifica valores permitidos'
    WHEN constraint_type = 'FOREIGN KEY' THEN 'Referencia a otra tabla'
    WHEN constraint_type = 'PRIMARY KEY' THEN 'Clave primaria'
    WHEN constraint_type = 'UNIQUE' THEN 'Valor único'
    ELSE constraint_type
  END as descripcion
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY constraint_type, constraint_name;

-- 2.3 Valores NULL en perfiles de usuarios nuevos
SELECT 
  '2.3 Valores NULL en perfiles nuevos' as seccion,
  COUNT(*) as total_perfiles_nuevos,
  COUNT(*) FILTER (WHERE p.email IS NULL OR p.email = '') as emails_null,
  COUNT(*) FILTER (WHERE p.full_name IS NULL) as nombres_null,
  COUNT(*) FILTER (WHERE p.role IS NULL) as roles_null,
  COUNT(*) FILTER (WHERE p.publisher_type IS NULL) as publisher_null
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email LIKE '%@test.com'
  AND u.email NOT IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                      'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                      'tenant.pro@test.com', 'inmobiliaria.pro@test.com');

-- 2.4 Comparación de perfiles nuevos vs antiguos
SELECT 
  '2.4 Comparación perfiles' as seccion,
  CASE 
    WHEN u.email LIKE '%@test.com' 
      AND u.email NOT IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                          'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                          'tenant.pro@test.com', 'inmobiliaria.pro@test.com')
    THEN 'Perfil nuevo'
    ELSE 'Perfil antiguo'
  END as tipo_perfil,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE p.role IS NOT NULL) as con_role,
  COUNT(*) FILTER (WHERE p.email IS NOT NULL) as con_email,
  COUNT(*) FILTER (WHERE p.full_name IS NOT NULL) as con_nombre,
  COUNT(*) FILTER (WHERE p.publisher_type IS NOT NULL) as con_publisher_type
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email LIKE '%@test.com'
   OR u.email IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                  'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                  'tenant.pro@test.com', 'inmobiliaria.pro@test.com')
GROUP BY 
  CASE 
    WHEN u.email LIKE '%@test.com' 
      AND u.email NOT IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                          'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                          'tenant.pro@test.com', 'inmobiliaria.pro@test.com')
    THEN 'Perfil nuevo'
    ELSE 'Perfil antiguo'
  END;

-- ============================================
-- 3. TRIGGERS - Verificación
-- ============================================

-- 3.1 Triggers en auth.users
SELECT 
  '3.1 Triggers en auth.users' as seccion,
  t.tgname as trigger_name,
  c.relname as table_name,
  n.nspname as schema_name,
  CASE t.tgenabled
    WHEN 'O' THEN '✓ Enabled'
    WHEN 'D' THEN '✗ Disabled'
    ELSE '? Unknown'
  END as estado,
  pg_get_triggerdef(t.oid) as definicion_trigger
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
  AND c.relname = 'users'
ORDER BY t.tgname;

-- 3.2 Función asociada al trigger handle_new_user
SELECT 
  '3.2 Función handle_new_user' as seccion,
  p.proname as function_name,
  n.nspname as schema_name,
  CASE 
    WHEN p.prosecdef THEN '✓ SECURITY DEFINER'
    ELSE '✗ NO es SECURITY DEFINER'
  END as security_type,
  CASE 
    WHEN p.prosrc LIKE '%EXCEPTION%' THEN '✓ Tiene manejo de errores'
    ELSE '✗ Sin manejo de errores'
  END as error_handling,
  CASE 
    WHEN p.prosrc LIKE '%auth.uid()%' THEN '⚠ Usa auth.uid()'
    ELSE '✓ No usa auth.uid()'
  END as uses_auth_uid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'handle_new_user';

-- ============================================
-- 4. RLS (ROW LEVEL SECURITY) - Políticas
-- ============================================

-- 4.1 Estado de RLS en profiles
SELECT 
  '4.1 Estado RLS en profiles' as seccion,
  c.relname as table_name,
  c.relrowsecurity as rls_habilitado,
  c.relforcerowsecurity as rls_forzado,
  CASE 
    WHEN c.relrowsecurity THEN '✓ RLS habilitado'
    ELSE '✗ RLS deshabilitado'
  END as estado_rls
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'profiles';

-- 4.2 Todas las políticas RLS en profiles
SELECT 
  '4.2 Políticas RLS en profiles' as seccion,
  policyname,
  cmd as operacion,
  permissive as tipo,
  roles as roles_aplicables,
  qual as condicion_using,
  with_check as condicion_with_check,
  CASE 
    WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%IS NULL%' THEN '⚠ Puede fallar si auth.uid() es NULL'
    WHEN qual LIKE '%auth.uid()%' AND qual LIKE '%IS NULL%' THEN '✓ Maneja auth.uid() NULL'
    ELSE '✓ No usa auth.uid()'
  END as evaluacion_auth_uid
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 4.3 Evaluación de políticas para INSERT (crítico para triggers)
SELECT 
  '4.3 Evaluación políticas INSERT' as seccion,
  policyname,
  with_check as condicion_insert,
  CASE 
    WHEN with_check LIKE '%auth.uid() = id%' AND with_check NOT LIKE '%auth.uid() IS NULL%' 
      AND with_check NOT LIKE '%service_role%' THEN '⚠ PROBLEMA: Requiere auth.uid() pero trigger no tiene contexto'
    WHEN with_check LIKE '%service_role%' OR with_check LIKE '%SECURITY DEFINER%' THEN '✓ OK: Permite service_role'
    WHEN with_check LIKE '%auth.uid() IS NULL%' THEN '✓ OK: Maneja NULL'
    ELSE '? Revisar manualmente'
  END as evaluacion_trigger
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND cmd = 'INSERT';

-- ============================================
-- 5. CONSULTAS DEL FRONTEND (Inferidas)
-- ============================================

-- 5.1 Funciones que pueden ejecutarse después del login
SELECT 
  '5.1 Funciones que usan auth.uid()' as seccion,
  p.proname as function_name,
  n.nspname as schema_name,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'Normal'
  END as security_type,
  CASE 
    WHEN p.prosrc LIKE '%auth.uid()%' AND p.prosrc NOT LIKE '%IS NULL%' 
      AND p.prosrc NOT LIKE '%COALESCE%' THEN '⚠ PROBLEMA: No maneja auth.uid() NULL'
    WHEN p.prosrc LIKE '%auth.uid()%' THEN '✓ Maneja auth.uid() NULL'
    ELSE 'N/A'
  END as evaluacion_auth_uid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosrc LIKE '%auth.uid()%'
  AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;

-- 5.2 Vistas que pueden consultarse automáticamente
SELECT 
  '5.2 Vistas que usan auth.uid()' as seccion,
  c.relname as view_name,
  n.nspname as schema_name,
  CASE 
    WHEN pg_get_viewdef(c.oid, true) LIKE '%auth.uid()%' 
      AND pg_get_viewdef(c.oid, true) NOT LIKE '%IS NULL%' 
      AND pg_get_viewdef(c.oid, true) NOT LIKE '%COALESCE%' 
    THEN '⚠ PROBLEMA: Vista usa auth.uid() sin manejar NULL'
    WHEN pg_get_viewdef(c.oid, true) LIKE '%auth.uid()%' THEN '✓ Maneja auth.uid() NULL'
    ELSE 'N/A'
  END as evaluacion_auth_uid
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND pg_get_viewdef(c.oid, true) LIKE '%auth.uid()%'
ORDER BY c.relname;

-- ============================================
-- 6. RESUMEN Y RECOMENDACIONES
-- ============================================

DO $$
DECLARE
  v_summary TEXT := '';
  v_issues_found INTEGER := 0;
BEGIN
  v_summary := E'\n========================================\n';
  v_summary := v_summary || 'RESUMEN DEL DIAGNÓSTICO\n';
  v_summary := v_summary || '========================================\n\n';
  
  -- Verificar problemas identificados
  -- Problema 1: Usuarios sin perfil
  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.email LIKE '%@test.com'
      AND u.email NOT IN ('rencolombiaapp@gmail.com', 'inquilino.test@rencolombia.com', 
                          'inmobiliaria.test@rencolombia.com', 'landlord.pro@test.com',
                          'tenant.pro@test.com', 'inmobiliaria.pro@test.com')
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  ) THEN
    v_issues_found := v_issues_found + 1;
    v_summary := v_summary || '⚠ PROBLEMA ' || v_issues_found || ': Usuarios nuevos sin perfil\n';
  END IF;
  
  -- Problema 2: Trigger no es SECURITY DEFINER
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'handle_new_user'
      AND NOT p.prosecdef
  ) THEN
    v_issues_found := v_issues_found + 1;
    v_summary := v_summary || '⚠ PROBLEMA ' || v_issues_found || ': handle_new_user() NO es SECURITY DEFINER\n';
  END IF;
  
  -- Problema 3: Políticas RLS que pueden fallar
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'profiles'
      AND cmd = 'INSERT'
      AND with_check LIKE '%auth.uid() = id%'
      AND with_check NOT LIKE '%IS NULL%'
      AND with_check NOT LIKE '%service_role%'
  ) THEN
    v_issues_found := v_issues_found + 1;
    v_summary := v_summary || '⚠ PROBLEMA ' || v_issues_found || ': Política INSERT requiere auth.uid() pero trigger no tiene contexto\n';
  END IF;
  
  -- Problema 4: Funciones que no manejan auth.uid() NULL
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosrc LIKE '%auth.uid()%'
      AND p.prosrc NOT LIKE '%IS NULL%'
      AND p.prosrc NOT LIKE '%COALESCE%'
      AND p.proname NOT LIKE 'pg_%'
  ) THEN
    v_issues_found := v_issues_found + 1;
    v_summary := v_summary || '⚠ PROBLEMA ' || v_issues_found || ': Funciones que no manejan auth.uid() NULL\n';
  END IF;
  
  IF v_issues_found = 0 THEN
    v_summary := v_summary || '✓ No se encontraron problemas obvios en el diagnóstico básico\n';
    v_summary := v_summary || '  Revisar logs de Supabase para errores específicos\n';
  END IF;
  
  v_summary := v_summary || E'\n========================================\n';
  v_summary := v_summary || 'HIPÓTESIS PRINCIPAL\n';
  v_summary := v_summary || '========================================\n';
  v_summary := v_summary || 'El error "Database error querying schema" durante el login\n';
  v_summary := v_summary || 'probablemente ocurre porque:\n\n';
  v_summary := v_summary || '1. Una política RLS en profiles requiere auth.uid() pero durante\n';
  v_summary := v_summary || '   la autenticación este valor puede ser NULL o no estar disponible\n\n';
  v_summary := v_summary || '2. Una función o vista se ejecuta automáticamente después del login\n';
  v_summary := v_summary || '   y falla al intentar usar auth.uid() cuando es NULL\n\n';
  v_summary := v_summary || '3. El trigger handle_new_user() puede no tener permisos suficientes\n';
  v_summary := v_summary || '   para insertar en profiles si no es SECURITY DEFINER\n\n';
  v_summary := v_summary || E'\n========================================\n';
  v_summary := v_summary || 'RIESGOS SI NO SE CORRIGE\n';
  v_summary := v_summary || '========================================\n';
  v_summary := v_summary || '- Los usuarios nuevos NO podrán iniciar sesión\n';
  v_summary := v_summary || '- La aplicación perderá usuarios potenciales\n';
  v_summary := v_summary || '- El problema empeorará con el tiempo\n';
  v_summary := v_summary || '- Los usuarios antiguos pueden verse afectados si se recrean\n';
  v_summary := v_summary || E'\n========================================\n';
  v_summary := v_summary || 'RECOMENDACIONES (SIN EJECUTAR)\n';
  v_summary := v_summary || '========================================\n';
  v_summary := v_summary || '1. Revisar logs de Supabase Auth y Database para el error exacto\n';
  v_summary := v_summary || '2. Asegurar que handle_new_user() es SECURITY DEFINER\n';
  v_summary := v_summary || '3. Modificar políticas RLS INSERT para permitir service_role\n';
  v_summary := v_summary || '4. Agregar manejo de NULL en funciones que usan auth.uid()\n';
  v_summary := v_summary || '5. Verificar que las vistas manejan correctamente auth.uid() NULL\n';
  v_summary := v_summary || E'\n========================================\n';
  
  RAISE NOTICE '%', v_summary;
END $$;
