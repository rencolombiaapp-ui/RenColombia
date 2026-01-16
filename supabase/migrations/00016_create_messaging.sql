-- ============================================
-- Sistema de Mensajería Inmobiliaria
-- ============================================
-- Permite comunicación directa entre inquilinos y propietarios/inmobiliarias
-- Siempre asociada a un inmueble específico

-- ============================================
-- TABLA: conversations (conversaciones)
-- ============================================
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  tenant_id uuid references public.profiles(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'open' check (status in ('open', 'closed')),
  last_message_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Una conversación única por inquilino + inmueble
  unique(tenant_id, property_id)
);

-- Comentarios
comment on table public.conversations is 'Conversaciones entre inquilinos y propietarios/inmobiliarias sobre un inmueble';
comment on column public.conversations.property_id is 'Inmueble sobre el que se está conversando';
comment on column public.conversations.tenant_id is 'Usuario inquilino que inicia la conversación';
comment on column public.conversations.owner_id is 'Propietario o inmobiliaria dueña del inmueble';
comment on column public.conversations.status is 'Estado de la conversación: open (activa) o closed (cerrada)';
comment on column public.conversations.last_message_at is 'Fecha del último mensaje para ordenar conversaciones';

-- Índices para búsquedas rápidas
create index if not exists conversations_property_idx on public.conversations(property_id);
create index if not exists conversations_tenant_idx on public.conversations(tenant_id);
create index if not exists conversations_owner_idx on public.conversations(owner_id);
create index if not exists conversations_status_idx on public.conversations(status);
create index if not exists conversations_last_message_idx on public.conversations(last_message_at desc nulls last);

-- ============================================
-- TABLA: messages (mensajes)
-- ============================================
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Comentarios
comment on table public.messages is 'Mensajes individuales dentro de una conversación';
comment on column public.messages.conversation_id is 'Conversación a la que pertenece el mensaje';
comment on column public.messages.sender_id is 'Usuario que envió el mensaje';
comment on column public.messages.content is 'Contenido del mensaje';
comment on column public.messages.is_read is 'Si el mensaje ha sido leído por el receptor';

-- Índices para búsquedas rápidas
create index if not exists messages_conversation_idx on public.messages(conversation_id);
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists messages_created_idx on public.messages(created_at);
create index if not exists messages_read_idx on public.messages(is_read);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- RLS para conversations
alter table public.conversations enable row level security;

-- Policy: Los participantes pueden ver sus conversaciones
create policy "Participantes pueden ver sus conversaciones"
  on public.conversations for select
  using (
    auth.uid() = tenant_id or 
    auth.uid() = owner_id
  );

-- Policy: Inquilinos pueden crear conversaciones
create policy "Inquilinos pueden crear conversaciones"
  on public.conversations for insert
  with check (
    auth.uid() = tenant_id and
    -- Verificar que el inmueble existe y está publicado
    exists (
      select 1 from public.properties 
      where id = property_id 
      and status = 'published'
    )
  );

-- Policy: Propietarios pueden actualizar el estado de sus conversaciones
create policy "Propietarios pueden actualizar conversaciones"
  on public.conversations for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- RLS para messages
alter table public.messages enable row level security;

-- Policy: Los participantes pueden ver los mensajes de sus conversaciones
create policy "Participantes pueden ver mensajes"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where id = conversation_id
      and (tenant_id = auth.uid() or owner_id = auth.uid())
    )
  );

-- Policy: Los participantes pueden enviar mensajes en sus conversaciones
create policy "Participantes pueden enviar mensajes"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations
      where id = conversation_id
      and (tenant_id = auth.uid() or owner_id = auth.uid())
      and status = 'open'
    )
  );

-- Policy: Los participantes pueden marcar mensajes como leídos
create policy "Participantes pueden marcar mensajes como leídos"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations
      where id = conversation_id
      and (tenant_id = auth.uid() or owner_id = auth.uid())
    )
  );

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar last_message_at cuando se crea un mensaje
create or replace function public.update_conversation_last_message()
returns trigger as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para actualizar last_message_at automáticamente
create trigger update_conversation_on_new_message
  after insert on public.messages
  for each row
  execute function public.update_conversation_last_message();

-- Función para contar conversaciones activas de un propietario
create or replace function public.count_active_conversations(owner_uuid uuid)
returns integer as $$
begin
  return (
    select count(*)::integer
    from public.conversations
    where owner_id = owner_uuid
    and status = 'open'
  );
end;
$$ language plpgsql security definer;

-- Función para verificar si un usuario puede crear más conversaciones
-- Basado en su plan de suscripción
create or replace function public.can_create_conversation(user_uuid uuid)
returns boolean as $$
declare
  user_plan text;
  active_count integer;
  max_allowed integer;
begin
  -- Obtener el plan activo del usuario
  select plan_id into user_plan
  from public.subscriptions
  where user_id = user_uuid
  and status = 'active'
  and (expires_at is null or expires_at > now())
  limit 1;

  -- Si no tiene plan activo, usar plan free
  if user_plan is null then
    user_plan := 'free';
  end if;

  -- Contar conversaciones activas
  select count(*)::integer into active_count
  from public.conversations
  where owner_id = user_uuid
  and status = 'open';

  -- Determinar límite según el plan
  if user_plan like '%_pro' then
    -- Plan PRO: ilimitado
    return true;
  else
    -- Plan Free: límite de 5 conversaciones
    max_allowed := 5;
    return active_count < max_allowed;
  end if;
end;
$$ language plpgsql security definer;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista para obtener conversaciones con información del inmueble y participantes
-- Nota: Esta vista no puede usar auth.uid() directamente, así que calculamos unread_count en el cliente
create or replace view public.conversations_with_details as
select 
  c.id,
  c.property_id,
  c.tenant_id,
  c.owner_id,
  c.status,
  c.last_message_at,
  c.created_at,
  c.updated_at,
  p.title as property_title,
  p.city as property_city,
  p.neighborhood as property_neighborhood,
  p.price as property_price,
  pi.url as property_image_url,
  tenant.full_name as tenant_name,
  tenant.email as tenant_email,
  owner.full_name as owner_name,
  owner.email as owner_email,
  (
    select content
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) as last_message_content
from public.conversations c
join public.properties p on p.id = c.property_id
left join public.property_images pi on pi.property_id = p.id and pi.is_primary = true
join public.profiles tenant on tenant.id = c.tenant_id
join public.profiles owner on owner.id = c.owner_id;

-- Comentario de la vista
comment on view public.conversations_with_details is 'Vista que incluye detalles del inmueble y participantes para las conversaciones';

-- RLS para la vista (hereda de las tablas subyacentes, pero necesitamos una política explícita)
alter view public.conversations_with_details set (security_invoker = true);

-- Policy para la vista: solo los participantes pueden ver sus conversaciones
-- Nota: Las vistas heredan las políticas de las tablas subyacentes, pero es mejor ser explícito
-- En este caso, la vista se filtrará automáticamente por las políticas de conversations
