# Ejemplos de Uso - LegalDisclaimer

Este documento muestra cómo usar el componente `LegalDisclaimer` en diferentes contextos del flujo de contratos.

## Ejemplo 1: Uso Básico

```tsx
import LegalDisclaimer from "@/components/contracts/LegalDisclaimer";
import { useState } from "react";

function MyComponent() {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  return (
    <div>
      <LegalDisclaimer
        onAcceptanceChange={setDisclaimerAccepted}
      />
      
      <Button disabled={!disclaimerAccepted}>
        Continuar
      </Button>
    </div>
  );
}
```

## Ejemplo 2: Con Texto Personalizado

```tsx
import LegalDisclaimer from "@/components/contracts/LegalDisclaimer";

function ContractRequestForm() {
  const [accepted, setAccepted] = useState(false);

  return (
    <LegalDisclaimer
      text="Al solicitar un contrato de arrendamiento, aceptas que este es un proceso legal vinculante. Recomendamos consultar con un abogado antes de continuar."
      checkboxLabel="He leído y acepto los términos del proceso de contratación digital."
      onAcceptanceChange={setAccepted}
      required={true}
    />
  );
}
```

## Ejemplo 3: En un Dialog de Confirmación

```tsx
import LegalDisclaimer from "@/components/contracts/LegalDisclaimer";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function ConfirmContractDialog({ open, onConfirm }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <Dialog open={open}>
      <DialogContent>
        <h2>Confirmar Inicio de Contrato</h2>
        
        <LegalDisclaimer
          text="Estás a punto de iniciar un contrato de arrendamiento. Este contrato es una plantilla generada automáticamente y no sustituye asesoría legal profesional."
          onAcceptanceChange={setAccepted}
          required={true}
        />
        
        <DialogFooter>
          <Button 
            onClick={onConfirm}
            disabled={!accepted}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Ejemplo 4: Variante Compacta

```tsx
import LegalDisclaimer from "@/components/contracts/LegalDisclaimer";

function CompactDisclaimer() {
  const [accepted, setAccepted] = useState(false);

  return (
    <LegalDisclaimer
      variant="compact"
      onAcceptanceChange={setAccepted}
    />
  );
}
```

## Ejemplo 5: Solo Checkbox (sin Alert)

```tsx
import LegalDisclaimer from "@/components/contracts/LegalDisclaimer";

function CheckboxOnly() {
  const [accepted, setAccepted] = useState(false);

  return (
    <LegalDisclaimer
      checkboxOnly={true}
      checkboxLabel="Acepto los términos y condiciones del servicio."
      onAcceptanceChange={setAccepted}
    />
  );
}
```

## Ejemplo 6: Con Hook useLegalDisclaimer

```tsx
import { useLegalDisclaimer } from "@/components/contracts/useLegalDisclaimer";
import { Button } from "@/components/ui/button";

function ContractApproval() {
  const { accepted, Disclaimer } = useLegalDisclaimer({
    text: "Al aprobar este contrato, aceptas todos los términos y condiciones establecidos.",
    required: true,
  });

  return (
    <div>
      <Disclaimer />
      
      <Button 
        onClick={handleApprove}
        disabled={!accepted}
      >
        Aprobar Contrato
      </Button>
    </div>
  );
}
```

## Ejemplo 7: Integración en ContractRequestModal

```tsx
import LegalDisclaimer from "@/components/contracts/LegalDisclaimer";

function ContractRequestModal({ propertyId, propertyTitle }) {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const createRequest = useCreateContractRequest();

  const handleRequest = async () => {
    if (!disclaimerAccepted) {
      toast({
        variant: "destructive",
        title: "Disclaimer requerido",
        description: "Debes aceptar el disclaimer legal antes de continuar.",
      });
      return;
    }

    await createRequest.mutateAsync({
      propertyId,
      tenantId: user.id,
    });
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Contratación Digital</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la propiedad */}
          <div>{propertyTitle}</div>

          {/* Disclaimer */}
          <LegalDisclaimer
            text="Al solicitar un contrato de arrendamiento digital, aceptas que este proceso es vinculante legalmente. Este contrato es una plantilla generada automáticamente y no sustituye asesoría legal profesional."
            onAcceptanceChange={setDisclaimerAccepted}
            required={true}
          />
        </div>

        <DialogFooter>
          <Button 
            onClick={handleRequest}
            disabled={!disclaimerAccepted || createRequest.isPending}
          >
            Solicitar Contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Ejemplo 8: Integración en ContractEditor

```tsx
import LegalDisclaimer from "@/components/contracts/LegalDisclaimer";

function ContractEditor({ contractId }) {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const sendContract = useSendContract();

  const handleSend = async () => {
    if (!disclaimerAccepted) {
      toast({
        variant: "destructive",
        title: "Disclaimer requerido",
        description: "Debes aceptar el disclaimer legal antes de enviar.",
      });
      return;
    }

    await sendContract.mutateAsync({
      contractId,
      disclaimerAccepted: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Editor de contrato */}
      <Textarea value={content} onChange={setContent} />

      {/* Disclaimer */}
      <LegalDisclaimer
        text="Este contrato es una plantilla generada automáticamente por RentarColombia y no sustituye asesoría legal profesional. Recomendamos consultar con un abogado antes de enviar el contrato al inquilino."
        checkboxLabel="He leído y entendido el disclaimer legal. Confirmo que he revisado el contenido del contrato y entiendo que este es un template base que requiere revisión legal profesional."
        onAcceptanceChange={setDisclaimerAccepted}
        required={true}
      />

      {/* Botón de envío */}
      <Button 
        onClick={handleSend}
        disabled={!disclaimerAccepted || !content.trim()}
      >
        Enviar a Inquilino
      </Button>
    </div>
  );
}
```

## Ejemplo 9: Integración en ContractDetail (Aprobación)

```tsx
import LegalDisclaimer from "@/components/contracts/LegalDisclaimer";

function ContractDetail({ contractId }) {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const approveContract = useApproveContract();

  const handleApprove = async () => {
    if (!disclaimerAccepted) {
      toast({
        variant: "destructive",
        title: "Disclaimer requerido",
        description: "Debes aceptar el disclaimer legal antes de aprobar.",
      });
      return;
    }

    await approveContract.mutateAsync({
      contractId,
      disclaimerAccepted: true,
    });
  };

  return (
    <div>
      {/* Contenido del contrato */}
      <div>{contractContent}</div>

      {/* Disclaimer para aprobación */}
      <LegalDisclaimer
        text="Al aprobar este contrato, aceptas todos los términos y condiciones establecidos. Este contrato es una plantilla generada automáticamente y no sustituye asesoría legal profesional."
        checkboxLabel="He leído y entendido el disclaimer legal. Acepto los términos del contrato."
        onAcceptanceChange={setDisclaimerAccepted}
        required={true}
      />

      <Button 
        onClick={handleApprove}
        disabled={!disclaimerAccepted}
      >
        Aprobar Contrato
      </Button>
    </div>
  );
}
```

## Ejemplo 10: Con Estado Controlado Externo

```tsx
import LegalDisclaimer from "@/components/contracts/LegalDisclaimer";

function ParentComponent() {
  const [accepted, setAccepted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      {!showForm && (
        <LegalDisclaimer
          onAcceptanceChange={setAccepted}
          required={true}
        />
      )}

      {showForm && accepted && (
        <FormComponent />
      )}

      <Button 
        onClick={() => setShowForm(true)}
        disabled={!accepted}
      >
        Continuar
      </Button>
    </div>
  );
}
```

## Props Disponibles

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `text` | `string` | Texto por defecto | Texto del disclaimer legal |
| `checkboxLabel` | `string` | Texto por defecto | Texto del checkbox de aceptación |
| `onAcceptanceChange` | `(accepted: boolean) => void` | - | Callback cuando cambia el estado |
| `defaultAccepted` | `boolean` | `false` | Valor inicial del checkbox |
| `required` | `boolean` | `false` | Si es true, no se puede desmarcar |
| `className` | `string` | - | Clase CSS adicional |
| `variant` | `"default" \| "compact"` | `"default"` | Variante visual |
| `checkboxOnly` | `boolean` | `false` | Si es true, solo muestra checkbox |

## Mejores Prácticas

1. **Siempre usar `required={true}`** en momentos críticos del flujo
2. **Validar el estado antes de acciones importantes** usando el callback
3. **Proporcionar texto contextual** según el momento del flujo
4. **Mantener consistencia** en los textos de checkbox
5. **Usar `variant="compact"`** cuando el espacio es limitado
6. **Resetear el estado** cuando se cierra un modal o se cancela una acción
