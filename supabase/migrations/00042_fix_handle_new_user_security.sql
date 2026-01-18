-- ============================================
-- Migración: Corregir handle_new_user() para que sea SECURITY DEFINER
-- ============================================
-- El problema puede estar en que handle_new_user() no es SECURITY DEFINER
-- y por lo tanto no puede insertar en profiles durante la creación del usuario
-- ============================================

-- Recrear la función handle_new_user() con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_email TEXT;
  v_full_name TEXT;
BEGIN
  -- Obtener valores de forma segura
  v_email := COALESCE(new.email, '');
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
  
  -- Si el email está vacío, usar un valor por defecto
  IF v_email = '' OR v_email IS NULL THEN
    v_email := 'sin-email-' || new.id::text || '@rencolombia.com';
  END IF;
  
  -- Intentar insertar el perfil con manejo de errores robusto
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    role,
    publisher_type
  )
  VALUES (
    new.id, 
    v_email,
    v_full_name,
    'tenant',  -- Valor por defecto
    NULL  -- NULL por defecto
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(profiles.role, 'tenant')
  WHERE profiles.role IS NULL;  -- Solo actualizar si role es NULL
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log del error pero NO fallar la creación del usuario
    -- Esto es crítico: si fallamos aquí, el usuario no puede autenticarse
    RAISE WARNING 'Error al crear perfil para usuario %: %', new.id, SQLERRM;
    RETURN new; -- SIEMPRE retornar new para no bloquear la creación del usuario
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ⚠️ IMPORTANTE: SECURITY DEFINER

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Crea automáticamente un perfil cuando se crea un usuario en auth.users. SECURITY DEFINER permite que la función ejecute con permisos elevados para insertar en profiles.';

-- Verificar que la función ahora es SECURITY DEFINER
DO $$
DECLARE
  v_is_security_definer BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'handle_new_user'
      AND p.prosecdef = true  -- prosecdef = true significa SECURITY DEFINER
  ) INTO v_is_security_definer;
  
  IF v_is_security_definer THEN
    RAISE NOTICE '✓ Función handle_new_user() ahora es SECURITY DEFINER';
  ELSE
    RAISE WARNING '✗ Función handle_new_user() NO es SECURITY DEFINER';
  END IF;
END $$;
