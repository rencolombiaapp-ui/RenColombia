-- Migración: Sistema de captura de interés en planes PRO
-- Objetivo: Medir intención real de pago para planes PRO antes de activar monetización
-- Fecha: 2024

-- Crear enum para roles
CREATE TYPE pro_plan_role AS ENUM ('tenant', 'landlord', 'inmobiliaria');

-- Crear enum para tipos de plan
CREATE TYPE pro_plan_type AS ENUM ('tenant_pro', 'landlord_pro', 'inmobiliaria_pro');

-- Crear tabla pro_plan_interest
CREATE TABLE IF NOT EXISTS pro_plan_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role pro_plan_role NOT NULL,
  plan_type pro_plan_type NOT NULL,
  source TEXT, -- Ej: pricing_page, landing, property_detail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Restricción: Un usuario solo puede registrar 1 interés por tipo de plan
  CONSTRAINT unique_user_plan_type UNIQUE (user_id, plan_type)
);

-- Crear índice para búsquedas rápidas por plan_type y role
CREATE INDEX IF NOT EXISTS idx_pro_plan_interest_plan_type ON pro_plan_interest(plan_type);
CREATE INDEX IF NOT EXISTS idx_pro_plan_interest_role ON pro_plan_interest(role);
CREATE INDEX IF NOT EXISTS idx_pro_plan_interest_created_at ON pro_plan_interest(created_at DESC);

-- Habilitar RLS
ALTER TABLE pro_plan_interest ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuarios solo pueden insertar su propio interés
CREATE POLICY "Users can insert their own pro plan interest"
  ON pro_plan_interest
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política RLS: Usuarios solo pueden leer su propio interés
CREATE POLICY "Users can read their own pro plan interest"
  ON pro_plan_interest
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política RLS: Solo admins pueden leer todos los intereses
-- Nota: Esta política requiere que exista una función o tabla de admins
-- Por ahora, se puede ajustar según la estructura de roles del sistema
CREATE POLICY "Admins can read all pro plan interests"
  ON pro_plan_interest
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Comentarios para documentación
COMMENT ON TABLE pro_plan_interest IS 'Captura de interés en planes PRO para medir intención de pago antes de activar monetización';
COMMENT ON COLUMN pro_plan_interest.user_id IS 'ID del usuario que mostró interés';
COMMENT ON COLUMN pro_plan_interest.email IS 'Email del usuario para campañas futuras';
COMMENT ON COLUMN pro_plan_interest.role IS 'Rol del usuario: tenant, landlord o inmobiliaria';
COMMENT ON COLUMN pro_plan_interest.plan_type IS 'Tipo de plan PRO de interés: tenant_pro, landlord_pro o inmobiliaria_pro';
COMMENT ON COLUMN pro_plan_interest.source IS 'Fuente del interés: pricing_page, landing, property_detail, etc.';
COMMENT ON COLUMN pro_plan_interest.created_at IS 'Fecha y hora en que se registró el interés';

-- Función helper para verificar si un usuario ya tiene interés registrado
CREATE OR REPLACE FUNCTION has_pro_plan_interest(p_user_id UUID, p_plan_type pro_plan_type)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pro_plan_interest
    WHERE user_id = p_user_id
    AND plan_type = p_plan_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de interés (solo para admins)
CREATE OR REPLACE FUNCTION get_pro_plan_interest_stats()
RETURNS TABLE (
  plan_type pro_plan_type,
  role pro_plan_role,
  total_count BIGINT,
  latest_interest TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Verificar que el usuario es admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    ppi.plan_type,
    ppi.role,
    COUNT(*)::BIGINT as total_count,
    MAX(ppi.created_at) as latest_interest
  FROM pro_plan_interest ppi
  GROUP BY ppi.plan_type, ppi.role
  ORDER BY ppi.plan_type, ppi.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
