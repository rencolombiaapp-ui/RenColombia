-- Agregar campo de características al inmueble
alter table public.properties
  add column if not exists caracteristicas text[] default '{}';

-- Comentario para documentación
comment on column public.properties.caracteristicas is 'Array de características del inmueble (ascensor, balcón, piscina, etc.)';

-- Índice GIN para búsquedas eficientes en arrays
create index if not exists properties_caracteristicas_idx on public.properties using gin(caracteristicas);
