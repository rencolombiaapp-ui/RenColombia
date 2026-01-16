import { useState, useEffect, useRef } from "react";
import { X, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ChatMessage from "./ChatMessage";
import LIAAvatar from "./LIAAvatar";
import { findFAQAnswer, getAvailableFAQs, getFAQByNumber } from "./FAQHandler";
import { useProperties } from "@/hooks/use-properties";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import colombiaData from "@/data/colombia-departments.json";
import { cn } from "@/lib/utils";

interface Message {
  text: string;
  isBot: boolean;
  timestamp: Date;
  options?: string[];
  type?: "text" | "options" | "input" | "results" | "rating";
}

type SearchState = 
  | "idle"
  | "start"
  | "department"
  | "city"
  | "neighborhood"
  | "budget"
  | "propertyType"
  | "features"
  | "searching"
  | "results"
  | "rating";

interface SearchData {
  department?: string;
  city?: string;
  neighborhood?: string;
  budget?: number;
  propertyType?: string;
  features: string[];
}

const PROPERTY_FEATURES = [
  "Parqueadero",
  "Ascensor",
  "Balcón",
  "Zona de lavandería",
  "Vigilancia",
  "Piscina",
  "Gimnasio",
  "Cocina integral",
  "Terraza",
  "Vista panorámica",
];

const ChatbotPanel = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchData, setSearchData] = useState<SearchData>({ features: [] });
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [faqMode, setFaqMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Búsqueda de propiedades (solo cuando estamos buscando)
  const shouldSearch = searchState === "searching" || searchState === "results";
  const { data: properties, isLoading: isLoadingProperties } = useProperties({
    city: shouldSearch ? searchData.city : undefined,
    propertyType: shouldSearch && searchData.propertyType !== "Cualquiera" ? searchData.propertyType?.toLowerCase() : undefined,
    maxPrice: shouldSearch ? searchData.budget : undefined,
    selectedFeatures: shouldSearch && searchData.features.length > 0 ? searchData.features : undefined,
  });

  useEffect(() => {
    // Mensaje inicial
    if (messages.length === 0) {
      setMessages([
        {
          text: "Hola 👋 Soy LIA, tu asistente inmobiliaria en RenColombia.\nEstoy aquí para ayudarte a encontrar tu inmueble ideal o resolver cualquier duda.",
          isBot: true,
          timestamp: new Date(),
          type: "options",
          options: ["Buscar inmueble", "Preguntas frecuentes"],
        },
      ]);
      setSearchState("start");
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (text: string, isBot: boolean, options?: string[], type?: Message["type"]) => {
    setMessages((prev) => [
      ...prev,
      {
        text,
        isBot,
        timestamp: new Date(),
        options,
        type,
      },
    ]);
  };

  const handleStartSearch = () => {
    setSearchState("department");
    addMessage(
      "Perfecto, vamos a buscar tu inmueble ideal paso a paso 🏠\n\n¿En qué departamento buscas?",
      true,
      colombiaData.departments.map((d) => d.name).slice(0, 10), // Mostrar primeros 10
      "options"
    );
  };

  const handleFAQ = () => {
    setSearchState("idle");
    setFaqMode(true);
    const faqs = getAvailableFAQs();
    
    if (!faqs || faqs.length === 0) {
      addMessage("Lo siento, no hay preguntas frecuentes disponibles en este momento.", true);
      return;
    }
    
    // Construir el mensaje con emojis numéricos para mejor visualización
    let faqListText = "Aquí tienes nuestras preguntas frecuentes:\n\n";
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"];
    faqs.forEach((faq, index) => {
      const emoji = numberEmojis[index] || `${faq.id}.`;
      faqListText += `${emoji} ${faq.question}\n`;
    });
    faqListText += "\n\nEscribe el número de la pregunta que te interesa (ejemplo: 1, 2, 3...)";
    
    // Agregar el mensaje usando addMessage para mantener consistencia
    // Asegurar que el tipo sea "text" para que se muestre correctamente
    addMessage(faqListText, true, undefined, "text");
  };

  const handleDepartmentSelect = (department: string) => {
    setSearchData((prev) => ({ ...prev, department }));
    const dept = colombiaData.departments.find((d) => d.name === department);
    if (dept && dept.municipalities.length > 0) {
      setAvailableCities(dept.municipalities.slice(0, 15)); // Limitar a 15 ciudades
      setSearchState("city");
      addMessage(department, false);
      addMessage(
        `Excelente, ${department} 🗺️\n\n¿En qué ciudad o municipio?`,
        true,
        dept.municipalities.slice(0, 15),
        "options"
      );
    }
  };

  const handleCitySelect = (city: string) => {
    setSearchData((prev) => ({ ...prev, city }));
    setSearchState("neighborhood");
    addMessage(city, false);
    addMessage(
      `Perfecto, ${city} 📍\n\n¿Tienes algún barrio en mente? (opcional)\n\nPuedes escribir el nombre del barrio o hacer clic en "Continuar" para buscar en toda la ciudad.`,
      true,
      ["Continuar"],
      "options"
    );
  };

  const handleNeighborhoodInput = (neighborhood?: string) => {
    if (neighborhood) {
      setSearchData((prev) => ({ ...prev, neighborhood }));
      addMessage(neighborhood, false);
    }
    setSearchState("budget");
    addMessage(
      "¿Cuál es tu presupuesto mensual máximo? 💰\n\nEscribe el monto en pesos colombianos (COP)",
      true,
      undefined,
      "input"
    );
  };

  const handleBudgetInput = (budget: string) => {
    const budgetNum = parseInt(budget.replace(/[^\d]/g, ""));
    if (budgetNum > 0) {
      setSearchData((prev) => ({ ...prev, budget: budgetNum }));
      setSearchState("propertyType");
      addMessage(`$${budgetNum.toLocaleString("es-CO")}`, false);
      addMessage(
        "¿Qué tipo de inmueble buscas? 🏘️",
        true,
        ["Apartamento", "Casa", "Local", "Cualquiera"],
        "options"
      );
    }
  };

  const handlePropertyTypeSelect = (type: string) => {
    setSearchData((prev) => ({ ...prev, propertyType: type }));
    setSearchState("features");
    addMessage(type, false);
    addMessage(
      "¿Qué características son importantes para ti? (puedes seleccionar varias) ✨",
      true
    );
    // Mostrar características como opciones
    addMessage("", true, PROPERTY_FEATURES, "options");
  };

  const handleFeatureToggle = (feature: string) => {
    setSearchData((prev) => {
      const features = prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature];
      return { ...prev, features };
    });
  };

  const handleSearch = () => {
    setSearchState("searching");
    addMessage(
      `Buscando inmuebles con:\n• ${searchData.city || "Ciudad no especificada"}\n• Hasta $${searchData.budget?.toLocaleString("es-CO") || "N/A"}\n• ${searchData.propertyType || "Cualquiera"}\n• ${searchData.features.length > 0 ? searchData.features.join(", ") : "Sin características específicas"}`,
      false
    );
    addMessage("Buscando inmuebles disponibles... 🔍", true);
  };

  useEffect(() => {
    if (searchState === "searching" && !isLoadingProperties) {
      setSearchState("results");
      const filteredProperties = (properties || []).slice(0, 3);

      if (filteredProperties.length > 0) {
        addMessage(
          `¡Encontré ${filteredProperties.length} ${filteredProperties.length === 1 ? "opción" : "opciones"} que se ajustan a lo que buscas! 🎉`,
          true,
          undefined,
          "results"
        );
        // Los resultados se mostrarán en el componente de mensaje
        setMessages((prev) => [
          ...prev,
          {
            text: "",
            isBot: true,
            timestamp: new Date(),
            type: "results",
            options: filteredProperties.map((p) => p.id),
          },
        ]);
      } else {
        addMessage(
          "No encontré inmuebles con esos criterios 😕\n\n¿Te gustaría:\n• Ajustar el presupuesto\n• Cambiar la ubicación\n• Quitar algunas características",
          true,
          ["Ajustar búsqueda", "Empezar de nuevo"],
          "options"
        );
      }
    }
  }, [isLoadingProperties, properties, searchState]);

  const handleOptionClick = (option: string) => {
    if (searchState === "start") {
      if (option === "Buscar inmueble") {
        handleStartSearch();
      } else if (option === "Preguntas frecuentes") {
        // Agregar mensaje del usuario primero
        addMessage(option, false);
        // Luego mostrar las preguntas frecuentes con un pequeño delay para asegurar renderizado
        setTimeout(() => {
          handleFAQ();
        }, 300);
      }
      return;
    }
    
    // Manejar opciones después de responder una FAQ
    if (faqMode && (option === "Ver otra pregunta" || option === "Buscar inmueble" || option === "Volver al inicio")) {
      if (option === "Ver otra pregunta") {
        // Mantener en modo FAQ y mostrar la lista nuevamente
        const faqs = getAvailableFAQs();
        let faqListText = "Aquí tienes nuestras preguntas frecuentes:\n\n";
        const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"];
        faqs.forEach((faq, index) => {
          const emoji = numberEmojis[index] || `${faq.id}.`;
          faqListText += `${emoji} ${faq.question}\n`;
        });
        faqListText += "\n\nEscribe el número de la pregunta que te interesa (ejemplo: 1, 2, 3...)";
        addMessage(faqListText, true);
      } else if (option === "Buscar inmueble") {
        setFaqMode(false);
        handleStartSearch();
      } else if (option === "Volver al inicio") {
        setFaqMode(false);
        setSearchState("start");
        addMessage(
          "Hola 👋 Soy LIA, tu asistente inmobiliaria en RenColombia.\nEstoy aquí para ayudarte a encontrar tu inmueble ideal o resolver cualquier duda.",
          true,
          ["Buscar inmueble", "Preguntas frecuentes"],
          "options"
        );
      }
      return;
    }

    if (searchState === "department") {
      handleDepartmentSelect(option);
      return;
    }

    if (searchState === "city") {
      handleCitySelect(option);
      return;
    }

    if (searchState === "neighborhood") {
      if (option === "Continuar") {
        handleNeighborhoodInput();
      }
      return;
    }

    if (searchState === "propertyType") {
      handlePropertyTypeSelect(option);
      return;
    }

    if (searchState === "features") {
      handleFeatureToggle(option);
      return;
    }

    if (searchState === "results") {
      if (option === "Ajustar búsqueda") {
        setSearchState("budget");
        addMessage("Vamos a ajustar tu búsqueda. ¿Cuál es tu nuevo presupuesto máximo?", true, undefined, "input");
      } else if (option === "Empezar de nuevo") {
        setSearchData({ features: [] });
        setSearchState("start");
        handleStartSearch();
      }
      return;
    }
  };

  const handleInputSubmit = () => {
    if (!inputValue.trim()) return;

    // Modo FAQ: procesar número de pregunta
    if (faqMode) {
      const number = parseInt(inputValue.trim());
      if (!isNaN(number) && number > 0) {
        const faq = getFAQByNumber(number);
        if (faq) {
          addMessage(inputValue, false);
          let answerText = `${faq.question}\n\n${faq.answer}`;
          if (faq.links && faq.links.length > 0) {
            answerText += "\n\n";
            faq.links.forEach((link) => {
              answerText += `\n[${link.text}](${link.url})`;
            });
          }
          addMessage(answerText, true);
          addMessage(
            "¿Deseas ver otra pregunta o buscar un inmueble?",
            true,
            ["Ver otra pregunta", "Buscar inmueble", "Volver al inicio"],
            "options"
          );
          setInputValue("");
          return;
        } else {
          addMessage(inputValue, false);
          addMessage(
            `No encontré la pregunta número ${number}. Por favor escribe un número entre 1 y ${getAvailableFAQs().length}.`,
            true,
            undefined,
            "input"
          );
          setInputValue("");
          return;
        }
      } else if (inputValue.toLowerCase().includes("volver") || inputValue.toLowerCase().includes("inicio")) {
        setFaqMode(false);
        setSearchState("start");
        addMessage(inputValue, false);
        addMessage(
          "Hola 👋 Soy LIA, tu asistente inmobiliaria en RenColombia.\nEstoy aquí para ayudarte a encontrar tu inmueble ideal o resolver cualquier duda.",
          true,
          ["Buscar inmueble", "Preguntas frecuentes"],
          "options"
        );
        setInputValue("");
        return;
      } else {
        // Intentar buscar por texto
        const faqAnswer = findFAQAnswer(inputValue);
        if (faqAnswer) {
          addMessage(inputValue, false);
          let answerText = faqAnswer.answer;
          if (faqAnswer.links && faqAnswer.links.length > 0) {
            answerText += "\n\n";
            faqAnswer.links.forEach((link) => {
              answerText += `\n[${link.text}](${link.url})`;
            });
          }
          addMessage(answerText, true);
          addMessage(
            "¿Deseas ver otra pregunta o buscar un inmueble?",
            true,
            ["Ver otra pregunta", "Buscar inmueble", "Volver al inicio"],
            "options"
          );
          setInputValue("");
          return;
        } else {
          addMessage(inputValue, false);
          addMessage(
            "Por favor escribe el número de la pregunta que te interesa (1, 2, 3, etc.) o escribe 'volver' para regresar al inicio.",
            true,
            undefined,
            "input"
          );
          setInputValue("");
          return;
        }
      }
    }

    if (searchState === "neighborhood") {
      handleNeighborhoodInput(inputValue);
      setInputValue("");
      return;
    }

    if (searchState === "budget") {
      handleBudgetInput(inputValue);
      setInputValue("");
      return;
    }

    // Buscar en FAQ (modo normal, no FAQ)
    const faqAnswer = findFAQAnswer(inputValue);
    if (faqAnswer) {
      addMessage(inputValue, false);
      let answerText = faqAnswer.answer;
      if (faqAnswer.links && faqAnswer.links.length > 0) {
        answerText += "\n\n";
        faqAnswer.links.forEach((link) => {
          answerText += `\n[${link.text}](${link.url})`;
        });
      }
      addMessage(answerText, true);
      setInputValue("");
      return;
    }

    // Si no es FAQ, responder genérico
    addMessage(inputValue, false);
    addMessage(
      "No estoy seguro de cómo ayudarte con eso. ¿Te gustaría buscar un inmueble o ver las preguntas frecuentes?",
      true,
      ["Buscar inmueble", "Preguntas frecuentes"],
      "options"
    );
    setInputValue("");
  };

  const handleRatingSubmit = async () => {
    if (!rating) return;

    try {
      await supabase.from("chatbot_feedback").insert({
        user_id: user?.id || null,
        rating,
        comment: comment.trim() || null,
        interaction_type: searchState === "results" ? "search" : "faq",
      });

      addMessage("¡Gracias por tu feedback! 🙏", true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error guardando feedback:", error);
    }
  };

  const showRating = () => {
    setSearchState("rating");
    addMessage(
      "¿Te fue útil esta búsqueda? ⭐\n\nCalifica tu experiencia del 1 al 5",
      true,
      ["1", "2", "3", "4", "5"],
      "rating"
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end pointer-events-none">
      <div className="fixed inset-0 bg-black/50 pointer-events-auto" onClick={onClose} />
      <div className="relative w-full max-w-md h-[600px] bg-background border-t border-l border-r border-border rounded-t-2xl shadow-2xl flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <LIAAvatar size="lg" />
            <div>
              <h3 className="font-semibold text-foreground">LIA</h3>
              <p className="text-xs text-muted-foreground">Asistente Inmobiliaria</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index}>
              {msg.type === "results" && msg.options ? (
                <div className="space-y-3">
                  {msg.options.map((propertyId) => {
                    const property = properties?.find((p) => p.id === propertyId);
                    if (!property) return null;
                    const primaryImage = property.property_images?.find((img) => img.is_primary) || property.property_images?.[0];
                    return (
                      <Link key={propertyId} to={`/inmueble/${propertyId}`} onClick={onClose}>
                        <div className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          {primaryImage && (
                            <img
                              src={primaryImage.url}
                              alt={property.title}
                              className="w-full h-32 object-cover rounded-md mb-2"
                            />
                          )}
                          <p className="font-semibold text-sm text-foreground mb-1">{property.title}</p>
                          <p className="text-xs text-muted-foreground mb-1">
                            {property.neighborhood || property.city}
                          </p>
                          <p className="text-primary font-bold">
                            ${property.price.toLocaleString("es-CO")}/mes
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                  <Button onClick={showRating} className="w-full mt-2" size="sm">
                    Calificar experiencia
                  </Button>
                </div>
              ) : msg.type === "rating" && msg.options ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {msg.options.map((star) => (
                      <Button
                        key={star}
                        variant={rating === parseInt(star) ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRating(parseInt(star))}
                      >
                        <Star className={cn("w-4 h-4", rating === parseInt(star) && "fill-current")} />
                        {star}
                      </Button>
                    ))}
                  </div>
                  {rating && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Comentario opcional..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <Button onClick={handleRatingSubmit} className="w-full" size="sm">
                        Enviar calificación
                      </Button>
                    </div>
                  )}
                </div>
              ) : msg.options ? (
                <>
                  <ChatMessage message={msg.text} isBot={msg.isBot} timestamp={msg.timestamp} />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.options.map((option, optIndex) => (
                      <Button
                        key={optIndex}
                        variant="outline"
                        size="sm"
                        onClick={() => handleOptionClick(option)}
                        className="text-xs"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                <ChatMessage message={msg.text} isBot={msg.isBot} timestamp={msg.timestamp} />
              )}
            </div>
          ))}
          {searchState === "features" && searchData.features.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Características seleccionadas:</p>
              <div className="flex flex-wrap gap-2">
                {searchData.features.map((feature) => (
                  <Badge key={feature} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>
              <Button onClick={handleSearch} className="w-full mt-3">
                Buscar inmuebles
              </Button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {(searchState === "neighborhood" || searchState === "budget" || searchState === "idle" || faqMode) && (
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleInputSubmit()}
                placeholder={
                  faqMode
                    ? "Escribe el número de la pregunta (ej: 1, 2, 3...)"
                    : searchState === "budget"
                    ? "Ej: 2000000"
                    : searchState === "neighborhood"
                    ? "Nombre del barrio..."
                    : "Escribe tu pregunta..."
                }
                className="flex-1"
              />
              <Button onClick={handleInputSubmit} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatbotPanel;
