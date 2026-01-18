-- ============================================
-- Ejemplo: Datos de Referencia DANE para Análisis de Precios
-- ============================================
-- IMPORTANTE: Este es un archivo de EJEMPLO
-- Los datos reales deben obtenerse de fuentes oficiales del DANE
-- Solo se almacenan datos agregados, nunca datos crudos

-- ============================================
-- Bogotá D.C.
-- ============================================

-- Apartamentos en Bogotá (ejemplo - datos deben ser reales del DANE)
INSERT INTO public.dane_reference_data (
  city,
  area_metropolitan,
  property_type,
  reference_price,
  data_period,
  source_url,
  notes,
  expires_at
) VALUES (
  'Bogotá D.C.',
  'Bogotá D.C.',
  'apartamento',
  2500000, -- Ejemplo: precio promedio según DANE
  '2024-Q1',
  'https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-de-la-vivienda',
  'Datos agregados del DANE para análisis comparativo. Precio promedio de arriendo de apartamentos en Bogotá D.C.',
  NOW() + INTERVAL '3 months'
) ON CONFLICT (city, property_type, data_period) DO UPDATE
SET
  reference_price = EXCLUDED.reference_price,
  updated_at = NOW(),
  expires_at = EXCLUDED.expires_at;

-- Casas en Bogotá
INSERT INTO public.dane_reference_data (
  city,
  area_metropolitan,
  property_type,
  reference_price,
  data_period,
  source_url,
  notes,
  expires_at
) VALUES (
  'Bogotá D.C.',
  'Bogotá D.C.',
  'casa',
  3500000, -- Ejemplo
  '2024-Q1',
  'https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-de-la-vivienda',
  'Datos agregados del DANE para análisis comparativo. Precio promedio de arriendo de casas en Bogotá D.C.',
  NOW() + INTERVAL '3 months'
) ON CONFLICT (city, property_type, data_period) DO UPDATE
SET
  reference_price = EXCLUDED.reference_price,
  updated_at = NOW(),
  expires_at = EXCLUDED.expires_at;

-- Tipo general (para cuando no hay datos específicos)
INSERT INTO public.dane_reference_data (
  city,
  area_metropolitan,
  property_type,
  reference_price,
  data_period,
  source_url,
  notes,
  expires_at
) VALUES (
  'Bogotá D.C.',
  'Bogotá D.C.',
  'general',
  2700000, -- Ejemplo: promedio general
  '2024-Q1',
  'https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-de-la-vivienda',
  'Datos agregados del DANE para análisis comparativo. Precio promedio general de arriendo en Bogotá D.C.',
  NOW() + INTERVAL '3 months'
) ON CONFLICT (city, property_type, data_period) DO UPDATE
SET
  reference_price = EXCLUDED.reference_price,
  updated_at = NOW(),
  expires_at = EXCLUDED.expires_at;

-- ============================================
-- Medellín
-- ============================================

INSERT INTO public.dane_reference_data (
  city,
  area_metropolitan,
  property_type,
  reference_price,
  data_period,
  source_url,
  notes,
  expires_at
) VALUES (
  'Medellín',
  'Área Metropolitana de Medellín',
  'apartamento',
  1800000, -- Ejemplo
  '2024-Q1',
  'https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-de-la-vivienda',
  'Datos agregados del DANE para análisis comparativo. Precio promedio de arriendo de apartamentos en Medellín.',
  NOW() + INTERVAL '3 months'
) ON CONFLICT (city, property_type, data_period) DO UPDATE
SET
  reference_price = EXCLUDED.reference_price,
  updated_at = NOW(),
  expires_at = EXCLUDED.expires_at;

-- ============================================
-- Cali
-- ============================================

INSERT INTO public.dane_reference_data (
  city,
  area_metropolitan,
  property_type,
  reference_price,
  data_period,
  source_url,
  notes,
  expires_at
) VALUES (
  'Cali',
  'Cali',
  'apartamento',
  1500000, -- Ejemplo
  '2024-Q1',
  'https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-de-la-vivienda',
  'Datos agregados del DANE para análisis comparativo. Precio promedio de arriendo de apartamentos en Cali.',
  NOW() + INTERVAL '3 months'
) ON CONFLICT (city, property_type, data_period) DO UPDATE
SET
  reference_price = EXCLUDED.reference_price,
  updated_at = NOW(),
  expires_at = EXCLUDED.expires_at;

-- ============================================
-- Barranquilla
-- ============================================

INSERT INTO public.dane_reference_data (
  city,
  area_metropolitan,
  property_type,
  reference_price,
  data_period,
  source_url,
  notes,
  expires_at
) VALUES (
  'Barranquilla',
  'Barranquilla',
  'apartamento',
  1400000, -- Ejemplo
  '2024-Q1',
  'https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-de-la-vivienda',
  'Datos agregados del DANE para análisis comparativo. Precio promedio de arriendo de apartamentos en Barranquilla.',
  NOW() + INTERVAL '3 months'
) ON CONFLICT (city, property_type, data_period) DO UPDATE
SET
  reference_price = EXCLUDED.reference_price,
  updated_at = NOW(),
  expires_at = EXCLUDED.expires_at;

-- ============================================
-- Cartagena
-- ============================================

INSERT INTO public.dane_reference_data (
  city,
  area_metropolitan,
  property_type,
  reference_price,
  data_period,
  source_url,
  notes,
  expires_at
) VALUES (
  'Cartagena',
  'Cartagena',
  'apartamento',
  1600000, -- Ejemplo
  '2024-Q1',
  'https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-de-la-vivienda',
  'Datos agregados del DANE para análisis comparativo. Precio promedio de arriendo de apartamentos en Cartagena.',
  NOW() + INTERVAL '3 months'
) ON CONFLICT (city, property_type, data_period) DO UPDATE
SET
  reference_price = EXCLUDED.reference_price,
  updated_at = NOW(),
  expires_at = EXCLUDED.expires_at;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- 1. Los precios en este archivo son EJEMPLOS
--    Deben reemplazarse con datos reales del DANE
--
-- 2. Siempre incluir:
--    - source_url: URL oficial del DANE donde se pueden consultar los datos
--    - data_period: Período de los datos (formato: YYYY-QQ o YYYY-MM)
--    - notes: Descripción de cómo se obtuvieron los datos
--    - expires_at: Fecha de expiración (generalmente 3-6 meses)
--
-- 3. Actualizar periódicamente según la frecuencia de publicación del DANE
--
-- 4. NO almacenar datos crudos del DANE, solo referencias agregadas
--
-- 5. Verificar que los datos sean coherentes antes de insertarlos
--
-- ============================================
