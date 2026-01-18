import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getContractMessages, type ContractMessageWithDetails } from "@/services/contractMessageService";
import { useAuth } from "@/lib/auth";
import { Loader2, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ContractMessagesPanelProps {
  contractId: string;
}

/**
 * Formatea la fecha de un mensaje para mostrar de forma legible
 */
function formatMessageDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    // Si es hoy, mostrar hora
    if (diffInHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // Si es ayer
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
      return `Ayer a las ${date.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    // Si es hace menos de una semana, mostrar día y hora
    if (diffInHours < 168) {
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    }

    // Si es más antiguo, mostrar fecha completa
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Fecha inválida";
  }
}

const ContractMessagesPanel = ({ contractId }: ContractMessagesPanelProps) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ["contract-messages", contractId],
    queryFn: () => getContractMessages(contractId),
    enabled: !!contractId,
    staleTime: 30 * 1000, // 30 segundos
  });

  // Auto-scroll al último mensaje cuando se cargan nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Cargando mensajes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          Error al cargar los mensajes. Intenta recargar la página.
        </p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          Aún no hay mensajes en este contrato.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Sé el primero en iniciar la conversación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
      {messages.map((message: ContractMessageWithDetails) => {
        const isOwnMessage = message.sender_id === user?.id;
        const isSystemMessage = message.message_type === "system";

        // Mensajes de sistema: estilo centrado y gris
        if (isSystemMessage) {
          return (
            <div key={message.id} className="flex justify-center">
              <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1.5 rounded-full max-w-[80%] text-center">
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className="text-[10px] mt-1 opacity-70">
                  {formatMessageDate(message.created_at)}
                </p>
              </div>
            </div>
          );
        }

        // Mensajes de usuario: estilo diferenciado por remitente
        return (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              isOwnMessage ? "justify-end" : "justify-start"
            )}
          >
            {/* Avatar del remitente (solo si no es propio) */}
            {!isOwnMessage && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {message.sender_avatar_url ? (
                  <img
                    src={message.sender_avatar_url}
                    alt={message.sender_name || "Usuario"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            )}

            {/* Contenedor del mensaje */}
            <div
              className={cn(
                "max-w-[70%] rounded-lg px-4 py-2.5",
                isOwnMessage
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {/* Nombre del remitente (solo si no es propio) */}
              {!isOwnMessage && (
                <p
                  className={cn(
                    "text-xs font-semibold mb-1",
                    "text-muted-foreground"
                  )}
                >
                  {message.sender_name || message.sender_email || "Usuario"}
                </p>
              )}

              {/* Contenido del mensaje */}
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>

              {/* Timestamp */}
              <p
                className={cn(
                  "text-xs mt-1.5",
                  isOwnMessage
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {formatMessageDate(message.created_at)}
              </p>
            </div>

            {/* Avatar del remitente (solo si es propio) */}
            {isOwnMessage && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ContractMessagesPanel;
