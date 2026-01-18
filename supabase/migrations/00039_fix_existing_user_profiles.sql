-- ============================================
-- Migración: Corregir perfiles de usuarios existentes
-- ============================================
-- Esta migración corrige los perfiles de usuarios que pueden tener
-- campos NULL o valores incorrectos que causan problemas en la autenticación
-- ============================================

-- ============================================
-- 1. CORREGIR USUARIOS SIN ROLE
-- ============================================
-- Establecer role='tenant' para usuarios que no tienen role definido
UPDATE public.profiles
SET role = 'tenant'
WHERE role IS NULL;

-- ============================================
-- 2. CORREGIR EMAILS NULL O VACÍOS
-- ============================================
-- Si un usuario tiene email NULL o vacío, intentar obtenerlo de auth.users
UPDATE public.profiles p
SET email = COALESCE(
  (SELECT email FROM auth.users WHERE id = p.id),
  p.email,
  'sin-email@rencolombia.com'
)
WHERE p.email IS NULL OR p.email = '';

-- ============================================
-- 3. VERIFICAR QUE NO HAY PERFILES HUÉRFANOS
-- ============================================
-- Eliminar perfiles que no tienen usuario correspondiente en auth.users
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- 4. VERIFICAR QUE TODOS LOS USUARIOS TIENEN PERFIL
-- ============================================
-- Crear perfiles para usuarios que no tienen perfil
INSERT INTO public.profiles (id, email, full_name, role, publisher_type)
SELECT 
  u.id,
  COALESCE(u.email, 'sin-email@rencolombia.com'),
  COALESCE(u.raw_user_meta_data->>'full_name', 'Usuario'),
  'tenant',  -- Valor por defecto
  NULL  -- NULL por defecto según migración 00021
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. RESUMEN DE CORRECCIONES
-- ============================================
DO $$
DECLARE
  v_users_without_role INTEGER;
  v_users_without_email INTEGER;
  v_orphan_profiles INTEGER;
  v_users_without_profile INTEGER;
BEGIN
  -- Contar usuarios sin role
  SELECT COUNT(*) INTO v_users_without_role
  FROM public.profiles
  WHERE role IS NULL;
  
  -- Contar usuarios sin email
  SELECT COUNT(*) INTO v_users_without_email
  FROM public.profiles
  WHERE email IS NULL OR email = '';
  
  -- Contar perfiles huérfanos
  SELECT COUNT(*) INTO v_orphan_profiles
  FROM public.profiles
  WHERE id NOT IN (SELECT id FROM auth.users);
  
  -- Contar usuarios sin perfil
  SELECT COUNT(*) INTO v_users_without_profile
  FROM auth.users
  WHERE id NOT IN (SELECT id FROM public.profiles);
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Resumen de correcciones aplicadas:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuarios sin role corregidos: %', v_users_without_role;
  RAISE NOTICE 'Usuarios sin email corregidos: %', v_users_without_email;
  RAISE NOTICE 'Perfiles huérfanos eliminados: %', v_orphan_profiles;
  RAISE NOTICE 'Usuarios sin perfil creados: %', v_users_without_profile;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 6. VERIFICACIÓN FINAL
-- ============================================
-- Verificar que todos los usuarios tienen perfiles válidos
DO $$
DECLARE
  v_invalid_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_invalid_profiles
  FROM public.profiles
  WHERE role IS NULL 
     OR email IS NULL 
     OR email = ''
     OR id NOT IN (SELECT id FROM auth.users);
  
  IF v_invalid_profiles > 0 THEN
    RAISE WARNING '⚠ Aún hay % perfiles con problemas', v_invalid_profiles;
  ELSE
    RAISE NOTICE '✓ Todos los perfiles están correctamente configurados';
  END IF;
END $$;
