import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatbotPanel from "./ChatbotPanel";
import { cn } from "@/lib/utils";

const ChatbotButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Botón flotante */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-auto px-4 py-3 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "flex items-center gap-2 font-medium"
        )}
        aria-label="Habla con LIA"
      >
        {isOpen ? (
          <>
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Cerrar</span>
          </>
        ) : (
          <>
            <span className="text-lg">💬</span>
            <span className="hidden sm:inline">Habla con LIA</span>
            <span className="sm:hidden">LIA</span>
          </>
        )}
      </Button>

      {/* Panel del chatbot */}
      {isOpen && <ChatbotPanel onClose={() => setIsOpen(false)} />}
    </>
  );
};

export default ChatbotButton;
