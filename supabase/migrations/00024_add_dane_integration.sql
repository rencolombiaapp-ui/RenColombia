-- ============================================
-- Migración: Integración con datos DANE para análisis de precios
-- ============================================
-- Agrega campos para almacenar referencias y validaciones con datos del DANE
-- como fuente secundaria de información macroeconómica

-- Agregar columnas para datos DANE en price_insights
alter table public.price_insights
  add column if not exists dane_reference_price decimal(12, 2),
  add column if not exists dane_deviation_percentage decimal(5, 2),
  add column if not exists dane_coherence_status text check (dane_coherence_status in ('coherent', 'slight_deviation', 'significant_deviation', 'no_data')),
  add column if not exists dane_data_period text,
  add column if not exists data_sources jsonb default '["RenColombia Marketplace Data"]'::jsonb;

-- Comentarios para documentación
comment on column public.price_insights.dane_reference_price is 'Precio de referencia del DANE para la ciudad/área metropolitana (solo para contexto macroeconómico)';
comment on column public.price_insights.dane_deviation_percentage is 'Porcentaje de desviación del promedio calculado respecto al precio de referencia DANE';
comment on column public.price_insights.dane_coherence_status is 'Estado de coherencia: coherent (dentro de rango esperado), slight_deviation (desviación menor al 20%), significant_deviation (desviación mayor al 20%), no_data (sin datos DANE disponibles)';
comment on column public.price_insights.dane_data_period is 'Período de los datos DANE utilizados (ej: "2024-Q1", "2023-12")';
comment on column public.price_insights.data_sources is 'Array JSON con las fuentes de datos utilizadas: ["RenColombia Marketplace Data", "DANE – análisis agregado y elaboración propia"]';

-- Índice para búsquedas por coherencia DANE
create index if not exists price_insights_dane_coherence_idx on public.price_insights(dane_coherence_status);

-- ============================================
-- Tabla para almacenar datos de referencia DANE (cache)
-- ============================================
-- Esta tabla almacena datos agregados del DANE por ciudad/área metropolitana
-- NO almacena datos crudos del DANE, solo referencias agregadas para validación

create table if not exists public.dane_reference_data (
  id uuid default uuid_generate_v4() primary key,
  city text not null,
  area_metropolitan text, -- Área metropolitana si aplica
  property_type text check (property_type in ('apartamento', 'casa', 'apartaestudio', 'local', 'loft', 'penthouse', 'general')),
  reference_price decimal(12, 2) not null, -- Precio promedio de referencia del DANE
  data_period text not null, -- Período de los datos (ej: "2024-Q1")
  source_url text, -- URL de la fuente oficial del DANE (opcional)
  notes text, -- Notas sobre el uso de estos datos
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null, -- Los datos DANE se actualizan periódicamente
  
  -- Índice único compuesto
  unique(city, property_type, data_period)
);

-- Comentarios
comment on table public.dane_reference_data is 'Datos agregados de referencia del DANE para validación macroeconómica. NO contiene datos crudos del DANE, solo referencias agregadas para análisis comparativo.';
comment on column public.dane_reference_data.city is 'Ciudad de referencia';
comment on column public.dane_reference_data.area_metropolitan is 'Área metropolitana si aplica (ej: "Bogotá D.C.", "Área Metropolitana de Medellín")';
comment on column public.dane_reference_data.property_type is 'Tipo de inmueble (general para datos agregados de todos los tipos)';
comment on column public.dane_reference_data.reference_price is 'Precio promedio de referencia del DANE para el período especificado';
comment on column public.dane_reference_data.data_period is 'Período de los datos DANE (formato: YYYY-QQ o YYYY-MM)';
comment on column public.dane_reference_data.source_url is 'URL de la fuente oficial del DANE donde se pueden consultar estos datos';
comment on column public.dane_reference_data.notes is 'Notas sobre cómo se obtuvieron o procesaron estos datos agregados';

-- Índices
create index if not exists dane_reference_data_city_idx on public.dane_reference_data(city);
create index if not exists dane_reference_data_property_type_idx on public.dane_reference_data(property_type);
create index if not exists dane_reference_data_expires_at_idx on public.dane_reference_data(expires_at);

-- RLS para dane_reference_data
alter table public.dane_reference_data enable row level security;

-- Cualquiera puede leer los datos de referencia DANE (público)
create policy "Cualquiera puede leer datos de referencia DANE"
  on public.dane_reference_data for select
  using (true);

-- Solo el sistema puede insertar/actualizar (usando service role)
-- Los usuarios no pueden modificar directamente

-- Función para limpiar datos DANE expirados
create or replace function public.cleanup_expired_dane_data()
returns void as $$
begin
  delete from public.dane_reference_data
  where expires_at < now();
end;
$$ language plpgsql security definer;

comment on function public.cleanup_expired_dane_data() is 'Limpia los registros de dane_reference_data expirados';
