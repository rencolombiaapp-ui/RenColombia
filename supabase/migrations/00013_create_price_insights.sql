-- Tabla para almacenar insights de precios calculados (cache)
create table public.price_insights (
  id uuid default uuid_generate_v4() primary key,
  city text not null,
  neighborhood text,
  property_type text not null,
  area_min integer,
  area_max integer,
  average_price decimal(12, 2) not null,
  median_price decimal(12, 2) not null,
  min_price decimal(12, 2) not null,
  max_price decimal(12, 2) not null,
  recommended_min decimal(12, 2) not null,
  recommended_max decimal(12, 2) not null,
  sample_size integer not null default 0,
  calculated_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  
  -- Índice único compuesto para búsquedas rápidas
  unique(city, neighborhood, property_type, area_min, area_max)
);

-- Comentarios para documentación
comment on table public.price_insights is 'Cache de análisis de precios por zona, tipo de inmueble y área';
comment on column public.price_insights.city is 'Ciudad del análisis';
comment on column public.price_insights.neighborhood is 'Barrio del análisis (null para análisis por ciudad)';
comment on column public.price_insights.property_type is 'Tipo de inmueble analizado';
comment on column public.price_insights.area_min is 'Área mínima considerada en m²';
comment on column public.price_insights.area_max is 'Área máxima considerada en m²';
comment on column public.price_insights.average_price is 'Precio promedio calculado';
comment on column public.price_insights.median_price is 'Precio mediana calculado';
comment on column public.price_insights.recommended_min is 'Rango recomendado mínimo';
comment on column public.price_insights.recommended_max is 'Rango recomendado máximo';
comment on column public.price_insights.sample_size is 'Número de inmuebles usados para el cálculo';
comment on column public.price_insights.expires_at is 'Fecha de expiración del cache (24 horas)';

-- Índices para búsquedas rápidas
create index price_insights_city_idx on public.price_insights(city);
create index price_insights_neighborhood_idx on public.price_insights(neighborhood);
create index price_insights_property_type_idx on public.price_insights(property_type);
create index price_insights_expires_at_idx on public.price_insights(expires_at);

-- RLS para price_insights
alter table public.price_insights enable row level security;

-- Cualquiera puede leer los insights (público)
create policy "Cualquiera puede leer price insights"
  on public.price_insights for select
  using (true);

-- Solo el sistema puede insertar/actualizar (usando service role)
-- Los usuarios no pueden modificar directamente

-- Función para limpiar insights expirados (ejecutar periódicamente)
create or replace function public.cleanup_expired_price_insights()
returns void as $$
begin
  delete from public.price_insights
  where expires_at < now();
end;
$$ language plpgsql security definer;

-- Comentario para la función
comment on function public.cleanup_expired_price_insights() is 'Limpia los registros de price_insights expirados';
