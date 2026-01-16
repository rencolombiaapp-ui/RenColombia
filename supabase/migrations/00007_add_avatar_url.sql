-- ============================================
-- Agregar campo avatar_url a profiles
-- ============================================

-- Agregar columna avatar_url
alter table public.profiles
  add column if not exists avatar_url text;

-- Comentario para documentación
comment on column public.profiles.avatar_url is 'URL del avatar del usuario (almacenado en storage bucket avatars)';

-- ============================================
-- Crear bucket de avatars
-- ============================================

-- Crear bucket para avatares
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Política de storage: cualquiera puede ver avatares
create policy "Avatares públicos"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Política de storage: usuarios autenticados pueden subir su propio avatar
create policy "Usuarios pueden subir su avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política de storage: usuarios pueden actualizar su propio avatar
create policy "Usuarios pueden actualizar su avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' 
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política de storage: usuarios pueden eliminar su propio avatar
create policy "Usuarios pueden eliminar su avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
