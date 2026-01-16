-- ============================================
-- Agregar contador de vistas a properties
-- ============================================

-- Agregar columna views_count
alter table public.properties
  add column if not exists views_count integer default 0;

-- Crear función para incrementar vistas (evita race conditions)
create or replace function public.increment_property_views(property_id uuid)
returns void as $$
begin
  update public.properties
  set views_count = views_count + 1
  where id = property_id;
end;
$$ language plpgsql security definer;

-- Permitir que cualquier usuario autenticado pueda incrementar vistas
grant execute on function public.increment_property_views(uuid) to authenticated;
