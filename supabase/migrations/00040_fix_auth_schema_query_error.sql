-- ============================================
-- Migración: Fix Error "Database error querying schema" durante autenticación
-- ============================================
-- Este error ocurre cuando Supabase intenta consultar el schema durante el login
-- y encuentra funciones, vistas o políticas RLS que fallan al evaluarse
-- ============================================

-- ============================================
-- 1. DESHABILITAR TEMPORALMENTE VISTAS PROBLEMÁTICAS
-- ============================================
-- La vista conversations_with_details puede estar causando problemas
-- si intenta acceder a datos que no existen para usuarios nuevos
DROP VIEW IF EXISTS public.conversations_with_details CASCADE;

-- Recrear la vista con mejor manejo de errores
CREATE OR REPLACE VIEW public.conversations_with_details AS
SELECT 
  c.id,
  c.property_id,
  c.tenant_id,
  c.owner_id,
  c.status,
  c.last_message_at,
  c.created_at,
  c.updated_at,
  p.title as property_title,
  p.city as property_city,
  p.neighborhood as property_neighborhood,
  p.price as property_price,
  p.status as property_status,
  -- Información del inquilino
  pt.email as tenant_email,
  pt.full_name as tenant_name,
  -- Información del propietario
  po.email as owner_email,
  po.full_name as owner_name
FROM public.conversations c
LEFT JOIN public.properties p ON p.id = c.property_id
LEFT JOIN public.profiles pt ON pt.id = c.tenant_id
LEFT JOIN public.profiles po ON po.id = c.owner_id;

-- ============================================
-- 2. VERIFICAR QUE handle_new_user() NO FALLA
-- ============================================
-- Asegurar que la función puede ejecutarse sin errores incluso si hay problemas
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Crea automáticamente un perfil cuando se crea un usuario en auth.users. Manejo de errores robusto para evitar que falle la autenticación.';

-- ============================================
-- 3. VERIFICAR POLÍTICAS RLS QUE PUEDEN FALLAR
-- ============================================
-- Algunas políticas RLS pueden fallar si intentan acceder a campos que no existen
-- Verificar y corregir políticas problemáticas

-- Política de profiles: asegurar que no falla con usuarios nuevos
DROP POLICY IF EXISTS "Profiles visibles para todos" ON public.profiles;
CREATE POLICY "Profiles visibles para todos"
  ON public.profiles FOR SELECT
  USING (true);

-- Política de actualización: asegurar que funciona con usuarios nuevos
DROP POLICY IF EXISTS "Usuarios pueden editar su perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden editar su perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política de inserción: asegurar que funciona durante la creación
DROP POLICY IF EXISTS "Usuarios pueden insertar su perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden insertar su perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- ============================================
-- 4. VERIFICAR FUNCIONES QUE USAN auth.uid()
-- ============================================
-- Algunas funciones pueden fallar si auth.uid() retorna NULL durante la autenticación
-- Verificar funciones críticas

-- Función para verificar si un usuario puede crear conversaciones
-- Asegurar que no falla con usuarios nuevos
CREATE OR REPLACE FUNCTION public.can_user_create_conversation(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_plan text;
  active_count integer;
  max_allowed integer;
BEGIN
  -- Si user_id es NULL, retornar false
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obtener el plan del usuario de forma segura
  SELECT plan_id INTO user_plan
  FROM public.subscriptions
  WHERE user_id = can_user_create_conversation.user_id
    AND status = 'active'
  LIMIT 1;
  
  -- Si no tiene plan activo, usar plan free
  IF user_plan IS NULL THEN
    user_plan := 'tenant_free';
  END IF;
  
  -- Contar conversaciones activas
  SELECT COUNT(*) INTO active_count
  FROM public.conversations
  WHERE tenant_id = can_user_create_conversation.user_id
    AND status = 'active';
  
  -- Verificar límites según el plan
  IF user_plan LIKE '%_pro' THEN
    -- Plan PRO: ilimitado
    RETURN true;
  ELSE
    -- Plan Free: límite de 5 conversaciones
    max_allowed := 5;
    RETURN active_count < max_allowed;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay algún error, retornar false de forma segura
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. VERIFICAR QUE NO HAY PROBLEMAS CON TRIGGERS
-- ============================================
-- Asegurar que el trigger está correctamente configurado
DO $$
BEGIN
  -- Verificar que el trigger existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' 
      AND c.relname = 'users' 
      AND t.tgname = 'on_auth_user_created'
  ) THEN
    -- Recrear el trigger si no existe
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE '✓ Trigger on_auth_user_created recreado';
  ELSE
    RAISE NOTICE '✓ Trigger on_auth_user_created existe';
  END IF;
END $$;

-- ============================================
-- 6. VERIFICAR QUE LOS USUARIOS NUEVOS TIENEN PERFILES CORRECTOS
-- ============================================
-- Crear perfiles para usuarios que no tienen perfil
INSERT INTO public.profiles (id, email, full_name, role, publisher_type)
SELECT 
  u.id,
  COALESCE(u.email, 'sin-email-' || u.id::text || '@rencolombia.com'),
  COALESCE(u.raw_user_meta_data->>'full_name', 'Usuario'),
  'tenant',
  NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Corregir usuarios que tienen role NULL
UPDATE public.profiles
SET role = 'tenant'
WHERE role IS NULL;

-- Corregir usuarios que tienen email NULL o vacío
UPDATE public.profiles p
SET email = COALESCE(
  (SELECT email FROM auth.users WHERE id = p.id),
  'sin-email-' || p.id::text || '@rencolombia.com'
)
WHERE p.email IS NULL OR p.email = '';

-- ============================================
-- RESUMEN
-- ============================================
DO $$
DECLARE
  v_users_without_profile INTEGER;
  v_profiles_without_role INTEGER;
  v_profiles_without_email INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_users_without_profile
  FROM auth.users
  WHERE id NOT IN (SELECT id FROM public.profiles);
  
  SELECT COUNT(*) INTO v_profiles_without_role
  FROM public.profiles
  WHERE role IS NULL;
  
  SELECT COUNT(*) INTO v_profiles_without_email
  FROM public.profiles
  WHERE email IS NULL OR email = '';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Resumen de correcciones:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuarios sin perfil: %', v_users_without_profile;
  RAISE NOTICE 'Perfiles sin role: %', v_profiles_without_role;
  RAISE NOTICE 'Perfiles sin email: %', v_profiles_without_email;
  RAISE NOTICE '========================================';
  
  IF v_users_without_profile = 0 AND v_profiles_without_role = 0 AND v_profiles_without_email = 0 THEN
    RAISE NOTICE '✓ Todos los usuarios tienen perfiles correctos';
  ELSE
    RAISE WARNING '⚠ Aún hay problemas que corregir';
  END IF;
END $$;
