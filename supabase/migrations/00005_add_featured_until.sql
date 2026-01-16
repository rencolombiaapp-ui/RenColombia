-- ============================================
-- Agregar campo featured_until para inmuebles destacados
-- ============================================

-- Agregar campo para fecha de expiración del destacado
alter table public.properties
  add column if not exists featured_until timestamp with time zone;

-- Comentario para documentación
comment on column public.properties.featured_until is 'Fecha hasta la cual el inmueble está destacado (nullable, para expiración futura)';

-- Índice para consultas de destacados activos (opcional, para optimización futura)
create index if not exists properties_featured_idx on public.properties(is_featured, featured_until) where is_featured = true;
