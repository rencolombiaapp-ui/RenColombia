-- ============================================
-- Crear tabla de reviews (calificaciones)
-- ============================================

create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  user_type text not null check (user_type in ('inquilino', 'propietario', 'inmobiliaria')),
  created_at timestamp with time zone default now(),

  -- Un usuario solo puede tener una review
  unique (user_id)
);

-- Índices para optimizar consultas
create index if not exists reviews_user_id_idx on public.reviews (user_id);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);
create index if not exists reviews_rating_idx on public.reviews (rating);

-- Habilitar RLS
alter table public.reviews enable row level security;

-- Política: Todos pueden leer reviews (públicas)
create policy "Anyone can view reviews."
  on public.reviews for select
  using (true);

-- Política: Usuarios autenticados pueden crear su propia review
create policy "Users can insert their own review."
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- Política: Usuarios pueden actualizar su propia review
create policy "Users can update their own review."
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Comentarios para documentación
comment on table public.reviews is 'Calificaciones y comentarios de usuarios sobre su experiencia con RenColombia';
comment on column public.reviews.rating is 'Calificación de 1 a 5 estrellas';
comment on column public.reviews.user_type is 'Tipo de usuario: inquilino, propietario o inmobiliaria';
comment on column public.reviews.comment is 'Comentario opcional del usuario';
