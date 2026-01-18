-- ============================================
-- Migración: Fix Error de Schema durante Autenticación
-- ============================================
-- Este error "Database error querying schema" ocurre cuando Supabase
-- intenta consultar el schema durante el login y encuentra algo que falla
-- ============================================

-- ============================================
-- 1. DESHABILITAR TEMPORALMENTE TODAS LAS VISTAS QUE PUEDEN CAUSAR PROBLEMAS
-- ============================================
-- Las vistas pueden fallar si intentan acceder a datos que no existen
DROP VIEW IF EXISTS public.conversations_with_details CASCADE;

-- Recrear la vista de forma más segura (sin usar auth.uid() directamente)
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
  pt.email as tenant_email,
  pt.full_name as tenant_name,
  po.email as owner_email,
  po.full_name as owner_name
FROM public.conversations c
LEFT JOIN public.properties p ON p.id = c.property_id
LEFT JOIN public.profiles pt ON pt.id = c.tenant_id
LEFT JOIN public.profiles po ON po.id = c.owner_id;

-- ============================================
-- 2. ASEGURAR QUE handle_new_user() ES SECURITY DEFINER Y NO FALLA
-- ============================================
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
  WHERE profiles.role IS NULL;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log del error pero NO fallar la creación del usuario
    RAISE WARNING 'Error al crear perfil para usuario %: %', new.id, SQLERRM;
    RETURN new; -- SIEMPRE retornar new para no bloquear la creación del usuario
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. SIMPLIFICAR POLÍTICAS RLS PARA EVITAR ERRORES
-- ============================================
-- Las políticas RLS pueden fallar si intentan evaluar auth.uid() cuando es NULL

-- Política de SELECT: Permitir acceso a todos los perfiles
DROP POLICY IF EXISTS "Profiles visibles para todos" ON public.profiles;
CREATE POLICY "Profiles visibles para todos"
  ON public.profiles FOR SELECT
  USING (true);

-- Política de UPDATE: Simplificar para evitar errores con auth.uid() NULL
DROP POLICY IF EXISTS "Usuarios pueden editar su perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden editar su perfil"
  ON public.profiles FOR UPDATE
  USING (
    -- Permitir si el usuario está editando su propio perfil
    (auth.uid() IS NOT NULL AND auth.uid() = id)
    OR
    -- Permitir si es service_role (para triggers y funciones SECURITY DEFINER)
    auth.role() = 'service_role'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = id)
    OR auth.role() = 'service_role'
  );

-- Política de INSERT: Simplificar para evitar errores durante creación
DROP POLICY IF EXISTS "Usuarios pueden insertar su perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden insertar su perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (
    -- Permitir si el usuario está insertando su propio perfil
    (auth.uid() IS NOT NULL AND auth.uid() = id)
    OR
    -- Permitir si es service_role (para triggers y funciones SECURITY DEFINER)
    auth.role() = 'service_role'
  );

-- ============================================
-- 4. DESHABILITAR TEMPORALMENTE FUNCIONES QUE PUEDEN CAUSAR PROBLEMAS
-- ============================================
-- Comentar funciones que usan auth.uid() y pueden fallar durante la autenticación
-- Si el problema se resuelve, sabremos que una de estas funciones es la causa

-- Función can_user_create_conversation - asegurar que maneja NULL correctamente
CREATE OR REPLACE FUNCTION public.can_user_create_conversation(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_plan text;
  active_count integer;
  max_allowed integer;
BEGIN
  -- Si user_id es NULL, retornar false de forma segura
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obtener el plan del usuario de forma segura
  BEGIN
    SELECT plan_id INTO user_plan
    FROM public.subscriptions
    WHERE user_id = can_user_create_conversation.user_id
      AND status = 'active'
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      user_plan := NULL;
  END;
  
  -- Si no tiene plan activo, usar plan free
  IF user_plan IS NULL THEN
    user_plan := 'tenant_free';
  END IF;
  
  -- Contar conversaciones activas de forma segura
  BEGIN
    SELECT COUNT(*) INTO active_count
    FROM public.conversations
    WHERE tenant_id = can_user_create_conversation.user_id
      AND status = 'active';
  EXCEPTION
    WHEN OTHERS THEN
      active_count := 0;
  END;
  
  -- Verificar límites según el plan
  IF user_plan LIKE '%_pro' THEN
    RETURN true;
  ELSE
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
DO $$
BEGIN
  -- Asegurar que el trigger existe y está activo
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' 
      AND c.relname = 'users' 
      AND t.tgname = 'on_auth_user_created'
      AND t.tgenabled = 'O'
  ) THEN
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
-- RESUMEN
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migración completada';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cambios aplicados:';
  RAISE NOTICE '1. Vista conversations_with_details recreada';
  RAISE NOTICE '2. Función handle_new_user() mejorada';
  RAISE NOTICE '3. Políticas RLS simplificadas';
  RAISE NOTICE '4. Función can_user_create_conversation mejorada';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Prueba el login ahora con tiloinquilino@test.com';
  RAISE NOTICE '========================================';
END $$;
