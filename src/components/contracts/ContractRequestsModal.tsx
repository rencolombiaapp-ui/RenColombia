import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useActivePlan } from "@/hooks/use-has-active-plan";
import { getOwnerContractRequests, type ContractRequestWithDetails } from "@/services/contractRequestService";
import { supabase } from "@/integrations/supabase/client";
import ContractEditor from "./ContractEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  FileText, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Crown,
  Mail,
  Calendar,
  Building2,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ContractRequestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
  propertyAddress?: string | null;
  propertyPrice: number;
}

/**
 * Filtra solicitudes elegibles (verificadas y en estado válido)
 */
function filterEligibleRequests(requests: ContractRequestWithDetails[]): ContractRequestWithDetails[] {
  return requests.filter(
    (req) =>
      req.property_id &&
      req.status === "pending" &&
      req.tenant_kyc_status === "verified"
  );
}

const ContractRequestsModal = ({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
  propertyAddress,
  propertyPrice,
}: ContractRequestsModalProps) => {
  const { user } = useAuth();
  const { data: activePlan } = useActivePlan();
  const { toast } = useToast();

  const [selectedRequest, setSelectedRequest] = useState<ContractRequestWithDetails | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showDisclaimerDialog, setShowDisclaimerDialog] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Verificar si tiene plan PRO
  const isPro = activePlan?.plan_id?.includes("_pro") || 
                activePlan?.plan_id === "landlord_pro" ||
                activePlan?.plan_id === "inmobiliaria_pro";

  // Obtener solicitudes del propietario filtradas por propiedad
  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ["contract-requests", user?.id, propertyId],
    queryFn: async () => {
      if (!user) return [];
      const requests = await getOwnerContractRequests(user.id);
      // Filtrar solo las solicitudes de esta propiedad
      return requests.filter((req) => req.property_id === propertyId);
    },
    enabled: !!user && !!propertyId && open && isPro,
  });

  // Filtrar solo solicitudes elegibles (verificadas y pendientes)
  const eligibleRequests = filterEligibleRequests(allRequests);

  // Manejar clic en "Iniciar Contrato"
  const handleStartContract = (request: ContractRequestWithDetails) => {
    if (!isPro) {
      toast({
        variant: "destructive",
        title: "Plan PRO requerido",
        description: "Necesitas un plan PRO para iniciar contratos.",
      });
      return;
    }

    setSelectedRequest(request);
    setShowDisclaimerDialog(true);
  };

  // Confirmar inicio de contrato después de aceptar disclaimer
  const handleConfirmStartContract = () => {
    if (!disclaimerAccepted) {
      toast({
        variant: "destructive",
        title: "Disclaimer requerido",
        description: "Debes aceptar el disclaimer legal antes de continuar.",
      });
      return;
    }

    if (!selectedRequest) return;

    setShowDisclaimerDialog(false);
    setShowEditor(true);
    setDisclaimerAccepted(false);
  };

  // Cerrar editor y volver a la lista
  const handleEditorClose = () => {
    setShowEditor(false);
    setSelectedRequest(null);
  };

  // Formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Si el editor está abierto, mostrar el editor
  if (showEditor && selectedRequest) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle>Editor de Contrato</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                handleEditorClose();
                onOpenChange(false);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ContractEditor
            propertyId={propertyId}
            tenantId={selectedRequest.tenant_id}
            contractRequestId={selectedRequest.id}
            propertyTitle={propertyTitle}
            propertyAddress={propertyAddress || null}
            propertyPrice={propertyPrice}
            tenantName={selectedRequest.tenant_name}
            tenantEmail={selectedRequest.tenant_email}
            onSuccess={(contractId) => {
              handleEditorClose();
              onOpenChange(false);
              toast({
                title: "Contrato iniciado",
                description: "El contrato ha sido creado y enviado al inquilino.",
              });
            }}
            onCancel={handleEditorClose}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open && !showEditor} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Solicitudes de Contrato
            </DialogTitle>
            <DialogDescription>
              Solicitudes de contratación para: {propertyTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Verificación de Plan PRO */}
            {!isPro ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Necesitas un plan PRO para ver y gestionar solicitudes de contrato.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Estado de carga */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Cargando solicitudes...
                    </span>
                  </div>
                ) : eligibleRequests.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay solicitudes de contrato elegibles para este inmueble.
                      <br />
                      <span className="text-xs text-muted-foreground mt-1 block">
                        Solo se muestran solicitudes de inquilinos con verificación KYC activa y en estado pendiente.
                      </span>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Información del inmueble */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {propertyTitle}
                        </CardTitle>
                        {propertyAddress && (
                          <CardDescription className="text-xs">
                            {propertyAddress}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>

                    {/* Lista de solicitudes */}
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">
                        {eligibleRequests.length} solicitud{eligibleRequests.length !== 1 ? "es" : ""} elegible{eligibleRequests.length !== 1 ? "s" : ""}
                      </div>
                      {eligibleRequests.map((request) => (
                        <Card key={request.id} className="hover:bg-muted/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                {/* Información del inquilino */}
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-sm">
                                        {request.tenant_name || "Sin nombre"}
                                      </p>
                                      <Badge variant="secondary" className="text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        KYC Verificado
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Mail className="w-3 h-3" />
                                      <span className="truncate">{request.tenant_email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>Solicitado: {formatDate(request.requested_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Botón de acción */}
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleStartContract(request)}
                                  className="whitespace-nowrap"
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  Iniciar Contrato
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación con disclaimer */}
      <Dialog open={showDisclaimerDialog} onOpenChange={setShowDisclaimerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Inicio de Contrato</DialogTitle>
            <DialogDescription>
              Estás a punto de iniciar un contrato de arrendamiento con el inquilino seleccionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Información del inquilino */}
            {selectedRequest && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Inquilino</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-sm font-medium">
                    {selectedRequest.tenant_name || "Sin nombre"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedRequest.tenant_email}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer Legal */}
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm">
                <strong>⚠️ Disclaimer Legal:</strong> Este contrato es una plantilla generada automáticamente por RenColombia y no sustituye asesoría legal profesional. Recomendamos consultar con un abogado antes de iniciar el contrato.
              </AlertDescription>
            </Alert>

            {/* Información importante */}
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Al iniciar el contrato:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>El inmueble será bloqueado para otros inquilinos</li>
                <li>Se generará automáticamente un contrato en estado borrador</li>
                <li>Podrás editar el contrato antes de enviarlo al inquilino</li>
                <li>El inquilino recibirá una notificación cuando envíes el contrato</li>
              </ul>
            </div>

            {/* Checkbox de aceptación */}
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="disclaimer-checkbox"
                checked={disclaimerAccepted}
                onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
              />
              <Label
                htmlFor="disclaimer-checkbox"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                He leído y entendido el disclaimer legal. Confirmo que entiendo que este es un template base que requiere revisión legal profesional.
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDisclaimerDialog(false);
                setDisclaimerAccepted(false);
                setSelectedRequest(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmStartContract}
              disabled={!disclaimerAccepted}
            >
              Continuar al Editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContractRequestsModal;
