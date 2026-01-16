-- ============================================
-- Seguros de Arrendamiento e Intenciones de Inmuebles
-- ============================================

-- ============================================
-- TABLA: tenant_insurance_approvals (Aprobaciones de seguros)
-- ============================================
create table if not exists public.tenant_insurance_approvals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  insurer_name text not null,
  document_url text not null,
  valid_until date not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Un usuario solo puede tener una aprobación activa por aseguradora
  unique(user_id, insurer_name)
);

-- Comentarios
comment on table public.tenant_insurance_approvals is 'Aprobaciones de seguros de arrendamiento de inquilinos';
comment on column public.tenant_insurance_approvals.user_id is 'Usuario inquilino que tiene la aprobación';
comment on column public.tenant_insurance_approvals.insurer_name is 'Nombre de la aseguradora';
comment on column public.tenant_insurance_approvals.document_url is 'URL del documento de aprobación almacenado';
comment on column public.tenant_insurance_approvals.valid_until is 'Fecha hasta la cual es válida la aprobación';

-- Índices
create index if not exists tenant_insurance_approvals_user_idx on public.tenant_insurance_approvals(user_id);
create index if not exists tenant_insurance_approvals_valid_until_idx on public.tenant_insurance_approvals(valid_until);

-- ============================================
-- TABLA: property_intentions (Intenciones de arrendar)
-- ============================================
create table if not exists public.property_intentions (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  tenant_id uuid references public.profiles(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'viewed', 'contacted', 'closed')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Un inquilino solo puede tener una intención activa por inmueble
  unique(tenant_id, property_id)
);

-- Comentarios
comment on table public.property_intentions is 'Intenciones de inquilinos de arrendar inmuebles específicos';
comment on column public.property_intentions.property_id is 'Inmueble sobre el que se manifiesta interés';
comment on column public.property_intentions.tenant_id is 'Usuario inquilino que manifiesta interés';
comment on column public.property_intentions.owner_id is 'Propietario o inmobiliaria dueña del inmueble';
comment on column public.property_intentions.status is 'Estado de la intención: pending (pendiente), viewed (vista), contacted (contactado), closed (cerrada)';

-- Índices
create index if not exists property_intentions_property_idx on public.property_intentions(property_id);
create index if not exists property_intentions_tenant_idx on public.property_intentions(tenant_id);
create index if not exists property_intentions_owner_idx on public.property_intentions(owner_id);
create index if not exists property_intentions_status_idx on public.property_intentions(status);
create index if not exists property_intentions_created_idx on public.property_intentions(created_at desc);


-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- RLS para tenant_insurance_approvals
alter table public.tenant_insurance_approvals enable row level security;

-- Eliminar políticas existentes si existen
drop policy if exists "Usuarios ven sus aprobaciones" on public.tenant_insurance_approvals;
drop policy if exists "Usuarios crean sus aprobaciones" on public.tenant_insurance_approvals;
drop policy if exists "Usuarios actualizan sus aprobaciones" on public.tenant_insurance_approvals;
drop policy if exists "Usuarios eliminan sus aprobaciones" on public.tenant_insurance_approvals;

-- Policy: Los usuarios pueden ver sus propias aprobaciones
create policy "Usuarios ven sus aprobaciones"
  on public.tenant_insurance_approvals for select
  using (auth.uid() = user_id);

-- Policy: Los usuarios pueden crear sus propias aprobaciones
create policy "Usuarios crean sus aprobaciones"
  on public.tenant_insurance_approvals for insert
  with check (auth.uid() = user_id);

-- Policy: Los usuarios pueden actualizar sus propias aprobaciones
create policy "Usuarios actualizan sus aprobaciones"
  on public.tenant_insurance_approvals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Los usuarios pueden eliminar sus propias aprobaciones
create policy "Usuarios eliminan sus aprobaciones"
  on public.tenant_insurance_approvals for delete
  using (auth.uid() = user_id);

-- RLS para property_intentions
alter table public.property_intentions enable row level security;

-- Eliminar políticas existentes si existen
drop policy if exists "Participantes pueden ver intenciones" on public.property_intentions;
drop policy if exists "Inquilinos pueden crear intenciones" on public.property_intentions;
drop policy if exists "Propietarios pueden actualizar intenciones" on public.property_intentions;

-- Policy: Los participantes pueden ver las intenciones
create policy "Participantes pueden ver intenciones"
  on public.property_intentions for select
  using (
    auth.uid() = tenant_id or 
    auth.uid() = owner_id
  );

-- Policy: Los inquilinos pueden crear intenciones
create policy "Inquilinos pueden crear intenciones"
  on public.property_intentions for insert
  with check (
    auth.uid() = tenant_id and
    -- Verificar que el inmueble existe y está publicado
    exists (
      select 1 from public.properties 
      where id = property_id 
      and status = 'published'
    )
  );

-- Policy: Los propietarios pueden actualizar el estado de las intenciones
create policy "Propietarios pueden actualizar intenciones"
  on public.property_intentions for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);


-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para verificar si un inquilino tiene aprobación activa
create or replace function public.has_active_insurance_approval(tenant_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.tenant_insurance_approvals
    where user_id = tenant_uuid
    and valid_until >= current_date
  );
end;
$$ language plpgsql security definer;

-- Función para obtener aprobaciones activas de un inquilino
create or replace function public.get_active_insurance_approvals(tenant_uuid uuid)
returns table (
  id uuid,
  insurer_name text,
  document_url text,
  valid_until date,
  created_at timestamp with time zone
) as $$
begin
  return query
  select 
    tia.id,
    tia.insurer_name,
    tia.document_url,
    tia.valid_until,
    tia.created_at
  from public.tenant_insurance_approvals tia
  where tia.user_id = tenant_uuid
  and tia.valid_until >= current_date
  order by tia.valid_until desc;
end;
$$ language plpgsql security definer;

-- Trigger para actualizar updated_at en tenant_insurance_approvals
create or replace function public.update_tenant_insurance_approval_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_tenant_insurance_approval_updated_at on public.tenant_insurance_approvals;
create trigger update_tenant_insurance_approval_updated_at
  before update on public.tenant_insurance_approvals
  for each row
  execute function public.update_tenant_insurance_approval_updated_at();

-- Trigger para actualizar updated_at en property_intentions
create or replace function public.update_property_intention_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_property_intention_updated_at on public.property_intentions;
create trigger update_property_intention_updated_at
  before update on public.property_intentions
  for each row
  execute function public.update_property_intention_updated_at();


-- ============================================
-- STORAGE: bucket para documentos de seguros
-- ============================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Eliminar políticas existentes si existen (para evitar errores en re-ejecución)
drop policy if exists "Usuarios ven sus documentos" on storage.objects;
drop policy if exists "Usuarios suben sus documentos" on storage.objects;
drop policy if exists "Usuarios eliminan sus documentos" on storage.objects;

-- Política de storage: usuarios pueden ver sus propios documentos
create policy "Usuarios ven sus documentos"
  on storage.objects for select
  using (
    bucket_id = 'documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política de storage: usuarios pueden subir sus propios documentos
create policy "Usuarios suben sus documentos"
  on storage.objects for insert
  with check (
    bucket_id = 'documents' 
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política de storage: usuarios pueden eliminar sus propios documentos
create policy "Usuarios eliminan sus documentos"
  on storage.objects for delete
  using (
    bucket_id = 'documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
