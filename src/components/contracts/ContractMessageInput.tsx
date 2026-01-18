import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendContractMessage, type ContractMessageType } from "@/services/contractMessageService";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ContractMessageInputProps {
  contractId: string;
  contractStatus: string;
  disabled?: boolean;
}

const ContractMessageInput = ({
  contractId,
  contractStatus,
  disabled: externalDisabled = false,
}: ContractMessageInputProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageContent, setMessageContent] = useState("");

  // Verificar si el contrato está cancelado o expirado
  const isContractClosed = contractStatus === "cancelled" || contractStatus === "expired";

  // Mutación para enviar mensaje
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await sendContractMessage({
        contractId,
        content: content.trim(),
        messageType: "comment" as ContractMessageType,
      });
    },
    onSuccess: () => {
      // Limpiar input
      setMessageContent("");
      
      // Invalidar y refetch mensajes
      queryClient.invalidateQueries({ queryKey: ["contract-messages", contractId] });
      
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al enviar mensaje",
        description: error.message || "No se pudo enviar el mensaje. Intenta de nuevo.",
      });
    },
  });

  const handleSend = () => {
    if (!messageContent.trim() || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate(messageContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enviar con Enter (sin Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = 
    externalDisabled || 
    isContractClosed || 
    !user || 
    !messageContent.trim() || 
    sendMessageMutation.isPending;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Textarea
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isContractClosed
              ? "Este contrato está cerrado. No se pueden enviar más mensajes."
              : "Escribe un mensaje..."
          }
          disabled={isDisabled}
          className="min-h-[80px] resize-none"
          rows={3}
        />
        <Button
          onClick={handleSend}
          disabled={isDisabled}
          className="self-end"
          size="default"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      {isContractClosed && (
        <p className="text-xs text-muted-foreground">
          No se pueden enviar mensajes en contratos cancelados o expirados.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Presiona Enter para enviar, Shift+Enter para nueva línea
      </p>
    </div>
  );
};

export default ContractMessageInput;
