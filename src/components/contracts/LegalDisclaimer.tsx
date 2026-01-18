import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LegalDisclaimerProps {
  /**
   * Texto del disclaimer legal a mostrar
   * Si no se proporciona, se usa el texto por defecto
   */
  text?: string;
  
  /**
   * Texto del checkbox de aceptación
   * Si no se proporciona, se usa el texto por defecto
   */
  checkboxLabel?: string;
  
  /**
   * Callback que se ejecuta cuando cambia el estado de aceptación
   * @param accepted - true si el disclaimer fue aceptado, false en caso contrario
   */
  onAcceptanceChange?: (accepted: boolean) => void;
  
  /**
   * Valor inicial del checkbox
   * @default false
   */
  defaultAccepted?: boolean;
  
  /**
   * Si es true, el checkbox es requerido y no se puede desmarcar una vez marcado
   * @default false
   */
  required?: boolean;
  
  /**
   * Clase CSS adicional para el contenedor
   */
  className?: string;
  
  /**
   * Variante del Alert (default usa estilo de advertencia)
   */
  variant?: "default" | "compact";
  
  /**
   * Si es true, muestra solo el checkbox sin el Alert
   * @default false
   */
  checkboxOnly?: boolean;
}

/**
 * Texto del disclaimer por defecto
 */
const DEFAULT_DISCLAIMER_TEXT = 
  "Este contrato es una plantilla generada automáticamente por RenColombia y no sustituye asesoría legal profesional. Recomendamos consultar con un abogado antes de continuar.";

/**
 * Texto del checkbox por defecto
 */
const DEFAULT_CHECKBOX_LABEL = 
  "He leído y entendido el disclaimer legal. Confirmo que entiendo que este es un template base que requiere revisión legal profesional.";

/**
 * Componente reutilizable para mostrar disclaimers legales con checkbox de aceptación
 * 
 * @example
 * ```tsx
 * const [accepted, setAccepted] = useState(false);
 * 
 * <LegalDisclaimer
 *   onAcceptanceChange={setAccepted}
 *   text="Texto personalizado del disclaimer"
 * />
 * ```
 */
const LegalDisclaimer = ({
  text = DEFAULT_DISCLAIMER_TEXT,
  checkboxLabel = DEFAULT_CHECKBOX_LABEL,
  onAcceptanceChange,
  defaultAccepted = false,
  required = false,
  className,
  variant = "default",
  checkboxOnly = false,
}: LegalDisclaimerProps) => {
  const [accepted, setAccepted] = useState(defaultAccepted);

  // Notificar al padre cuando cambia el estado
  useEffect(() => {
    onAcceptanceChange?.(accepted);
  }, [accepted, onAcceptanceChange]);

  // Resetear cuando cambia defaultAccepted
  useEffect(() => {
    setAccepted(defaultAccepted);
  }, [defaultAccepted]);

  const handleCheckboxChange = (checked: boolean) => {
    // Si es requerido y ya estaba marcado, no permitir desmarcar
    if (required && accepted && !checked) {
      return;
    }
    setAccepted(checked);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Alert con el texto del disclaimer */}
      {!checkboxOnly && (
        <Alert 
          variant="default" 
          className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
        >
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm">
            {variant === "compact" ? (
              <span>
                <strong>⚠️ Disclaimer Legal:</strong> {text}
              </span>
            ) : (
              <>
                <strong className="block mb-1">⚠️ Disclaimer Legal:</strong>
                <span>{text}</span>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Checkbox de aceptación */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="legal-disclaimer-checkbox"
          checked={accepted}
          onCheckedChange={handleCheckboxChange}
          className="mt-0.5"
          aria-required={required}
          aria-describedby="disclaimer-text"
        />
        <Label
          htmlFor="legal-disclaimer-checkbox"
          className="text-sm leading-relaxed cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          id="disclaimer-text"
        >
          {checkboxLabel}
          {required && (
            <span className="text-destructive ml-1" aria-label="requerido">
              *
            </span>
          )}
        </Label>
      </div>
    </div>
  );
};

export default LegalDisclaimer;
