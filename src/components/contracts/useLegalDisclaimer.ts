import { useState, useCallback } from "react";

/**
 * Hook para manejar el estado del disclaimer legal
 * Facilita la integración del componente LegalDisclaimer
 * 
 * @example
 * ```tsx
 * const { accepted, Disclaimer } = useLegalDisclaimer({
 *   text: "Texto personalizado",
 *   required: true
 * });
 * 
 * return (
 *   <>
 *     <Disclaimer />
 *     <Button disabled={!accepted}>Continuar</Button>
 *   </>
 * );
 * ```
 */
export function useLegalDisclaimer(options?: {
  text?: string;
  checkboxLabel?: string;
  defaultAccepted?: boolean;
  required?: boolean;
  variant?: "default" | "compact";
  checkboxOnly?: boolean;
}) {
  const [accepted, setAccepted] = useState(options?.defaultAccepted || false);

  const handleAcceptanceChange = useCallback((isAccepted: boolean) => {
    setAccepted(isAccepted);
  }, []);

  const reset = useCallback(() => {
    setAccepted(options?.defaultAccepted || false);
  }, [options?.defaultAccepted]);

  // Importar dinámicamente para evitar problemas de circular dependencies
  const Disclaimer = useCallback(
    (props?: Partial<typeof options>) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const LegalDisclaimer = require("./LegalDisclaimer").default;
      return (
        <LegalDisclaimer
          {...options}
          {...props}
          onAcceptanceChange={handleAcceptanceChange}
          defaultAccepted={accepted}
        />
      );
    },
    [accepted, handleAcceptanceChange, options]
  );

  return {
    accepted,
    setAccepted,
    reset,
    Disclaimer,
  };
}
