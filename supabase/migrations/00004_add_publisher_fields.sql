-- ============================================
-- Agregar campos de publisher (inmobiliaria) a profiles
-- ============================================

-- Agregar campos para soporte de inmobiliarias
alter table public.profiles
  add column if not exists publisher_type text default 'individual' check (publisher_type in ('individual', 'inmobiliaria')),
  add column if not exists company_name text,
  add column if not exists company_logo text,
  add column if not exists phone text,
  add column if not exists address text;

-- Comentarios para documentación
comment on column public.profiles.publisher_type is 'Tipo de publicador: individual o inmobiliaria';
comment on column public.profiles.company_name is 'Nombre comercial de la inmobiliaria (solo si publisher_type = inmobiliaria)';
comment on column public.profiles.company_logo is 'URL del logo de la inmobiliaria (almacenado en storage)';
comment on column public.profiles.phone is 'Teléfono de contacto (opcional)';
comment on column public.profiles.address is 'Dirección de la inmobiliaria (opcional)';
comment on column public.profiles.address is 'Dirección de la inmobiliaria (opcional)';