-- Agregar campos de coordenadas geográficas a la tabla properties
alter table public.properties
  add column if not exists latitude decimal(10, 8),
  add column if not exists longitude decimal(11, 8);

-- Comentarios para documentación
comment on column public.properties.latitude is 'Latitud geográfica del inmueble (geocodificada desde dirección)';
comment on column public.properties.longitude is 'Longitud geográfica del inmueble (geocodificada desde dirección)';

-- Índice para búsquedas geográficas (útil para futuras funcionalidades)
create index if not exists properties_location_idx on public.properties using gist (
  point(longitude, latitude)
) where latitude is not null and longitude is not null;
