import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Loader2,
  ArrowLeft,
  Send,
  MapPin,
  DollarSign,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useMarkAsRead,
  useCloseConversation,
  useConversationLimits,
} from "@/hooks/use-conversations";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const Messages = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: conversations = [], isLoading } = useConversations();
  const { data: limits } = useConversationLimits();
  const { toast } = useToast();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const closeConversation = useCloseConversation();

  const { data: messages = [], refetch: refetchMessages } = useConversationMessages(selectedConversationId);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // Marcar mensajes como leídos cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversationId && user) {
      markAsRead.mutate(selectedConversationId);
    }
  }, [selectedConversationId, user]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    const messagesContainer = document.getElementById("messages-container");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!selectedConversationId || !messageContent.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConversationId,
        content: messageContent.trim(),
      });
      setMessageContent("");
      refetchMessages();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al enviar mensaje",
        description: error.message || "No se pudo enviar el mensaje. Intenta de nuevo.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConversationId) return;

    try {
      await closeConversation.mutateAsync(selectedConversationId);
      toast({
        title: "Conversación cerrada",
        description: "La conversación ha sido marcada como cerrada.",
      });
      setSelectedConversationId(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo cerrar la conversación.",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: es,
      });
    } catch {
      return "";
    }
  };

  // Verificar si el usuario es propietario o inmobiliaria
  const isPublisher = profile?.role === "landlord" || profile?.publisher_type === "inmobiliaria" || profile?.publisher_type === "individual";

  // Filtrar conversaciones: propietarios ven solo las suyas como owner, inquilinos como tenant
  const ownerConversations = conversations.filter((c) => c.owner_id === user?.id);
  const tenantConversations = conversations.filter((c) => c.tenant_id === user?.id);

  // Mostrar conversaciones según el rol
  const displayConversations = isPublisher ? ownerConversations : tenantConversations;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              to={isPublisher ? "/mis-inmuebles" : "/buscar"}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isPublisher ? "Volver a mis inmuebles" : "Volver a buscar"}</span>
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                  Mensajes
                </h1>
                <p className="text-muted-foreground">
                  {isPublisher 
                    ? "Gestiona las conversaciones sobre tus propiedades"
                    : "Tus conversaciones con propietarios e inmobiliarias"}
                </p>
              </div>
              {isPublisher && limits && !limits.canCreate && (
                <Badge variant="outline" className="text-sm">
                  {limits.activeCount} / {limits.maxAllowed} conversaciones activas
                </Badge>
              )}
            </div>
          </div>

          {/* Límite alcanzado - CTA para mejorar plan (solo para propietarios) */}
          {isPublisher && limits && !limits.canCreate && limits.maxAllowed && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground mb-1">
                  Has alcanzado el límite de conversaciones
                </p>
                <p className="text-sm text-muted-foreground">
                  Actualiza a PRO para conversaciones ilimitadas y más funciones.
                </p>
              </div>
              <Link to="/planes">
                <Button size="sm">Mejorar plan</Button>
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de conversaciones */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-semibold text-foreground">
                    Conversaciones ({displayConversations.length})
                  </h2>
                </div>
                {isLoading ? (
                  <div className="p-8 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : displayConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No tienes conversaciones aún
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                    {displayConversations.map((conversation) => {
                      const otherUser = isPublisher
                        ? { name: conversation.tenant_name, email: conversation.tenant_email }
                        : { name: conversation.owner_name, email: conversation.owner_email };

                      return (
                        <button
                          key={conversation.id}
                          onClick={() => setSelectedConversationId(conversation.id)}
                          className={cn(
                            "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                            selectedConversationId === conversation.id && "bg-muted"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {otherUser.name || "Usuario"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {conversation.property_title}
                              </p>
                            </div>
                            {conversation.unread_count > 0 && (
                              <Badge className="bg-primary text-primary-foreground">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          {conversation.last_message_content && (
                            <p className="text-sm text-muted-foreground truncate mb-2">
                              {conversation.last_message_content}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(conversation.last_message_at || conversation.created_at)}
                            </span>
                            {conversation.status === "closed" && (
                              <Badge variant="outline" className="text-xs">
                                Cerrada
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Vista de conversación */}
            <div className="lg:col-span-2">
              {selectedConversation ? (
                <div className="bg-card border border-border rounded-lg flex flex-col h-[600px]">
                  {/* Header de conversación */}
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {isPublisher
                              ? selectedConversation.tenant_name || "Usuario"
                              : selectedConversation.owner_name || "Propietario"}
                          </h3>
                          <Link
                            to={`/inmueble/${selectedConversation.property_id}`}
                            className="text-sm text-primary hover:underline truncate block"
                          >
                            {selectedConversation.property_title}
                          </Link>
                        </div>
                        {selectedConversation.status === "open" && isPublisher && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCloseConversation}
                            disabled={closeConversation.isPending}
                          >
                            {closeConversation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <X className="w-4 h-4 mr-2" />
                            )}
                            Cerrar
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {selectedConversation.property_city}
                          {selectedConversation.property_neighborhood && `, ${selectedConversation.property_neighborhood}`}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatPrice(selectedConversation.property_price)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mensajes */}
                  <div
                    id="messages-container"
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No hay mensajes aún</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isOwnMessage = message.sender_id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex",
                              isOwnMessage ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[70%] rounded-lg px-4 py-2",
                                isOwnMessage
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              )}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              <p
                                className={cn(
                                  "text-xs mt-1",
                                  isOwnMessage
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                )}
                              >
                                {formatDate(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input de mensaje */}
                  {selectedConversation.status === "open" && (
                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2">
                        <Textarea
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder="Escribe tu mensaje..."
                          className="min-h-[80px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!messageContent.trim() || isSending}
                          size="icon"
                          className="h-auto"
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedConversation.status === "closed" && (
                    <div className="p-4 border-t border-border bg-muted/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4" />
                        Esta conversación está cerrada
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg h-[600px] flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Selecciona una conversación para ver los mensajes
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
