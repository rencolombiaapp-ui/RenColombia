-- ============================================
-- Sistema de Reportes de Soporte
-- ============================================
-- Permite a los usuarios reportar problemas, errores o sugerencias

-- ============================================
-- TABLA: support_reports (reportes de soporte)
-- ============================================
create table if not exists public.support_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  type text not null check (type in (
    'error_platform',
    'problem_publication',
    'problem_payment',
    'suggestion',
    'other'
  )),
  section text,
  description text not null,
  status text default 'open' check (status in ('open', 'in_review', 'closed')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Comentarios
comment on table public.support_reports is 'Reportes de problemas y sugerencias de los usuarios';
comment on column public.support_reports.user_id is 'Usuario que reporta (nullable para permitir reportes sin sesión)';
comment on column public.support_reports.email is 'Correo de contacto del usuario';
comment on column public.support_reports.type is 'Tipo de reporte: error_platform, problem_publication, problem_payment, suggestion, other';
comment on column public.support_reports.section is 'Sección de la plataforma afectada (opcional)';
comment on column public.support_reports.description is 'Descripción detallada del problema o sugerencia';
comment on column public.support_reports.status is 'Estado del reporte: open (abierto), in_review (en revisión), closed (cerrado)';

-- Índices para búsquedas rápidas
create index if not exists support_reports_user_idx on public.support_reports(user_id);
create index if not exists support_reports_status_idx on public.support_reports(status);
create index if not exists support_reports_type_idx on public.support_reports(type);
create index if not exists support_reports_created_idx on public.support_reports(created_at desc);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- RLS para support_reports
alter table public.support_reports enable row level security;

-- Eliminar políticas existentes si existen (para evitar errores en re-ejecución)
drop policy if exists "Usuarios pueden ver sus reportes" on public.support_reports;
drop policy if exists "Cualquiera puede crear reportes" on public.support_reports;
drop policy if exists "Usuarios pueden actualizar sus reportes abiertos" on public.support_reports;

-- Policy: Los usuarios pueden ver sus propios reportes
create policy "Usuarios pueden ver sus reportes"
  on public.support_reports for select
  using (
    auth.uid() = user_id or
    user_id is null -- Permitir ver reportes anónimos (solo para admins en el futuro)
  );

-- Policy: Cualquiera puede crear reportes (con o sin sesión)
create policy "Cualquiera puede crear reportes"
  on public.support_reports for insert
  with check (true);

-- Policy: Los usuarios pueden actualizar sus propios reportes (solo si están abiertos)
create policy "Usuarios pueden actualizar sus reportes abiertos"
  on public.support_reports for update
  using (
    auth.uid() = user_id and
    status = 'open'
  )
  with check (
    auth.uid() = user_id and
    status = 'open'
  );

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Trigger para actualizar updated_at automáticamente
create or replace function public.update_support_report_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Eliminar trigger existente si existe (para evitar errores en re-ejecución)
drop trigger if exists update_support_report_updated_at on public.support_reports;

create trigger update_support_report_updated_at
  before update on public.support_reports
  for each row
  execute function public.update_support_report_updated_at();
