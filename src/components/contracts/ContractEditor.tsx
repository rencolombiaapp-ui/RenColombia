import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  startContract, 
  approveAndSendContract,
  getContract,
  type StartContractParams,
  type RentalContractWithDetails 
} from "@/services/rentalContractService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  FileText, 
  Save, 
  Send, 
  AlertCircle, 
  User, 
  Home, 
  DollarSign,
  Calendar,
  MapPin,
  Building2,
  LayoutTemplate
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface ContractEditorProps {
  propertyId: string;
  tenantId: string;
  contractRequestId?: string;
  propertyTitle: string;
  propertyAddress?: string | null;
  propertyPrice: number;
  tenantName: string | null;
  tenantEmail: string;
  onSuccess?: (contractId: string) => void;
  onCancel?: () => void;
}

/**
 * Templates de contrato disponibles
 */
const CONTRACT_TEMPLATES = {
  standard: {
    id: "standard",
    name: "Estándar",
    description: "Template completo con todas las cláusulas básicas",
    content: `# CONTRATO DE ARRENDAMIENTO DE INMUEBLE

## DATOS DE LAS PARTES

### ARRENDADOR

**Nombre:** {{landlord_name}}
**Correo Electrónico:** {{landlord_email}}

### ARRENDATARIO

**Nombre:** {{tenant_name}}
**Correo Electrónico:** {{tenant_email}}

## DATOS DEL INMUEBLE

**Dirección:** {{property_address}}
**Precio Mensual:** ${{monthly_price}} COP

## TÉRMINOS DEL CONTRATO

### 1. OBJETO DEL CONTRATO

El ARRENDADOR cede en arrendamiento al ARRENDATARIO el inmueble descrito anteriormente, para que lo use como vivienda, bajo los términos y condiciones establecidos en el presente contrato.

### 2. DURACIÓN

El presente contrato tendrá una duración de [DURACIÓN] meses, iniciando el [FECHA_INICIO] y finalizando el [FECHA_FIN].

### 3. CANON DE ARRENDAMIENTO

El ARRENDATARIO se obliga a pagar al ARRENDADOR un canon de arrendamiento mensual de ${{monthly_price}} COP (pesos colombianos), pagadero por anticipado dentro de los primeros cinco (5) días de cada mes.

### 4. DEPÓSITO DE GARANTÍA

El ARRENDATARIO entregará al ARRENDADOR un depósito de garantía equivalente a [DEPOSITO] meses de canon de arrendamiento, que será devuelto al término del contrato, previa verificación del estado del inmueble.

### 5. OBLIGACIONES DEL ARRENDADOR

a) Entregar el inmueble en buen estado de conservación y funcionamiento.
b) Realizar las reparaciones necesarias que no sean atribuibles al uso normal del inmueble.
c) Mantener el inmueble en condiciones habitables.

### 6. OBLIGACIONES DEL ARRENDATARIO

a) Pagar puntualmente el canon de arrendamiento y los servicios públicos.
b) Usar el inmueble exclusivamente como vivienda.
c) Mantener el inmueble en buen estado de conservación.
d) No realizar modificaciones sin autorización escrita del ARRENDADOR.
e) Permitir al ARRENDADOR la inspección del inmueble con previo aviso.

### 7. TERMINACIÓN DEL CONTRATO

El presente contrato terminará:
a) Por vencimiento del plazo estipulado.
b) Por mutuo acuerdo de las partes.
c) Por incumplimiento de cualquiera de las obligaciones establecidas.

### 8. DISPOSICIONES GENERALES

Cualquier modificación al presente contrato deberá realizarse por escrito y ser firmada por ambas partes.

---

**FECHA:** [FECHA_ACTUAL]

**ARRENDADOR**                          **ARRENDATARIO**

_________________________              _________________________
{{landlord_name}}                      {{tenant_name}}`,
  },
  simplified: {
    id: "simplified",
    name: "Simplificado",
    description: "Template corto y directo para contratos básicos",
    content: `# CONTRATO DE ARRENDAMIENTO

## PARTES CONTRATANTES

**ARRENDADOR:** {{landlord_name}} ({{landlord_email}})
**ARRENDATARIO:** {{tenant_name}} ({{tenant_email}})

## INMUEBLE

**Dirección:** {{property_address}}
**Canon Mensual:** ${{monthly_price}} COP

## TÉRMINOS PRINCIPALES

### 1. DURACIÓN Y PRECIO

El contrato tiene una duración de [DURACIÓN] meses. El canon de arrendamiento es de ${{monthly_price}} COP mensuales, pagadero dentro de los primeros 5 días de cada mes.

### 2. DEPÓSITO

Se requiere un depósito de garantía de [DEPOSITO] meses de canon, reembolsable al término del contrato.

### 3. OBLIGACIONES

**ARRENDADOR:** Entregar el inmueble en buen estado y realizar reparaciones necesarias.

**ARRENDATARIO:** Pagar puntualmente, usar el inmueble como vivienda, mantenerlo en buen estado y no realizar modificaciones sin autorización.

### 4. TERMINACIÓN

El contrato puede terminar por vencimiento del plazo, mutuo acuerdo o incumplimiento de obligaciones.

---

**FECHA:** [FECHA_ACTUAL]

**ARRENDADOR**                          **ARRENDATARIO**

_________________________              _________________________
{{landlord_name}}                      {{tenant_name}}`,
  },
  detailed: {
    id: "detailed",
    name: "Detallado",
    description: "Template completo con cláusulas adicionales y más detalle",
    content: `# CONTRATO DE ARRENDAMIENTO DE INMUEBLE

## DATOS DE LAS PARTES

### ARRENDADOR

**Nombre Completo:** {{landlord_name}}
**Correo Electrónico:** {{landlord_email}}
**Documento de Identidad:** [DOCUMENTO_ARRENDADOR]

### ARRENDATARIO

**Nombre Completo:** {{tenant_name}}
**Correo Electrónico:** {{tenant_email}}
**Documento de Identidad:** [DOCUMENTO_ARRENDATARIO]

## DATOS DEL INMUEBLE

**Dirección Completa:** {{property_address}}
**Tipo de Inmueble:** [TIPO_INMUEBLE]
**Área:** [AREA] m²
**Canon de Arrendamiento Mensual:** ${{monthly_price}} COP (pesos colombianos)

## TÉRMINOS Y CONDICIONES DEL CONTRATO

### CLÁUSULA PRIMERA: OBJETO DEL CONTRATO

El ARRENDADOR cede en arrendamiento al ARRENDATARIO el inmueble descrito en la presente cláusula, para que lo use exclusivamente como vivienda, bajo los términos y condiciones establecidos en el presente contrato.

### CLÁUSULA SEGUNDA: DURACIÓN DEL CONTRATO

El presente contrato tendrá una duración de [DURACIÓN] meses calendario, iniciando el día [FECHA_INICIO] y finalizando el día [FECHA_FIN]. El contrato se prorrogará automáticamente por períodos iguales si ninguna de las partes lo denuncia con treinta (30) días de anticipación.

### CLÁUSULA TERCERA: CANON DE ARRENDAMIENTO

El ARRENDATARIO se obliga a pagar al ARRENDADOR un canon de arrendamiento mensual de ${{monthly_price}} COP (pesos colombianos), pagadero por anticipado dentro de los primeros cinco (5) días hábiles de cada mes calendario, mediante transferencia bancaria o consignación a la cuenta que el ARRENDADOR indique.

### CLÁUSULA CUARTA: DEPÓSITO DE GARANTÍA

El ARRENDATARIO entregará al ARRENDADOR un depósito de garantía equivalente a [DEPOSITO] meses de canon de arrendamiento, que será devuelto al término del contrato, previa verificación del estado del inmueble y el cumplimiento de todas las obligaciones contractuales.

### CLÁUSULA QUINTA: SERVICIOS PÚBLICOS

Los servicios públicos (energía, agua, gas, internet, etc.) correrán por cuenta del ARRENDATARIO, quien deberá realizar las conexiones y pagos correspondientes a su nombre.

### CLÁUSULA SEXTA: OBLIGACIONES DEL ARRENDADOR

El ARRENDADOR se obliga a:
a) Entregar el inmueble en buen estado de conservación y funcionamiento.
b) Realizar las reparaciones necesarias que no sean atribuibles al uso normal del inmueble.
c) Mantener el inmueble en condiciones habitables y cumplir con las normas de seguridad.
d) No interferir en el uso pacífico del inmueble por parte del ARRENDATARIO.

### CLÁUSULA SÉPTIMA: OBLIGACIONES DEL ARRENDATARIO

El ARRENDATARIO se obliga a:
a) Pagar puntualmente el canon de arrendamiento y los servicios públicos.
b) Usar el inmueble exclusivamente como vivienda, sin destinarlo a otros fines.
c) Mantener el inmueble en buen estado de conservación y realizar reparaciones menores.
d) No realizar modificaciones, mejoras o alteraciones sin autorización escrita del ARRENDADOR.
e) Permitir al ARRENDADOR la inspección del inmueble con previo aviso de al menos 24 horas.
f) No subarrendar ni ceder el inmueble sin autorización escrita del ARRENDADOR.
g) Responder por los daños causados al inmueble o a terceros durante su uso.

### CLÁUSULA OCTAVA: MORA Y PENALIZACIONES

En caso de mora en el pago del canon de arrendamiento, el ARRENDATARIO pagará intereses de mora equivalentes a la tasa de interés corriente del mercado, calculados sobre el monto adeudado.

### CLÁUSULA NOVENA: TERMINACIÓN DEL CONTRATO

El presente contrato terminará:
a) Por vencimiento del plazo estipulado.
b) Por mutuo acuerdo de las partes.
c) Por incumplimiento de cualquiera de las obligaciones establecidas.
d) Por destrucción total del inmueble por caso fortuito o fuerza mayor.

### CLÁUSULA DÉCIMA: DISPOSICIONES GENERALES

a) Cualquier modificación al presente contrato deberá realizarse por escrito y ser firmada por ambas partes.
b) Las partes se someten a la jurisdicción de los tribunales de [CIUDAD] para resolver cualquier controversia.
c) El presente contrato se rige por las leyes de la República de Colombia.

---

**FECHA DE FIRMA:** [FECHA_ACTUAL]

**LUGAR:** [CIUDAD], Colombia

**ARRENDADOR**                          **ARRENDATARIO**

_________________________              _________________________
{{landlord_name}}                      {{tenant_name}}

**C.C. [DOCUMENTO_ARRENDADOR]**        **C.C. [DOCUMENTO_ARRENDATARIO]**`,
  },
};

type TemplateId = keyof typeof CONTRACT_TEMPLATES;

/**
 * Reemplaza variables en el template con valores reales
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let content = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    content = content.replace(regex, value || "");
  });
  return content;
}

/**
 * Genera el contenido inicial del contrato usando un template específico
 */
function generateContractContent(
  templateId: TemplateId,
  tenantName: string | null,
  tenantEmail: string,
  landlordName: string | null,
  landlordEmail: string,
  propertyAddress: string | null,
  monthlyPrice: number
): string {
  const template = CONTRACT_TEMPLATES[templateId];
  if (!template) {
    // Fallback al template estándar si no se encuentra
    return generateContractContent(
      "standard",
      tenantName,
      tenantEmail,
      landlordName,
      landlordEmail,
      propertyAddress,
      monthlyPrice
    );
  }

  const variables = {
    tenant_name: tenantName || tenantEmail,
    tenant_email: tenantEmail,
    landlord_name: landlordName || landlordEmail,
    landlord_email: landlordEmail,
    property_address: propertyAddress || "Dirección no especificada",
    monthly_price: monthlyPrice.toLocaleString("es-CO"),
  };

  return replaceTemplateVariables(template.content, variables);
}

const ContractEditor = ({
  propertyId,
  tenantId,
  contractRequestId,
  propertyTitle,
  propertyAddress,
  propertyPrice,
  tenantName,
  tenantEmail,
  onSuccess,
  onCancel,
}: ContractEditorProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contractContent, setContractContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("standard");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimerDialog, setShowDisclaimerDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Obtener nombre del propietario
  const landlordName = profile?.publisher_type === "inmobiliaria" 
    ? profile?.company_name 
    : profile?.full_name;
  const landlordEmail = profile?.email || "";

  // Buscar si ya existe un contrato en draft para esta propiedad e inquilino
  const { data: existingContract, isLoading: isLoadingContract } = useQuery({
    queryKey: ["contract-draft", propertyId, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_contracts")
        .select("*")
        .eq("property_id", propertyId)
        .eq("tenant_id", tenantId)
        .eq("status", "draft")
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data as RentalContractWithDetails | null;
    },
    enabled: !!propertyId && !!tenantId,
  });

  // Generar contenido inicial cuando se carga el componente o cuando existe un contrato
  useEffect(() => {
    if (existingContract) {
      // Si ya existe un contrato, usar su contenido
      setContractContent(existingContract.contract_content || "");
    } else if (!isLoadingContract && !isGenerating) {
      // Si no existe, generar contenido inicial con el template seleccionado
      setIsGenerating(true);
      const generated = generateContractContent(
        selectedTemplate,
        tenantName,
        tenantEmail,
        landlordName || null,
        landlordEmail,
        propertyAddress || null,
        propertyPrice
      );
      setContractContent(generated);
      setIsGenerating(false);
    }
  }, [existingContract, isLoadingContract, selectedTemplate, tenantName, tenantEmail, landlordName, landlordEmail, propertyAddress, propertyPrice, isGenerating]);

  // Manejar cambio de template
  const handleTemplateChange = (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
    // Solo regenerar si no hay contrato existente
    if (!existingContract) {
      setIsGenerating(true);
      const generated = generateContractContent(
        templateId,
        tenantName,
        tenantEmail,
        landlordName || null,
        landlordEmail,
        propertyAddress || null,
        propertyPrice
      );
      setContractContent(generated);
      setIsGenerating(false);
    }
  };

  // Crear contrato inicial (si no existe)
  const createContractMutation = useMutation({
    mutationFn: async (params: StartContractParams) => {
      return await startContract(params);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al crear contrato",
        description: error.message,
      });
    },
  });

  // Guardar borrador (actualizar contenido)
  const saveDraftMutation = useMutation({
    mutationFn: async ({ contractId, content }: { contractId: string; content: string }) => {
      const { error } = await supabase
        .from("rental_contracts")
        .update({ contract_content: content })
        .eq("id", contractId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Borrador guardado",
        description: "El contrato se ha guardado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["contract-draft"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "No se pudo guardar el borrador",
      });
    },
  });

  // Enviar contrato al inquilino
  const sendContractMutation = useMutation({
    mutationFn: async ({ contractId, disclaimerAccepted }: { contractId: string; disclaimerAccepted: boolean }) => {
      return await approveAndSendContract(contractId, disclaimerAccepted);
    },
    onSuccess: (result, variables) => {
      toast({
        title: "Contrato enviado",
        description: "El contrato ha sido enviado al inquilino para su revisión.",
      });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract-draft"] });
      queryClient.invalidateQueries({ queryKey: ["contract-requests"] });
      
      if (onSuccess) {
        onSuccess(variables.contractId);
      } else {
        navigate(`/contratos/${variables.contractId}`);
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al enviar contrato",
        description: error.message,
      });
    },
  });

  // Manejar guardar borrador
  const handleSaveDraft = async () => {
    if (!contractContent.trim()) {
      toast({
        variant: "destructive",
        title: "Contenido vacío",
        description: "El contrato debe tener contenido antes de guardar.",
      });
      return;
    }

    if (existingContract) {
      // Actualizar contrato existente
      await saveDraftMutation.mutateAsync({
        contractId: existingContract.id,
        content: contractContent,
      });
    } else {
      // Crear nuevo contrato en draft
      try {
        const contract = await createContractMutation.mutateAsync({
          propertyId,
          tenantId,
          contractRequestId,
          monthlyRent: propertyPrice,
        });

        // Actualizar contenido después de crear
        await saveDraftMutation.mutateAsync({
          contractId: contract.id,
          content: contractContent,
        });
      } catch (error) {
        // El error ya se maneja en la mutación
      }
    }
  };

  // Manejar envío del contrato
  const handleSendContract = () => {
    if (!disclaimerAccepted) {
      setShowDisclaimerDialog(true);
      return;
    }

    if (!contractContent.trim()) {
      toast({
        variant: "destructive",
        title: "Contenido vacío",
        description: "El contrato debe tener contenido antes de enviar.",
      });
      return;
    }

    // Asegurar que el contrato existe antes de enviar
    if (existingContract) {
      sendContractMutation.mutate({
        contractId: existingContract.id,
        disclaimerAccepted: true,
      });
    } else {
      // Crear contrato primero, luego enviar
      createContractMutation.mutate(
        {
          propertyId,
          tenantId,
          contractRequestId,
          monthlyRent: propertyPrice,
        },
        {
          onSuccess: async (contract) => {
            // Actualizar contenido antes de enviar
            await supabase
              .from("rental_contracts")
              .update({ contract_content: contractContent })
              .eq("id", contract.id);

            // Enviar contrato
            sendContractMutation.mutate({
              contractId: contract.id,
              disclaimerAccepted: true,
            });
          },
        }
      );
    }
  };

  const isLoading = isLoadingContract || isGenerating;
  const isSaving = saveDraftMutation.isPending || createContractMutation.isPending;
  const isSending = sendContractMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Información del contrato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Editor de Contrato de Arrendamiento
          </CardTitle>
          <CardDescription>
            Genera y edita el contrato antes de enviarlo al inquilino
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Información de las partes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="w-4 h-4" />
                Propiedad
              </div>
              <p className="text-sm text-muted-foreground">{propertyTitle}</p>
              {propertyAddress && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {propertyAddress}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4" />
                Inquilino
              </div>
              <p className="text-sm text-muted-foreground">
                {tenantName || tenantEmail}
              </p>
              <p className="text-xs text-muted-foreground">{tenantEmail}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4" />
                Precio Mensual
              </div>
              <p className="text-sm font-semibold">
                ${propertyPrice.toLocaleString("es-CO")} COP
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer Legal */}
      <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-sm">
          <strong>⚠️ Disclaimer Legal:</strong> Este contrato es una plantilla generada automáticamente por RentarColombia y no sustituye asesoría legal profesional. Recomendamos consultar con un abogado antes de enviar el contrato al inquilino.
        </AlertDescription>
      </Alert>

      {/* Selector de Template */}
      {!existingContract && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5" />
              Seleccionar Template
            </CardTitle>
            <CardDescription>
              Elige un template base para generar el contrato. Puedes editarlo después.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="template-select">Template de Contrato</Label>
              <Select
                value={selectedTemplate}
                onValueChange={(value) => handleTemplateChange(value as TemplateId)}
                disabled={isGenerating || isLoading}
              >
                <SelectTrigger id="template-select">
                  <SelectValue placeholder="Selecciona un template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CONTRACT_TEMPLATES).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {template.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor de contenido */}
      <Card>
        <CardHeader>
          <CardTitle>Contenido del Contrato</CardTitle>
          <CardDescription>
            {existingContract 
              ? "Edita el contenido del contrato según tus necesidades."
              : "Edita el contenido del contrato según tus necesidades. Las variables ya han sido reemplazadas automáticamente."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Generando contrato...
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contract-content">Contenido del Contrato</Label>
                <Textarea
                  id="contract-content"
                  value={contractContent}
                  onChange={(e) => setContractContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="El contenido del contrato aparecerá aquí..."
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checkbox de disclaimer */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="disclaimer-checkbox"
          checked={disclaimerAccepted}
          onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
        />
        <Label
          htmlFor="disclaimer-checkbox"
          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          He leído y entendido el disclaimer legal. Confirmo que he revisado el contenido del contrato y entiendo que este es un template base que requiere revisión legal profesional.
        </Label>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSaving || isSending}>
            Cancelar
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isLoading || isSaving || isSending || !contractContent.trim()}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Borrador
            </>
          )}
        </Button>
        <Button
          onClick={handleSendContract}
          disabled={isLoading || isSaving || isSending || !contractContent.trim() || !disclaimerAccepted}
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar a Inquilino
            </>
          )}
        </Button>
      </div>

      {/* Dialog de confirmación de disclaimer */}
      <Dialog open={showDisclaimerDialog} onOpenChange={setShowDisclaimerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disclaimer Legal Requerido</DialogTitle>
            <DialogDescription>
              Debes aceptar el disclaimer legal antes de enviar el contrato al inquilino.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm">
                Este contrato es una plantilla generada automáticamente por RentarColombia y no sustituye asesoría legal profesional. Recomendamos consultar con un abogado antes de enviar el contrato.
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex items-start space-x-2">
              <Checkbox
                id="dialog-disclaimer"
                checked={disclaimerAccepted}
                onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
              />
              <Label htmlFor="dialog-disclaimer" className="text-sm">
                Acepto el disclaimer legal y confirmo que he revisado el contenido del contrato
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisclaimerDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (disclaimerAccepted) {
                  setShowDisclaimerDialog(false);
                  handleSendContract();
                }
              }}
              disabled={!disclaimerAccepted}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractEditor;
