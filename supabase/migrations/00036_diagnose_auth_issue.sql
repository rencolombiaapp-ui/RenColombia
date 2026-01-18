-- ============================================
-- Migración de Diagnóstico: Verificar Trigger y RLS
-- ============================================
-- Esta migración verifica que el trigger handle_new_user() esté funcionando correctamente
-- y que las políticas RLS no estén bloqueando la creación de perfiles

-- Verificar que el trigger existe y está activo
DO $$
DECLARE
  v_trigger_exists boolean;
  v_function_exists boolean;
BEGIN
  -- Verificar que la función existe
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) INTO v_function_exists;
  
  -- Verificar que el trigger existe
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created'
  ) INTO v_trigger_exists;
  
  IF NOT v_function_exists THEN
    RAISE EXCEPTION 'La función handle_new_user() no existe';
  END IF;
  
  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'El trigger on_auth_user_created no existe';
  END IF;
  
  RAISE NOTICE '✓ Trigger y función verificados correctamente';
END $$;

-- Verificar que las políticas RLS en profiles permiten la inserción
DO $$
DECLARE
  v_policy_count integer;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Usuarios pueden insertar su perfil';
  
  IF v_policy_count = 0 THEN
    RAISE EXCEPTION 'La política RLS para insertar perfiles no existe';
  END IF;
  
  RAISE NOTICE '✓ Política RLS de inserción verificada';
END $$;

-- Verificar que la tabla profiles tiene RLS habilitado
DO $$
DECLARE
  v_rls_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'profiles';
  
  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'RLS no está habilitado en la tabla profiles';
  END IF;
  
  RAISE NOTICE '✓ RLS está habilitado en profiles';
END $$;

-- Asegurar que el trigger está configurado correctamente
-- Actualizar la función con mejor manejo de errores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Intentar insertar el perfil
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', '')
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
  'Crea automáticamente un perfil cuando se crea un usuario en auth.users. Incluye manejo de errores para evitar que falle la autenticación.';
