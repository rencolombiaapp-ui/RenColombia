-- Agregar campos extendidos a la tabla properties
alter table public.properties
  add column if not exists departamento text,
  add column if not exists municipio text,
  add column if not exists tiene_parqueadero boolean default false,
  add column if not exists cantidad_parqueaderos integer,
  add column if not exists estrato integer check (estrato >= 1 and estrato <= 6),
  add column if not exists incluye_administracion boolean default false,
  add column if not exists valor_administracion decimal(12, 2);

-- Comentarios para documentación
comment on column public.properties.departamento is 'Departamento donde se encuentra el inmueble';
comment on column public.properties.municipio is 'Municipio donde se encuentra el inmueble';
comment on column public.properties.tiene_parqueadero is 'Indica si el inmueble tiene parqueadero';
comment on column public.properties.cantidad_parqueaderos is 'Cantidad de parqueaderos (solo si tiene_parqueadero es true)';
comment on column public.properties.estrato is 'Estrato socioeconómico del inmueble (1-6)';
comment on column public.properties.incluye_administracion is 'Indica si el precio incluye administración';
comment on column public.properties.valor_administracion is 'Valor de la administración mensual (solo si incluye_administracion es false)';

-- Índices para búsquedas
create index if not exists properties_departamento_idx on public.properties(departamento);
create index if not exists properties_municipio_idx on public.properties(municipio);
create index if not exists properties_estrato_idx on public.properties(estrato);
