-- ============================================
-- Requisitos para Arrendar
-- ============================================
-- Permite a propietarios e inmobiliarias definir los requisitos necesarios para arrendar sus inmuebles

-- ============================================
-- TABLA: rental_requirements (requisitos de arrendamiento)
-- ============================================
create table if not exists public.rental_requirements (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) on delete cascade not null unique,
  documents_required jsonb default '[]'::jsonb not null,
  deposit_required boolean default false not null,
  deposit_value text,
  advance_payment boolean default false not null,
  admin_included boolean default false not null,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Comentarios
comment on table public.rental_requirements is 'Requisitos para arrendar un inmueble específico';
comment on column public.rental_requirements.property_id is 'Inmueble al que aplican los requisitos (relación 1:1)';
comment on column public.rental_requirements.documents_required is 'Array JSON con los documentos requeridos';
comment on column public.rental_requirements.deposit_required is 'Si se requiere depósito';
comment on column public.rental_requirements.deposit_value is 'Valor del depósito (texto libre)';
comment on column public.rental_requirements.advance_payment is 'Si se requiere mes adelantado';
comment on column public.rental_requirements.admin_included is 'Si la administración está incluida';
comment on column public.rental_requirements.notes is 'Notas adicionales sobre los requisitos';

-- Índices
create index if not exists rental_requirements_property_idx on public.rental_requirements(property_id);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

alter table public.rental_requirements enable row level security;

-- Eliminar políticas existentes si existen
drop policy if exists "Propietarios pueden ver requisitos de sus inmuebles" on public.rental_requirements;
drop policy if exists "Usuarios autenticados pueden ver requisitos" on public.rental_requirements;
drop policy if exists "Propietarios pueden crear requisitos" on public.rental_requirements;
drop policy if exists "Propietarios pueden actualizar requisitos" on public.rental_requirements;
drop policy if exists "Propietarios pueden eliminar requisitos" on public.rental_requirements;

-- Policy: Los propietarios pueden ver los requisitos de sus inmuebles
create policy "Propietarios pueden ver requisitos de sus inmuebles"
  on public.rental_requirements for select
  using (
    exists (
      select 1 from public.properties
      where id = property_id
      and owner_id = auth.uid()
    )
  );

-- Policy: Los usuarios autenticados pueden ver requisitos de inmuebles publicados
create policy "Usuarios autenticados pueden ver requisitos"
  on public.rental_requirements for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.properties
      where id = property_id
      and status = 'published'
    )
  );

-- Policy: Los propietarios pueden crear requisitos para sus inmuebles
create policy "Propietarios pueden crear requisitos"
  on public.rental_requirements for insert
  with check (
    exists (
      select 1 from public.properties
      where id = property_id
      and owner_id = auth.uid()
    )
  );

-- Policy: Los propietarios pueden actualizar requisitos de sus inmuebles
create policy "Propietarios pueden actualizar requisitos"
  on public.rental_requirements for update
  using (
    exists (
      select 1 from public.properties
      where id = property_id
      and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.properties
      where id = property_id
      and owner_id = auth.uid()
    )
  );

-- Policy: Los propietarios pueden eliminar requisitos de sus inmuebles
create policy "Propietarios pueden eliminar requisitos"
  on public.rental_requirements for delete
  using (
    exists (
      select 1 from public.properties
      where id = property_id
      and owner_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at
create or replace function public.update_rental_requirements_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_rental_requirements_updated_at on public.rental_requirements;
create trigger update_rental_requirements_updated_at
  before update on public.rental_requirements
  for each row
  execute function public.update_rental_requirements_updated_at();
