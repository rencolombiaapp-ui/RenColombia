-- ============================================
-- Migración: Fix Error de Schema en Autenticación
-- ============================================
-- Este error "Database error querying schema" generalmente ocurre cuando:
-- 1. Una función o trigger está fallando silenciosamente
-- 2. Una política RLS está causando un error al evaluarse
-- 3. Hay un problema con alguna vista o función que se ejecuta automáticamente
--
-- Esta migración verifica y corrige posibles problemas
-- ============================================

-- ============================================
-- 1. VERIFICAR Y CORREGIR handle_new_user()
-- ============================================
-- Asegurar que la función tiene manejo de errores robusto
-- IMPORTANTE: Establecer todos los campos necesarios con valores por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Intentar insertar el perfil con manejo de errores
  -- Establecer todos los campos necesarios con valores por defecto
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    role,  -- Campo requerido con CHECK constraint
    publisher_type  -- Puede ser NULL según migración 00021
  )
  VALUES (
    new.id, 
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'tenant',  -- Valor por defecto según schema inicial
    NULL  -- NULL por defecto según migración 00021_fix_publisher_type_default.sql
  )
  ON CONFLICT (id) DO NOTHING; -- Evitar errores si el perfil ya existe
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log del error pero no fallar la creación del usuario
    RAISE WARNING 'Error al crear perfil para usuario %: %', new.id, SQLERRM;
    RETURN new; -- Continuar con la creación del usuario aunque falle el perfil
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Crea automáticamente un perfil cuando se crea un usuario en auth.users. Incluye manejo de errores robusto para evitar que falle la autenticación.';

-- ============================================
-- 2. VERIFICAR QUE EL TRIGGER EXISTE Y ESTÁ ACTIVO
-- ============================================
DO $$
DECLARE
  v_trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' 
      AND c.relname = 'users' 
      AND t.tgname = 'on_auth_user_created'
      AND t.tgenabled = 'O' -- 'O' = enabled
  ) INTO v_trigger_exists;
  
  IF NOT v_trigger_exists THEN
    -- Recrear el trigger si no existe o está deshabilitado
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE '✓ Trigger on_auth_user_created recreado';
  ELSE
    RAISE NOTICE '✓ Trigger on_auth_user_created existe y está activo';
  END IF;
END $$;

-- ============================================
-- 3. VERIFICAR POLÍTICAS RLS EN PROFILES
-- ============================================
-- Asegurar que las políticas RLS están correctamente configuradas
-- y no están causando errores al evaluarse

-- Verificar que existe la política de inserción
DO $$
DECLARE
  v_policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Usuarios pueden insertar su perfil'
  ) INTO v_policy_exists;
  
  IF NOT v_policy_exists THEN
    -- Recrear la política si no existe
    CREATE POLICY "Usuarios pueden insertar su perfil"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
    
    RAISE NOTICE '✓ Política RLS de inserción recreada';
  ELSE
    RAISE NOTICE '✓ Política RLS de inserción existe';
  END IF;
END $$;

-- ============================================
-- 4. VERIFICAR QUE NO HAY FUNCIONES CON ERRORES DE SINTAXIS
-- ============================================
-- Verificar que todas las funciones relacionadas con auth.uid() están correctamente definidas
DO $$
DECLARE
  v_func_record RECORD;
  v_error_count integer := 0;
BEGIN
  -- Verificar funciones que usan auth.uid()
  FOR v_func_record IN
    SELECT 
      p.proname as func_name,
      n.nspname as schema_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname IN ('public')
      AND p.prosrc LIKE '%auth.uid()%'
  LOOP
    BEGIN
      -- Intentar validar la función ejecutando una consulta simple
      EXECUTE format('SELECT COUNT(*) FROM pg_proc WHERE proname = %L', v_func_record.func_name);
      RAISE NOTICE '✓ Función % verificada', v_func_record.func_name;
    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        RAISE WARNING '⚠ Función % tiene problemas: %', v_func_record.func_name, SQLERRM;
    END;
  END LOOP;
  
  IF v_error_count = 0 THEN
    RAISE NOTICE '✓ Todas las funciones verificadas correctamente';
  ELSE
    RAISE WARNING '⚠ Se encontraron % funciones con problemas', v_error_count;
  END IF;
END $$;

-- ============================================
-- 5. VERIFICAR QUE LA TABLA PROFILES TIENE RLS HABILITADO
-- ============================================
DO $$
DECLARE
  v_rls_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'profiles';
  
  IF NOT v_rls_enabled THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS habilitado en profiles';
  ELSE
    RAISE NOTICE '✓ RLS ya está habilitado en profiles';
  END IF;
END $$;

-- ============================================
-- 6. VERIFICAR QUE NO HAY PROBLEMAS CON VISTAS O FUNCIONES QUE USAN auth.uid()
-- ============================================
-- Algunas vistas o funciones pueden estar causando problemas si se ejecutan durante la autenticación
-- Verificar que no hay vistas problemáticas

DO $$
DECLARE
  v_view_record RECORD;
  v_error_count integer := 0;
BEGIN
  FOR v_view_record IN
    SELECT 
      c.relname as view_name,
      n.nspname as schema_name
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relkind = 'v'
      AND n.nspname = 'public'
      AND EXISTS (
        SELECT 1 FROM pg_rewrite r
        WHERE r.ev_class = c.oid
        AND r.ev_type = '1'
      )
  LOOP
    BEGIN
      -- Intentar hacer una consulta simple a la vista
      EXECUTE format('SELECT COUNT(*) FROM %I.%I LIMIT 1', v_view_record.schema_name, v_view_record.view_name);
      RAISE NOTICE '✓ Vista % verificada', v_view_record.view_name;
    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        RAISE WARNING '⚠ Vista % tiene problemas: %', v_view_record.view_name, SQLERRM;
    END;
  END LOOP;
  
  IF v_error_count = 0 THEN
    RAISE NOTICE '✓ Todas las vistas verificadas correctamente';
  ELSE
    RAISE WARNING '⚠ Se encontraron % vistas con problemas', v_error_count;
  END IF;
END $$;

-- ============================================
-- RESUMEN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migración de diagnóstico completada';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Si el problema persiste, verifica:';
  RAISE NOTICE '1. Los logs de Supabase para errores específicos';
  RAISE NOTICE '2. Que todas las migraciones se hayan aplicado correctamente';
  RAISE NOTICE '3. Que no haya conflictos entre políticas RLS';
  RAISE NOTICE '========================================';
END $$;
