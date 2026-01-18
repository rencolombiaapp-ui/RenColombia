import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  onClick: () => void;
  className?: string;
  shouldShowBackground?: boolean;
}

export function NotificationBell({ onClick, className, shouldShowBackground = false }: NotificationBellProps) {
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  return (
    <Button
      variant={shouldShowBackground ? "ghost" : "ghost"}
      size="icon"
      className={cn(
        "relative",
        !shouldShowBackground && "text-white/90 hover:text-white hover:bg-white/10",
        className
      )}
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
