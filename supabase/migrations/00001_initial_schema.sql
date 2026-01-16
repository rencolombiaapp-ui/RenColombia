-- ============================================
-- RenColombia MVP - Schema Mínimo
-- Solo campos esenciales
-- ============================================

-- Extensión UUID
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLA: profiles (usuarios)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text default 'tenant' check (role in ('tenant', 'landlord')),
  created_at timestamp with time zone default now()
);

-- RLS para profiles
alter table public.profiles enable row level security;

create policy "Profiles visibles para todos"
  on public.profiles for select using (true);

create policy "Usuarios pueden editar su perfil"
  on public.profiles for update using (auth.uid() = id);

create policy "Usuarios pueden insertar su perfil"
  on public.profiles for insert with check (auth.uid() = id);

-- Trigger: crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- TABLA: properties (propiedades)
-- ============================================
create table public.properties (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  city text not null,
  neighborhood text,
  address text,
  price decimal(12, 2) not null,
  property_type text default 'apartamento' check (property_type in ('apartamento', 'casa', 'apartaestudio', 'local', 'loft', 'penthouse')),
  bedrooms integer default 1,
  bathrooms integer default 1,
  area integer,
  status text default 'published' check (status in ('draft', 'published', 'rented', 'paused')),
  is_featured boolean default false,
  created_at timestamp with time zone default now()
);

-- Índices básicos
create index properties_city_idx on public.properties(city);
create index properties_status_idx on public.properties(status);
create index properties_owner_idx on public.properties(owner_id);

-- RLS para properties
alter table public.properties enable row level security;

create policy "Propiedades publicadas visibles para todos"
  on public.properties for select
  using (status = 'published' or owner_id = auth.uid());

create policy "Propietarios pueden insertar"
  on public.properties for insert
  with check (auth.uid() = owner_id);

create policy "Propietarios pueden editar sus propiedades"
  on public.properties for update
  using (auth.uid() = owner_id);

create policy "Propietarios pueden eliminar sus propiedades"
  on public.properties for delete
  using (auth.uid() = owner_id);

-- ============================================
-- TABLA: property_images (imágenes)
-- ============================================
create table public.property_images (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  url text not null,
  is_primary boolean default false,
  created_at timestamp with time zone default now()
);

-- RLS para property_images
alter table public.property_images enable row level security;

create policy "Imágenes visibles para todos"
  on public.property_images for select using (true);

create policy "Propietarios pueden gestionar imágenes"
  on public.property_images for all
  using (
    exists (
      select 1 from public.properties 
      where id = property_images.property_id 
      and owner_id = auth.uid()
    )
  );

-- ============================================
-- STORAGE: bucket para imágenes
-- ============================================
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

-- Política de storage: cualquiera puede ver
create policy "Imágenes públicas"
  on storage.objects for select
  using (bucket_id = 'property-images');

-- Política de storage: usuarios autenticados pueden subir
create policy "Usuarios autenticados pueden subir"
  on storage.objects for insert
  with check (bucket_id = 'property-images' and auth.role() = 'authenticated');

-- Política de storage: usuarios pueden eliminar sus archivos
create policy "Usuarios pueden eliminar sus archivos"
  on storage.objects for delete
  using (bucket_id = 'property-images' and auth.uid()::text = (storage.foldername(name))[1]);
