import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useDeleteAllNotifications } from "@/hooks/use-notifications";
import { NotificationBell } from "./NotificationBell";
import { Bell, CheckCircle2, X, CheckCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function NotificationsList({ shouldShowBackground = false }: { shouldShowBackground?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteAll = useDeleteAllNotifications();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = (notification: { type: string; related_id: string | null; id: string }) => {
    // Marcar como leída
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    // Navegar según el tipo
    if (notification.type === "property_intention" && notification.related_id) {
      navigate(`/intenciones`);
      setIsOpen(false);
    } else if (notification.type === "new_message" && notification.related_id) {
      navigate(`/mensajes`);
      setIsOpen(false);
    } else {
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAll.mutateAsync();
      toast({
        title: "Notificaciones eliminadas",
        description: "Todas las notificaciones han sido eliminadas correctamente.",
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron eliminar las notificaciones.",
      });
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <div>
          <NotificationBell onClick={() => setIsOpen(!isOpen)} shouldShowBackground={shouldShowBackground} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 bg-white dark:bg-gray-950 border border-border shadow-lg z-[101]"
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-7 text-xs"
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como leídas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No tienes notificaciones
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start p-3 cursor-pointer hover:bg-muted/50",
                    !notification.is_read && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        {!notification.is_read && (
                          <Badge variant="secondary" className="h-4 px-1 text-xs">
                            Nuevo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteAll}
                disabled={deleteAll.isPending}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {deleteAll.isPending ? "Eliminando..." : "Borrar todas las notificaciones"}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
