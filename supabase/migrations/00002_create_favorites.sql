-- ============================================
-- RenColombia MVP - Tabla Favorites
-- ============================================

-- TABLA: favorites (favoritos de usuarios)
create table public.favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  
  -- Un usuario solo puede tener una vez el mismo favorito
  unique(user_id, property_id)
);

-- Índices para búsquedas rápidas
create index favorites_user_idx on public.favorites(user_id);
create index favorites_property_idx on public.favorites(property_id);

-- RLS para favorites
alter table public.favorites enable row level security;

-- Policy: usuario solo ve sus propios favoritos
create policy "Usuarios ven sus favoritos"
  on public.favorites for select
  using (auth.uid() = user_id);

-- Policy: usuario solo puede agregar sus propios favoritos
create policy "Usuarios agregan sus favoritos"
  on public.favorites for insert
  with check (auth.uid() = user_id);

-- Policy: usuario solo puede eliminar sus propios favoritos
create policy "Usuarios eliminan sus favoritos"
  on public.favorites for delete
  using (auth.uid() = user_id);
