import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  status: "open" | "closed";
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithDetails extends Conversation {
  property_title: string;
  property_city: string;
  property_neighborhood: string | null;
  property_price: number;
  property_image_url: string | null;
  tenant_name: string | null;
  tenant_email: string;
  owner_name: string | null;
  owner_email: string;
  unread_count: number;
  last_message_content: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface CreateConversationParams {
  propertyId: string;
  tenantId: string;
  ownerId: string;
  initialMessage: string;
}

/**
 * Crea una nueva conversación con un mensaje inicial
 */
export async function createConversation(
  params: CreateConversationParams
): Promise<{ conversation: Conversation; message: Message }> {
  const { propertyId, tenantId, ownerId, initialMessage } = params;

  // Verificar que no exista ya una conversación para este inquilino e inmueble
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("property_id", propertyId)
    .eq("tenant_id", tenantId)
    .single();

  if (existing) {
    // Si ya existe, crear el mensaje en la conversación existente
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: existing.id,
        sender_id: tenantId,
        content: initialMessage,
      })
      .select()
      .single();

    if (messageError) {
      throw new Error(`Error al enviar mensaje: ${messageError.message}`);
    }

    // Obtener la conversación actualizada
    const { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", existing.id)
      .single();

    return {
      conversation: conversation as Conversation,
      message: message as Message,
    };
  }

  // Crear nueva conversación
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      property_id: propertyId,
      tenant_id: tenantId,
      owner_id: ownerId,
      status: "open",
    })
    .select()
    .single();

  if (convError) {
    throw new Error(`Error al crear conversación: ${convError.message}`);
  }

  // Crear mensaje inicial
  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: tenantId,
      content: initialMessage,
    })
    .select()
    .single();

  if (messageError) {
    // Si falla crear el mensaje, eliminar la conversación
    await supabase.from("conversations").delete().eq("id", conversation.id);
    throw new Error(`Error al enviar mensaje: ${messageError.message}`);
  }

  return {
    conversation: conversation as Conversation,
    message: message as Message,
  };
}

/**
 * Obtiene todas las conversaciones de un usuario (como propietario o inquilino)
 */
export async function getUserConversations(
  userId: string
): Promise<ConversationWithDetails[]> {
  const { data, error } = await supabase
    .from("conversations_with_details")
    .select("*")
    .or(`tenant_id.eq.${userId},owner_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }

  // Calcular unread_count para cada conversación
  const conversationsWithUnread = await Promise.all(
    (data || []).map(async (conv) => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("is_read", false)
        .neq("sender_id", userId);

      return {
        ...conv,
        unread_count: count || 0,
      } as ConversationWithDetails;
    })
  );

  return conversationsWithUnread;
}

/**
 * Obtiene los mensajes de una conversación
 */
export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return (data || []) as Message[];
}

/**
 * Envía un mensaje en una conversación
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error al enviar mensaje: ${error.message}`);
  }

  return data as Message;
}

/**
 * Marca los mensajes de una conversación como leídos
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  // Marcar como leídos solo los mensajes que NO fueron enviados por el usuario actual
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking messages as read:", error);
  }
}

/**
 * Cierra una conversación (solo propietario puede hacerlo)
 */
export async function closeConversation(
  conversationId: string,
  ownerId: string
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ status: "closed" })
    .eq("id", conversationId)
    .eq("owner_id", ownerId);

  if (error) {
    throw new Error(`Error al cerrar conversación: ${error.message}`);
  }
}

/**
 * Verifica si un propietario puede crear más conversaciones según su plan
 */
export async function canOwnerCreateMoreConversations(
  ownerId: string
): Promise<{ canCreate: boolean; activeCount: number; maxAllowed: number | null }> {
  const { data, error } = await supabase.rpc("can_create_conversation", {
    user_uuid: ownerId,
  });

  if (error) {
    console.error("Error checking conversation limit:", error);
    // En caso de error, permitir crear (fallback seguro)
    return { canCreate: true, activeCount: 0, maxAllowed: null };
  }

  // Obtener conteo de conversaciones activas
  const { count } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("status", "open");

  const activeCount = count || 0;

  // Obtener plan del usuario para determinar límite
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", ownerId)
    .eq("status", "active")
    .single();

  const isPro = subscription?.plan_id?.includes("_pro") || false;
  const maxAllowed = isPro ? null : 5; // PRO = ilimitado, Free = 5

  return {
    canCreate: data === true,
    activeCount,
    maxAllowed,
  };
}

/**
 * Obtiene una conversación específica con detalles
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationWithDetails | null> {
  const { data, error } = await supabase
    .from("conversations_with_details")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error) {
    console.error("Error fetching conversation:", error);
    return null;
  }

  return data as ConversationWithDetails;
}
