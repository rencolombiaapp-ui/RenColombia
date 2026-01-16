import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  getUserConversations,
  getConversationMessages,
  sendMessage as sendMessageService,
  markMessagesAsRead,
  closeConversation as closeConversationService,
  canOwnerCreateMoreConversations,
  type ConversationWithDetails,
  type Message,
} from "@/services/messagingService";

/**
 * Hook para obtener todas las conversaciones del usuario actual
 */
export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => getUserConversations(user!.id),
    enabled: !!user,
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

/**
 * Hook para obtener los mensajes de una conversación específica
 */
export function useConversationMessages(conversationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getConversationMessages(conversationId!),
    enabled: !!conversationId && !!user,
    refetchInterval: 10000, // Refrescar cada 10 segundos cuando hay conversación abierta
  });
}

/**
 * Hook para enviar un mensaje
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Usuario no autenticado");
      return sendMessageService(conversationId, user.id, content);
    },
    onSuccess: (_, variables) => {
      // Invalidar queries para refrescar mensajes y conversaciones
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/**
 * Hook para marcar mensajes como leídos
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error("Usuario no autenticado");
      return markMessagesAsRead(conversationId, user.id);
    },
    onSuccess: (_, conversationId) => {
      // Invalidar queries para actualizar contadores
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });
}

/**
 * Hook para cerrar una conversación
 */
export function useCloseConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) throw new Error("Usuario no autenticado");
      return closeConversationService(conversationId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/**
 * Hook para verificar límites de conversaciones del propietario
 */
export function useConversationLimits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversation-limits", user?.id],
    queryFn: () => canOwnerCreateMoreConversations(user!.id),
    enabled: !!user,
  });
}
