import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  type Notification,
} from "@/services/notificationService";

/**
 * Hook para obtener todas las notificaciones del usuario
 */
export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => {
      if (!user) return [];
      return getUserNotifications(user.id);
    },
    enabled: !!user,
    staleTime: 30 * 1000, // Cache por 30 segundos
    refetchInterval: 60 * 1000, // Refrescar cada minuto
    retry: false,
    throwOnError: false,
  });
}

/**
 * Hook para obtener el conteo de notificaciones no leídas
 */
export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-notification-count", user?.id],
    queryFn: () => {
      if (!user) return 0;
      return getUnreadNotificationCount(user.id);
    },
    enabled: !!user,
    staleTime: 30 * 1000, // Cache por 30 segundos
    refetchInterval: 60 * 1000, // Refrescar cada minuto
    retry: false,
    throwOnError: false,
  });
}

/**
 * Hook para marcar una notificación como leída
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count", user?.id] });
    },
  });
}

/**
 * Hook para marcar todas las notificaciones como leídas
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: () => {
      if (!user) throw new Error("User not authenticated");
      return markAllNotificationsAsRead(user.id);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count", user?.id] });
    },
  });
}

/**
 * Hook para eliminar una notificación
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count", user?.id] });
    },
  });
}

/**
 * Hook para eliminar todas las notificaciones del usuario
 */
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: () => {
      if (!user) throw new Error("User not authenticated");
      return deleteAllNotifications(user.id);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count", user?.id] });
    },
  });
}
