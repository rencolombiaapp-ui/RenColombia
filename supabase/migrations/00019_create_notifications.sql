-- ============================================
-- Sistema de Notificaciones
-- ============================================
-- Permite notificar a usuarios sobre eventos importantes (intenciones de arrendar, mensajes, etc.)

-- ============================================
-- TABLA: notifications (notificaciones)
-- ============================================
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in (
    'property_intention',
    'new_message',
    'property_viewed',
    'review_received',
    'system'
  )),
  title text not null,
  message text not null,
  related_id uuid, -- ID del recurso relacionado (property_id, conversation_id, etc.)
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Comentarios
comment on table public.notifications is 'Notificaciones para usuarios';
comment on column public.notifications.user_id is 'Usuario destinatario de la notificación';
comment on column public.notifications.type is 'Tipo de notificación: property_intention, new_message, property_viewed, review_received, system';
comment on column public.notifications.title is 'Título de la notificación';
comment on column public.notifications.message is 'Mensaje de la notificación';
comment on column public.notifications.related_id is 'ID del recurso relacionado (property_id, conversation_id, etc.)';
comment on column public.notifications.is_read is 'Si la notificación ha sido leída';

-- Índices para búsquedas rápidas
create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read);
create index if not exists notifications_created_idx on public.notifications(created_at desc);
create index if not exists notifications_type_idx on public.notifications(type);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

alter table public.notifications enable row level security;

-- Eliminar políticas existentes si existen
drop policy if exists "Usuarios ven sus notificaciones" on public.notifications;
drop policy if exists "Sistema puede crear notificaciones" on public.notifications;
drop policy if exists "Usuarios pueden marcar como leídas" on public.notifications;
drop policy if exists "Usuarios pueden eliminar sus notificaciones" on public.notifications;

-- Policy: Los usuarios pueden ver sus propias notificaciones
create policy "Usuarios ven sus notificaciones"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Policy: El sistema puede crear notificaciones (usando security definer)
-- Los usuarios también pueden crear notificaciones para otros usuarios si tienen permisos
create policy "Sistema puede crear notificaciones"
  on public.notifications for insert
  with check (true); -- Permitir creación, pero controlar con triggers/funciones

-- Policy: Los usuarios pueden marcar sus notificaciones como leídas
create policy "Usuarios pueden marcar como leídas"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Los usuarios pueden eliminar sus propias notificaciones
create policy "Usuarios pueden eliminar sus notificaciones"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para crear notificación (security definer para permitir creación desde triggers)
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_related_id uuid default null
)
returns uuid as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (user_id, type, title, message, related_id)
  values (p_user_id, p_type, p_title, p_message, p_related_id)
  returning id into v_notification_id;
  
  return v_notification_id;
end;
$$ language plpgsql security definer;

-- Función para obtener conteo de notificaciones no leídas
create or replace function public.get_unread_notification_count(p_user_id uuid)
returns integer as $$
begin
  return (
    select count(*)::integer
    from public.notifications
    where user_id = p_user_id
    and is_read = false
  );
end;
$$ language plpgsql security definer;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Crear notificación cuando se crea una intención de propiedad
create or replace function public.notify_property_intention()
returns trigger as $$
declare
  v_property_title text;
  v_tenant_name text;
begin
  -- Obtener título de la propiedad
  select title into v_property_title
  from public.properties
  where id = new.property_id;
  
  -- Obtener nombre del inquilino
  select coalesce(full_name, email) into v_tenant_name
  from public.profiles
  where id = new.tenant_id;
  
  -- Crear notificación para el propietario
  perform public.create_notification(
    new.owner_id,
    'property_intention',
    'Nueva intención de arrendamiento',
    format('El inquilino %s quiere arrendar tu inmueble: %s', v_tenant_name, coalesce(v_property_title, 'Sin título')),
    new.property_id
  );
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists notify_property_intention_trigger on public.property_intentions;
create trigger notify_property_intention_trigger
  after insert on public.property_intentions
  for each row
  execute function public.notify_property_intention();
