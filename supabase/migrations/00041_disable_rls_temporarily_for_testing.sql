-- ============================================
-- Migración: Deshabilitar RLS temporalmente para testing
-- ============================================
-- ⚠️ SOLO PARA TESTING - NO USAR EN PRODUCCIÓN
-- Esta migración deshabilita RLS temporalmente para identificar
-- si el problema está en las políticas RLS
-- ============================================

-- NOTA: Esta migración es solo para diagnóstico
-- Si el problema se resuelve deshabilitando RLS, entonces sabemos
-- que el problema está en las políticas RLS y debemos corregirlas

-- Opción 1: Deshabilitar RLS completamente (NO RECOMENDADO para producción)
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Opción 2: Crear políticas más permisivas temporalmente
-- Esto es más seguro que deshabilitar completamente RLS

-- Política de SELECT: Permitir acceso a todos los perfiles
DROP POLICY IF EXISTS "Profiles visibles para todos" ON public.profiles;
CREATE POLICY "Profiles visibles para todos"
  ON public.profiles FOR SELECT
  USING (true);

-- Política de UPDATE: Permitir actualización si el usuario está autenticado
DROP POLICY IF EXISTS "Usuarios pueden editar su perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden editar su perfil"
  ON public.profiles FOR UPDATE
  USING (
    -- Permitir si el usuario está editando su propio perfil
    auth.uid() = id
    OR
    -- Permitir si auth.uid() es NULL (durante creación de usuario)
    auth.uid() IS NULL
    OR
    -- Permitir si es service_role (para triggers)
    auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.uid() = id
    OR auth.uid() IS NULL
    OR auth.role() = 'service_role'
  );

-- Política de INSERT: Permitir inserción durante creación de usuario
DROP POLICY IF EXISTS "Usuarios pueden insertar su perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden insertar su perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (
    -- Permitir si el usuario está insertando su propio perfil
    auth.uid() = id
    OR
    -- Permitir si auth.uid() es NULL (durante creación de usuario por trigger)
    auth.uid() IS NULL
    OR
    -- Permitir si es service_role (para triggers y funciones SECURITY DEFINER)
    auth.role() = 'service_role'
  );

-- Verificar que RLS sigue habilitado pero con políticas más permisivas
DO $$
DECLARE
  v_rls_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'profiles';
  
  IF v_rls_enabled THEN
    RAISE NOTICE '✓ RLS está habilitado con políticas permisivas para testing';
  ELSE
    RAISE WARNING '⚠ RLS está deshabilitado - esto es solo para testing';
  END IF;
END $$;

-- ============================================
-- IMPORTANTE: Después de identificar el problema,
-- debes revertir estas políticas a las originales
-- ============================================
