import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  type: 
    | "property_intention" 
    | "new_message" 
    | "property_viewed" 
    | "property_favorited"
    | "review_received" 
    | "contract_request"
    | "contract_started"
    | "contract_pending_approval"
    | "contract_approved"
    | "contract_cancelled"
    | "system";
  title: string;
  message: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Obtener todas las notificaciones del usuario actual
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }

    return (data || []) as Notification[];
  } catch (error) {
    console.error("Error in getUserNotifications:", error);
    return [];
  }
}

/**
 * Obtener conteo de notificaciones no leídas
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Error in getUnreadNotificationCount:", error);
    return 0;
  }
}

/**
 * Marcar notificación como leída
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    return false;
  }
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in markAllNotificationsAsRead:", error);
    return false;
  }
}

/**
 * Eliminar notificación
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("Error deleting notification:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    return false;
  }
}

/**
 * Eliminar todas las notificaciones del usuario
 */
export async function deleteAllNotifications(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting all notifications:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteAllNotifications:", error);
    return false;
  }
}

/**
 * Crear notificación (usar con precaución, normalmente se hace desde triggers)
 */
export async function createNotification(
  userId: string,
  type: Notification["type"],
  title: string,
  message: string,
  relatedId?: string | null
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        related_id: relatedId || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Error in createNotification:", error);
    return null;
  }
}
