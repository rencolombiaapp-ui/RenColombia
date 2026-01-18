-- ============================================
-- Script Rápido para Testing de Análisis de Precios
-- RenColombia - Testing
-- ============================================
-- 
-- Este script ayuda a preparar datos de prueba rápidamente
-- Ejecutar en Supabase SQL Editor
--
-- ============================================

-- ============================================
-- 1. LIMPIAR DATOS DE PRUEBA ANTERIORES (Opcional)
-- ============================================

-- Descomentar si quieres limpiar todo:
-- DELETE FROM public.price_insights WHERE city LIKE '%TEST%';
-- DELETE FROM public.properties WHERE title LIKE '%TEST%';

-- ============================================
-- 2. CREAR PROPIEDADES DE PRUEBA
-- ============================================
-- IMPORTANTE: Reemplaza 'TU_USER_ID_AQUI' con tu user_id real
-- Puedes obtenerlo con: SELECT id FROM auth.users WHERE email = 'tu_email@ejemplo.com';

-- Propiedades en Bogotá - Chapinero (para datos propios suficientes)
INSERT INTO public.properties (
  owner_id,
  title,
  description,
  city,
  neighborhood,
  property_type,
  price,
  bedrooms,
  bathrooms,
  area,
  status,
  created_at
) VALUES
  -- Reemplaza 'TU_USER_ID_AQUI' con tu user_id
  (
    'TU_USER_ID_AQUI', -- ⚠️ CAMBIAR ESTO
    'TEST - Apartamento Chapinero 1',
    'Apartamento de prueba para análisis de precios',
    'Bogotá',
    'Chapinero',
    'apartamento',
    2500000,
    2,
    2,
    60,
    'published',
    NOW()
  ),
  (
    'TU_USER_ID_AQUI', -- ⚠️ CAMBIAR ESTO
    'TEST - Apartamento Chapinero 2',
    'Apartamento de prueba para análisis de precios',
    'Bogotá',
    'Chapinero',
    'apartamento',
    2800000,
    3,
    2,
    70,
    'published',
    NOW()
  ),
  (
    'TU_USER_ID_AQUI', -- ⚠️ CAMBIAR ESTO
    'TEST - Apartamento Chapinero 3',
    'Apartamento de prueba para análisis de precios',
    'Bogotá',
    'Chapinero',
    'apartamento',
    2300000,
    2,
    1,
    55,
    'published',
    NOW()
  ),
  (
    'TU_USER_ID_AQUI', -- ⚠️ CAMBIAR ESTO
    'TEST - Apartamento Chapinero 4',
    'Apartamento de prueba para análisis de precios',
    'Bogotá',
    'Chapinero',
    'apartamento',
    2700000,
    3,
    2,
    75,
    'published',
    NOW()
  ),
  (
    'TU_USER_ID_AQUI', -- ⚠️ CAMBIAR ESTO
    'TEST - Apartamento Chapinero 5',
    'Apartamento de prueba para análisis de precios',
    'Bogotá',
    'Chapinero',
    'apartamento',
    2400000,
    2,
    2,
    65,
    'published',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Propiedad única en zona diferente (para probar fallback)
INSERT INTO public.properties (
  owner_id,
  title,
  description,
  city,
  neighborhood,
  property_type,
  price,
  bedrooms,
  bathrooms,
  area,
  status,
  created_at
) VALUES
  (
    'TU_USER_ID_AQUI', -- ⚠️ CAMBIAR ESTO
    'TEST - Casa Usaquén (Fallback)',
    'Casa de prueba para probar fallback market-stats',
    'Bogotá',
    'Usaquén',
    'casa',
    3500000,
    3,
    3,
    120,
    'published',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. INSERTAR DATOS DANE DE REFERENCIA
-- ============================================

INSERT INTO public.dane_reference_data (
  city,
  property_type,
  reference_price,
  data_period,
  source_url,
  notes,
  expires_at
) VALUES
  (
    'Bogotá D.C.',
    'apartamento',
    2500000,
    '2024-Q1',
    'https://www.dane.gov.co/',
    'Datos de prueba para validación DANE',
    NOW() + INTERVAL '6 months'
  ),
  (
    'Bogotá D.C.',
    'casa',
    3500000,
    '2024-Q1',
    'https://www.dane.gov.co/',
    'Datos de prueba para validación DANE',
    NOW() + INTERVAL '6 months'
  )
ON CONFLICT (city, property_type, data_period) 
DO UPDATE SET
  reference_price = EXCLUDED.reference_price,
  updated_at = NOW(),
  expires_at = EXCLUDED.expires_at;

-- ============================================
-- 4. LIMPIAR CACHÉ DE ANÁLISIS (Opcional)
-- ============================================
-- Descomentar si quieres forzar recálculo:

-- DELETE FROM public.price_insights 
-- WHERE city = 'Bogotá' 
--   AND property_type IN ('apartamento', 'casa');

-- ============================================
-- 5. VERIFICAR DATOS INSERTADOS
-- ============================================

-- Ver propiedades creadas
SELECT 
  id,
  title,
  city,
  neighborhood,
  property_type,
  price,
  status
FROM public.properties
WHERE title LIKE 'TEST%'
ORDER BY created_at DESC;

-- Ver datos DANE
SELECT 
  city,
  property_type,
  reference_price,
  data_period,
  expires_at
FROM public.dane_reference_data
WHERE city = 'Bogotá D.C.';

-- Ver análisis cacheados (si existen)
SELECT 
  city,
  neighborhood,
  property_type,
  sample_size,
  source,
  analysis_level,
  calculated_at,
  expires_at
FROM public.price_insights
WHERE city = 'Bogotá'
ORDER BY calculated_at DESC;

-- ============================================
-- 6. OBTENER TU USER_ID (Si no lo sabes)
-- ============================================
-- Ejecuta esto y copia el id:

-- SELECT id, email, created_at 
-- FROM auth.users 
-- WHERE email = 'tu_email@ejemplo.com';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- 
-- PRÓXIMOS PASOS:
-- 1. Reemplaza 'TU_USER_ID_AQUI' con tu user_id real
-- 2. Ejecuta el script completo
-- 3. Ve a la aplicación y prueba:
--    - Buscar análisis en Bogotá - Chapinero - Apartamento
--    - Buscar análisis en Bogotá - Usaquén - Casa (fallback)
-- 4. Verifica textos, badges y disclaimers
--
-- ============================================
