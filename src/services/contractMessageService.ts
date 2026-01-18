import { supabase } from "@/integrations/supabase/client";

/**
 * Tipos de mensaje de contrato
 */
export type ContractMessageType = "comment" | "change_request" | "approval" | "rejection" | "system";

/**
 * Mensaje de contrato
 */
export interface ContractMessage {
  id: string;
  contract_id: string;
  conversation_id: string | null;
  sender_id: string;
  message_type: ContractMessageType;
  content: string;
  change_request_data: any | null; // JSONB
  is_read: boolean;
  created_at: string;
}

/**
 * Mensaje de contrato con detalles extendidos
 */
export interface ContractMessageWithDetails extends ContractMessage {
  sender_name: string | null;
  sender_email: string;
  sender_avatar_url: string | null;
}

/**
 * Parámetros para enviar un mensaje de contrato
 */
export interface SendContractMessageParams {
  contractId: string;
  content: string;
  messageType?: ContractMessageType;
  conversationId?: string;
  changeRequestData?: {
    field: string;
    old_value: any;
    new_value: any;
  };
}

/**
 * Envía un mensaje asociado a un contrato
 * Solo participantes del contrato pueden enviar mensajes
 */
export async function sendContractMessage(
  params: SendContractMessageParams
): Promise<ContractMessage> {
  const { contractId, content, messageType = "comment", conversationId, changeRequestData } = params;
  
  // Validar que el usuario esté autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autorizado: debes estar autenticado");
  }
  
  // Validar que el contrato existe y el usuario es participante
  const { data: contract, error: contractError } = await supabase
    .from("rental_contracts")
    .select("id, tenant_id, owner_id")
    .eq("id", contractId)
    .single();
  
  if (contractError || !contract) {
    throw new Error("Contrato no encontrado");
  }
  
  if (contract.tenant_id !== user.id && contract.owner_id !== user.id) {
    throw new Error("No autorizado: solo los participantes del contrato pueden enviar mensajes");
  }
  
  // Preparar parámetros para la función RPC
  const rpcParams: any = {
    p_contract_id: contractId,
    p_content: content,
    p_message_type: messageType,
  };
  
  if (conversationId) {
    rpcParams.p_conversation_id = conversationId;
  }
  
  if (changeRequestData) {
    rpcParams.p_change_request_data = changeRequestData;
  }
  
  // Llamar a la función RPC
  const { data: messageId, error } = await supabase.rpc("send_contract_message", rpcParams);
  
  if (error) {
    console.error("Error al enviar mensaje de contrato:", error);
    throw new Error(error.message || "Error al enviar mensaje de contrato");
  }
  
  // Obtener el mensaje creado
  const { data: message, error: fetchError } = await supabase
    .from("contract_messages")
    .select("*")
    .eq("id", messageId)
    .single();
  
  if (fetchError || !message) {
    throw new Error("Error al obtener el mensaje creado");
  }
  
  return message as ContractMessage;
}

/**
 * Obtiene todos los mensajes de un contrato
 */
export async function getContractMessages(
  contractId: string
): Promise<ContractMessageWithDetails[]> {
  // Validar que el usuario esté autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autorizado");
  }
  
  // Validar que el usuario sea participante del contrato
  const { data: contract, error: contractError } = await supabase
    .from("rental_contracts")
    .select("id, tenant_id, owner_id")
    .eq("id", contractId)
    .single();
  
  if (contractError || !contract) {
    throw new Error("Contrato no encontrado");
  }
  
  if (contract.tenant_id !== user.id && contract.owner_id !== user.id) {
    throw new Error("No autorizado: solo los participantes del contrato pueden ver los mensajes");
  }
  
  // Obtener mensajes con detalles del remitente
  const { data: messages, error } = await supabase
    .from("contract_messages")
    .select(`
      *,
      sender:sender_id (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });
  
  if (error) {
    console.error("Error al obtener mensajes de contrato:", error);
    throw new Error("Error al obtener mensajes de contrato");
  }
  
  // Transformar los datos
  return (messages || []).map((msg: any) => ({
    ...msg,
    sender_name: msg.sender?.full_name || null,
    sender_email: msg.sender?.email || "",
    sender_avatar_url: msg.sender?.avatar_url || null,
  })) as ContractMessageWithDetails[];
}

/**
 * Marca un mensaje como leído
 */
export async function markContractMessageAsRead(
  messageId: string
): Promise<void> {
  // Validar que el usuario esté autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autorizado");
  }
  
  // Llamar a la función RPC
  const { error } = await supabase.rpc("mark_contract_message_as_read", {
    p_message_id: messageId,
  });
  
  if (error) {
    console.error("Error al marcar mensaje como leído:", error);
    throw new Error(error.message || "Error al marcar mensaje como leído");
  }
}

/**
 * Marca todos los mensajes de un contrato como leídos
 */
export async function markAllContractMessagesAsRead(
  contractId: string
): Promise<void> {
  // Validar que el usuario esté autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autorizado");
  }
  
  // Validar que el usuario sea participante del contrato
  const { data: contract, error: contractError } = await supabase
    .from("rental_contracts")
    .select("id, tenant_id, owner_id")
    .eq("id", contractId)
    .single();
  
  if (contractError || !contract) {
    throw new Error("Contrato no encontrado");
  }
  
  if (contract.tenant_id !== user.id && contract.owner_id !== user.id) {
    throw new Error("No autorizado: solo los participantes del contrato pueden marcar mensajes como leídos");
  }
  
  // Marcar todos los mensajes no leídos como leídos (excepto los propios)
  const { error } = await supabase
    .from("contract_messages")
    .update({ is_read: true })
    .eq("contract_id", contractId)
    .neq("sender_id", user.id) // No marcar los propios mensajes
    .eq("is_read", false);
  
  if (error) {
    console.error("Error al marcar mensajes como leídos:", error);
    throw new Error("Error al marcar mensajes como leídos");
  }
}

/**
 * Obtiene el conteo de mensajes no leídos de un contrato
 */
export async function getUnreadContractMessagesCount(
  contractId: string
): Promise<number> {
  // Validar que el usuario esté autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return 0;
  }
  
  // Validar que el usuario sea participante del contrato
  const { data: contract, error: contractError } = await supabase
    .from("rental_contracts")
    .select("id, tenant_id, owner_id")
    .eq("id", contractId)
    .single();
  
  if (contractError || !contract) {
    return 0;
  }
  
  if (contract.tenant_id !== user.id && contract.owner_id !== user.id) {
    return 0;
  }
  
  // Contar mensajes no leídos (excepto los propios)
  const { count, error } = await supabase
    .from("contract_messages")
    .select("*", { count: "exact", head: true })
    .eq("contract_id", contractId)
    .neq("sender_id", user.id) // Excluir mensajes propios
    .eq("is_read", false);
  
  if (error) {
    console.error("Error al contar mensajes no leídos:", error);
    return 0;
  }
  
  return count || 0;
}
