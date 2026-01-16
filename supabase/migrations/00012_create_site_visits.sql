-- Tabla para almacenar el contador de visitas del sitio
create table public.site_visits (
  id uuid default uuid_generate_v4() primary key,
  total_visits integer not null default 0,
  updated_at timestamp with time zone default now()
);

-- Comentarios para documentación
comment on table public.site_visits is 'Contador de visitas totales al sitio';
comment on column public.site_visits.total_visits is 'Número total de visitas al sitio';
comment on column public.site_visits.updated_at is 'Fecha y hora de la última actualización';

-- RLS para site_visits
alter table public.site_visits enable row level security;

-- Cualquiera puede leer el contador (público)
create policy "Cualquiera puede leer el contador"
  on public.site_visits for select
  using (true);

-- Cualquiera puede actualizar el contador (para incrementar visitas)
create policy "Cualquiera puede actualizar el contador"
  on public.site_visits for update
  using (true)
  with check (true);

-- Inicializar con un registro y total_visits = 0 (solo si no existe)
do $$
begin
  if not exists (select 1 from public.site_visits limit 1) then
    insert into public.site_visits (id, total_visits, updated_at)
    values (uuid_generate_v4(), 0, now());
  end if;
end $$;

-- Crear función para incrementar el contador de forma segura
create or replace function public.increment_site_visits()
returns integer as $$
declare
  new_count integer;
begin
  -- Incrementar el contador usando el primer registro (solo debe haber uno)
  update public.site_visits
  set 
    total_visits = total_visits + 1,
    updated_at = now()
  where id = (select id from public.site_visits order by updated_at limit 1)
  returning total_visits into new_count;
  
  -- Si no hay registros, crear uno
  if new_count is null then
    insert into public.site_visits (total_visits, updated_at)
    values (1, now())
    returning total_visits into new_count;
  end if;
  
  return new_count;
end;
$$ language plpgsql security definer;

-- Comentario para la función
comment on function public.increment_site_visits() is 'Incrementa el contador de visitas de forma segura y retorna el nuevo total';
