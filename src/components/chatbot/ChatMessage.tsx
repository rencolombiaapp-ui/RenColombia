import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import LIAAvatar from "./LIAAvatar";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  timestamp?: Date;
}

const ChatMessage = ({ message, isBot, timestamp }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      {isBot && <LIAAvatar size="md" />}
      
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isBot
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        )}
      >
        {isBot && (
          <p className="text-xs font-semibold text-primary mb-1">LIA</p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message}</p>
        {timestamp && (
          <p className={cn(
            "text-xs mt-1",
            isBot ? "text-muted-foreground" : "text-primary-foreground/70"
          )}>
            {timestamp.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {!isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
