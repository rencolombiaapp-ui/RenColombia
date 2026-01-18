-- ============================================
-- Migración: Sistema de Mensajería de Contratos
-- ============================================
-- Crea la tabla y funciones para mensajes entre partes asociados a contratos
-- Versión: 1.0
-- Fecha: 2024
--
-- OBJETIVOS:
-- 1. Crear tabla contract_messages
-- 2. Crear función RPC para enviar mensajes
-- 3. Crear trigger para notificar al destinatario
-- 4. Implementar RLS policies para seguridad
--
-- IMPORTANTE:
-- - Solo participantes del contrato pueden enviar/ver mensajes
-- - Los mensajes no se pueden eliminar (historial permanente)
-- ============================================

-- ============================================
-- 1. CREAR TABLA contract_messages
-- ============================================

CREATE TABLE IF NOT EXISTS public.contract_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id uuid REFERENCES public.rental_contracts(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL, -- Opcional: vincular con conversación existente
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo de mensaje
  message_type text NOT NULL DEFAULT 'comment' 
    CHECK (message_type IN ('comment', 'change_request', 'approval', 'rejection', 'system')),
  
  -- Contenido
  content text NOT NULL,
  
  -- Si es solicitud de cambio
  change_request_data jsonb, -- { field: 'monthly_rent', old_value: 1000000, new_value: 1200000 }
  
  -- Metadatos
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Comentarios de documentación
COMMENT ON TABLE public.contract_messages IS 
  'Almacena mensajes específicos relacionados con contratos. Se integra con el sistema de mensajería existente pero añade contexto contractual.';

COMMENT ON COLUMN public.contract_messages.message_type IS 
  'Tipo de mensaje: comment (comentario), change_request (solicitud de cambio), approval (aprobación), rejection (rechazo), system (sistema)';

COMMENT ON COLUMN public.contract_messages.change_request_data IS 
  'Datos de solicitud de cambio en formato JSON. Ejemplo: {"field": "monthly_rent", "old_value": 1000000, "new_value": 1200000}';

COMMENT ON COLUMN public.contract_messages.conversation_id IS 
  'ID de conversación existente (opcional). Permite vincular mensajes de contrato con conversaciones del sistema de mensajería.';

-- ============================================
-- 2. CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS contract_messages_contract_idx 
  ON public.contract_messages(contract_id);

CREATE INDEX IF NOT EXISTS contract_messages_sender_idx 
  ON public.contract_messages(sender_id);

CREATE INDEX IF NOT EXISTS contract_messages_created_idx 
  ON public.contract_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS contract_messages_type_idx 
  ON public.contract_messages(message_type);

CREATE INDEX IF NOT EXISTS contract_messages_conversation_idx 
  ON public.contract_messages(conversation_id) 
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS contract_messages_contract_read_idx 
  ON public.contract_messages(contract_id, is_read) 
  WHERE is_read = false;

-- ============================================
-- 3. CREAR FUNCIÓN RPC: send_contract_message
-- ============================================
-- Permite a los participantes del contrato enviar mensajes

CREATE OR REPLACE FUNCTION public.send_contract_message(
  p_contract_id uuid,
  p_content text,
  p_message_type text DEFAULT 'comment',
  p_conversation_id uuid DEFAULT NULL,
  p_change_request_data jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_message_id uuid;
  v_contract_record public.rental_contracts%ROWTYPE;
  v_sender_id uuid;
  v_recipient_id uuid;
BEGIN
  -- Obtener el contrato
  SELECT * INTO v_contract_record
  FROM public.rental_contracts
  WHERE id = p_contract_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato no encontrado';
  END IF;
  
  -- Obtener el usuario autenticado
  v_sender_id := auth.uid();
  
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado: debes estar autenticado';
  END IF;
  
  -- Validar que el usuario sea participante del contrato
  IF v_sender_id != v_contract_record.tenant_id AND v_sender_id != v_contract_record.owner_id THEN
    RAISE EXCEPTION 'No autorizado: solo los participantes del contrato pueden enviar mensajes';
  END IF;
  
  -- Validar tipo de mensaje
  IF p_message_type NOT IN ('comment', 'change_request', 'approval', 'rejection', 'system') THEN
    RAISE EXCEPTION 'Tipo de mensaje inválido. Debe ser: comment, change_request, approval, rejection o system';
  END IF;
  
  -- Validar contenido
  IF p_content IS NULL OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'El contenido del mensaje no puede estar vacío';
  END IF;
  
  -- Validar conversation_id si se proporciona
  IF p_conversation_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE id = p_conversation_id
      AND (tenant_id = v_sender_id OR owner_id = v_sender_id)
    ) THEN
      RAISE EXCEPTION 'La conversación especificada no existe o no tienes acceso a ella';
    END IF;
  END IF;
  
  -- Determinar destinatario (la otra parte del contrato)
  IF v_sender_id = v_contract_record.tenant_id THEN
    v_recipient_id := v_contract_record.owner_id;
  ELSE
    v_recipient_id := v_contract_record.tenant_id;
  END IF;
  
  -- Crear el mensaje
  INSERT INTO public.contract_messages (
    contract_id,
    conversation_id,
    sender_id,
    message_type,
    content,
    change_request_data,
    is_read
  ) VALUES (
    p_contract_id,
    p_conversation_id,
    v_sender_id,
    p_message_type,
    trim(p_content),
    p_change_request_data,
    false
  )
  RETURNING id INTO v_message_id;
  
  -- Notificar al destinatario (se hace mediante trigger)
  -- El trigger notify_contract_message_recipient se encargará de crear la notificación
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.send_contract_message IS 
  'Permite a los participantes del contrato enviar mensajes. Valida permisos y crea el mensaje. Retorna el ID del mensaje creado.';

-- ============================================
-- 4. CREAR TRIGGER PARA NOTIFICAR AL DESTINATARIO
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_contract_message_recipient()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_record public.rental_contracts%ROWTYPE;
  v_recipient_id uuid;
  v_property_title text;
  v_sender_name text;
  v_notification_id uuid;
BEGIN
  -- Obtener el contrato
  SELECT * INTO v_contract_record
  FROM public.rental_contracts
  WHERE id = NEW.contract_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Determinar destinatario (la otra parte del contrato)
  IF NEW.sender_id = v_contract_record.tenant_id THEN
    v_recipient_id := v_contract_record.owner_id;
  ELSE
    v_recipient_id := v_contract_record.tenant_id;
  END IF;
  
  -- Obtener título del inmueble
  SELECT title INTO v_property_title
  FROM public.properties
  WHERE id = v_contract_record.property_id;
  
  -- Obtener nombre del remitente
  SELECT coalesce(full_name, email) INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Crear notificación para el destinatario
  BEGIN
    v_notification_id := public.create_notification(
      v_recipient_id,
      'new_message',
      'Nuevo mensaje en contrato',
      format('%s te envió un mensaje sobre el contrato del inmueble: %s', 
        coalesce(v_sender_name, 'Un usuario'), 
        coalesce(v_property_title, 'Sin título')),
      v_contract_record.property_id
    );
    
    RAISE NOTICE 'Notificación de mensaje de contrato creada exitosamente: %', v_notification_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error al crear notificación de mensaje de contrato: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_contract_message_recipient() IS 
  'Notifica al destinatario cuando se crea un nuevo mensaje de contrato. Determina automáticamente quién es el destinatario (la otra parte del contrato).';

DROP TRIGGER IF EXISTS notify_contract_message_recipient_trigger ON public.contract_messages;
CREATE TRIGGER notify_contract_message_recipient_trigger
  AFTER INSERT ON public.contract_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_contract_message_recipient();

-- ============================================
-- 5. CREAR FUNCIÓN: mark_contract_message_as_read
-- ============================================
-- Permite marcar mensajes como leídos

CREATE OR REPLACE FUNCTION public.mark_contract_message_as_read(
  p_message_id uuid
)
RETURNS void AS $$
DECLARE
  v_message_record public.contract_messages%ROWTYPE;
  v_contract_record public.rental_contracts%ROWTYPE;
  v_user_id uuid;
BEGIN
  -- Obtener el mensaje
  SELECT * INTO v_message_record
  FROM public.contract_messages
  WHERE id = p_message_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mensaje no encontrado';
  END IF;
  
  -- Obtener el usuario autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado: debes estar autenticado';
  END IF;
  
  -- Obtener el contrato para validar permisos
  SELECT * INTO v_contract_record
  FROM public.rental_contracts
  WHERE id = v_message_record.contract_id;
  
  -- Validar que el usuario sea participante del contrato
  IF v_user_id != v_contract_record.tenant_id AND v_user_id != v_contract_record.owner_id THEN
    RAISE EXCEPTION 'No autorizado: solo los participantes del contrato pueden marcar mensajes como leídos';
  END IF;
  
  -- Marcar como leído (solo si el usuario no es el remitente)
  IF v_user_id != v_message_record.sender_id THEN
    UPDATE public.contract_messages
    SET is_read = true
    WHERE id = p_message_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.mark_contract_message_as_read IS 
  'Marca un mensaje de contrato como leído. Solo los participantes del contrato pueden marcar mensajes como leídos (excepto sus propios mensajes).';

-- ============================================
-- 6. CREAR RLS POLICIES
-- ============================================

ALTER TABLE public.contract_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Participantes del contrato pueden ver mensajes
CREATE POLICY "Participantes pueden ver mensajes del contrato"
  ON public.contract_messages FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM public.rental_contracts 
      WHERE tenant_id = auth.uid() OR owner_id = auth.uid()
    )
  );

-- Policy: Participantes del contrato pueden crear mensajes (validado en RPC)
CREATE POLICY "Participantes pueden crear mensajes"
  ON public.contract_messages FOR INSERT
  WITH CHECK (
    contract_id IN (
      SELECT id FROM public.rental_contracts 
      WHERE tenant_id = auth.uid() OR owner_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Policy: Solo el remitente puede marcar sus mensajes como leídos (aunque esto no tiene mucho sentido)
-- En realidad, los mensajes se marcan como leídos por el destinatario, no por el remitente
-- Por ahora, permitimos que cualquier participante pueda actualizar el estado de lectura
CREATE POLICY "Participantes pueden marcar mensajes como leídos"
  ON public.contract_messages FOR UPDATE
  USING (
    contract_id IN (
      SELECT id FROM public.rental_contracts 
      WHERE tenant_id = auth.uid() OR owner_id = auth.uid()
    )
  )
  WITH CHECK (
    contract_id IN (
      SELECT id FROM public.rental_contracts 
      WHERE tenant_id = auth.uid() OR owner_id = auth.uid()
    )
    AND is_read = true -- Solo permitir cambiar a leído, no desmarcar
  );

-- Policy: No se permiten eliminaciones (historial permanente)
-- No creamos policy DELETE, lo que significa que nadie puede eliminar mensajes

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
--
-- ROLLBACK:
-- Para revertir esta migración:
--   1. DROP TRIGGER notify_contract_message_recipient_trigger ON public.contract_messages;
--   2. DROP FUNCTION public.notify_contract_message_recipient();
--   3. DROP FUNCTION public.mark_contract_message_as_read(uuid);
--   4. DROP FUNCTION public.send_contract_message(uuid, text, text, uuid, jsonb);
--   5. DROP POLICY "Participantes pueden marcar mensajes como leídos" ON public.contract_messages;
--   6. DROP POLICY "Participantes pueden crear mensajes" ON public.contract_messages;
--   7. DROP POLICY "Participantes pueden ver mensajes del contrato" ON public.contract_messages;
--   8. DROP TABLE IF EXISTS public.contract_messages CASCADE;
-- ============================================
