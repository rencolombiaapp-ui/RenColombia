-- ============================================
-- Notificaciones Bidireccionales
-- ============================================
-- Agrega triggers para notificar a inquilinos cuando propietarios/inmobiliarias
-- realizan acciones relacionadas con sus intenciones o mensajes
--
-- ============================================

-- ============================================
-- ACTUALIZAR CHECK CONSTRAINT PARA AGREGAR TIPO 'property_favorited'
-- ============================================

-- Primero eliminamos el check constraint existente
alter table public.notifications drop constraint if exists notifications_type_check;

-- Agregamos el nuevo check constraint con el tipo adicional 'property_favorited'
alter table public.notifications add constraint notifications_type_check 
  check (type in (
    'property_intention',
    'new_message',
    'property_viewed',
    'property_favorited',
    'review_received',
    'system'
  ));

-- ============================================
-- TRIGGER: Notificar inquilino cuando propietario actualiza estado de intención
-- ============================================

-- Función para notificar al inquilino cuando el propietario cambia el estado de su intención
create or replace function public.notify_tenant_intention_status_change()
returns trigger as $$
declare
  v_property_title text;
  v_owner_name text;
  v_status_message text;
  v_status_title text;
begin
  -- Solo notificar si el estado cambió y no es el estado inicial (pending)
  if old.status = new.status then
    return new; -- No hubo cambio de estado
  end if;

  -- Obtener título de la propiedad
  select title into v_property_title
  from public.properties
  where id = new.property_id;

  -- Obtener nombre del propietario/inmobiliaria
  select coalesce(
    case 
      when publisher_type = 'inmobiliaria' then company_name
      else full_name
    end,
    email
  ) into v_owner_name
  from public.profiles
  where id = new.owner_id;

  -- Determinar mensaje según el nuevo estado
  case new.status
    when 'viewed' then
      v_status_title := 'Tu interés ha sido visto';
      v_status_message := format('El propietario %s ha visto tu interés en el inmueble: %s', v_owner_name, coalesce(v_property_title, 'Sin título'));
    when 'contacted' then
      v_status_title := 'El propietario te contactará';
      v_status_message := format('El propietario %s ha marcado tu interés como contactado para el inmueble: %s. Te contactará pronto.', v_owner_name, coalesce(v_property_title, 'Sin título'));
    when 'closed' then
      v_status_title := 'Intención cerrada';
      v_status_message := format('El propietario %s ha cerrado tu solicitud para el inmueble: %s', v_owner_name, coalesce(v_property_title, 'Sin título'));
    else
      return new; -- Estado no reconocido, no notificar
  end case;

  -- Crear notificación para el inquilino
  perform public.create_notification(
    new.tenant_id,
    'property_intention',
    v_status_title,
    v_status_message,
    new.property_id
  );

  return new;
end;
$$ language plpgsql security definer;

-- Crear trigger para actualización de estado de intención
drop trigger if exists notify_tenant_intention_status_trigger on public.property_intentions;
create trigger notify_tenant_intention_status_trigger
  after update of status on public.property_intentions
  for each row
  when (old.status is distinct from new.status)
  execute function public.notify_tenant_intention_status_change();

-- ============================================
-- TRIGGER: Notificar destinatario cuando se envía un mensaje
-- ============================================

-- Función para notificar al destinatario cuando se envía un mensaje
create or replace function public.notify_message_recipient()
returns trigger as $$
declare
  v_conversation public.conversations;
  v_property_title text;
  v_sender_name text;
  v_recipient_id uuid;
  v_message_preview text;
begin
  -- Obtener información de la conversación
  select * into v_conversation
  from public.conversations
  where id = new.conversation_id;

  -- Si no existe la conversación, no hacer nada
  if v_conversation is null then
    return new;
  end if;

  -- Determinar quién es el destinatario (el que NO envió el mensaje)
  if new.sender_id = v_conversation.tenant_id then
    -- El inquilino envió el mensaje, notificar al propietario
    v_recipient_id := v_conversation.owner_id;
  else
    -- El propietario envió el mensaje, notificar al inquilino
    v_recipient_id := v_conversation.tenant_id;
  end if;

  -- No notificar si el destinatario es el mismo que el remitente (por seguridad)
  if v_recipient_id = new.sender_id then
    return new;
  end if;

  -- Obtener título de la propiedad
  select title into v_property_title
  from public.properties
  where id = v_conversation.property_id;

  -- Obtener nombre del remitente
  select coalesce(
    case 
      when publisher_type = 'inmobiliaria' then company_name
      else full_name
    end,
    email
  ) into v_sender_name
  from public.profiles
  where id = new.sender_id;

  -- Crear preview del mensaje (primeros 100 caracteres)
  v_message_preview := left(new.content, 100);
  if length(new.content) > 100 then
    v_message_preview := v_message_preview || '...';
  end if;

  -- Crear notificación para el destinatario
  perform public.create_notification(
    v_recipient_id,
    'new_message',
    'Nuevo mensaje',
    format('%s te envió un mensaje sobre el inmueble: %s. "%s"', v_sender_name, coalesce(v_property_title, 'Sin título'), v_message_preview),
    v_conversation.id -- related_id es el conversation_id para navegar a la conversación
  );

  return new;
end;
$$ language plpgsql security definer;

-- Crear trigger para nuevos mensajes
drop trigger if exists notify_message_recipient_trigger on public.messages;
create trigger notify_message_recipient_trigger
  after insert on public.messages
  for each row
  execute function public.notify_message_recipient();

-- ============================================
-- TRIGGER: Notificar propietario cuando se crea una conversación nueva
-- ============================================

-- Función para notificar al propietario cuando un inquilino inicia una conversación
create or replace function public.notify_conversation_started()
returns trigger as $$
declare
  v_property_title text;
  v_tenant_name text;
begin
  -- Solo notificar si es una conversación nueva (no actualización)
  -- Esto se maneja con AFTER INSERT, así que siempre es nueva

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
    'new_message',
    'Nueva conversación iniciada',
    format('El inquilino %s ha iniciado una conversación sobre tu inmueble: %s', v_tenant_name, coalesce(v_property_title, 'Sin título')),
    new.id -- related_id es el conversation_id
  );

  return new;
end;
$$ language plpgsql security definer;

-- Crear trigger para nuevas conversaciones
drop trigger if exists notify_conversation_started_trigger on public.conversations;
create trigger notify_conversation_started_trigger
  after insert on public.conversations
  for each row
  execute function public.notify_conversation_started();

-- ============================================
-- TRIGGER: Notificar propietario cuando inquilino marca inmueble como favorito
-- ============================================

-- Función para notificar al propietario cuando un inquilino marca su inmueble como favorito
create or replace function public.notify_property_favorited()
returns trigger as $$
declare
  v_property_title text;
  v_tenant_name text;
  v_owner_id uuid;
  v_tenant_role text;
begin
  -- Obtener información del inmueble y del usuario que agregó el favorito
  select 
    p.title,
    p.owner_id,
    prof.role,
    coalesce(prof.full_name, prof.email) as tenant_name
  into 
    v_property_title,
    v_owner_id,
    v_tenant_role,
    v_tenant_name
  from public.properties p
  join public.profiles prof on prof.id = new.user_id
  where p.id = new.property_id;

  -- Solo notificar si el usuario que agregó el favorito es un inquilino
  -- No notificar si el propietario se auto-favorece su propio inmueble
  -- Verificar que tenemos todos los datos necesarios
  if v_tenant_role = 'tenant' and v_owner_id is not null and v_owner_id != new.user_id then
    -- Crear notificación para el propietario usando el tipo 'property_favorited'
    perform public.create_notification(
      p_user_id := v_owner_id,
      p_type := 'property_favorited',
      p_title := 'Tu inmueble fue agregado a favoritos',
      p_message := format('El inquilino %s agregó tu inmueble "%s" a sus favoritos', coalesce(v_tenant_name, 'Un inquilino'), coalesce(v_property_title, 'Sin título')),
      p_related_id := new.property_id
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Crear trigger para nuevos favoritos
drop trigger if exists notify_property_favorited_trigger on public.favorites;
create trigger notify_property_favorited_trigger
  after insert on public.favorites
  for each row
  execute function public.notify_property_favorited();

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

comment on function public.notify_tenant_intention_status_change() is 'Notifica al inquilino cuando el propietario cambia el estado de su intención (viewed, contacted, closed)';
comment on function public.notify_message_recipient() is 'Notifica al destinatario cuando se envía un mensaje en una conversación';
comment on function public.notify_conversation_started() is 'Notifica al propietario cuando un inquilino inicia una nueva conversación';
comment on function public.notify_property_favorited() is 'Notifica al propietario cuando un inquilino marca su inmueble como favorito';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
--
-- FLUJO DE NOTIFICACIONES BIDIRECCIONALES:
--
-- 1. INQUILINO → PROPIETARIO:
--    - Inquilino hace clic en "Quiero este inmueble" → Notifica al propietario
--    - Inquilino envía mensaje → Notifica al propietario
--    - Inquilino inicia conversación → Notifica al propietario
--
-- 2. PROPIETARIO → INQUILINO:
--    - Propietario marca intención como "Vista" → Notifica al inquilino
--    - Propietario marca intención como "Contactado" → Notifica al inquilino
--    - Propietario marca intención como "Cerrada" → Notifica al inquilino
--    - Propietario envía mensaje → Notifica al inquilino
--
-- 3. INQUILINO → PROPIETARIO (acciones adicionales):
--    - Inquilino marca inmueble como favorito → Notifica al propietario
--
-- 3. SEGURIDAD:
--    - Todos los triggers usan security definer para poder crear notificaciones
--    - Se valida que el destinatario sea diferente del remitente
--    - Solo se notifica cuando hay cambios reales (no duplicados)
--
-- ============================================
