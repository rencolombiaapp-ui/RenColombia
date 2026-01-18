import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { useCreateContractRequest } from "@/hooks/use-contracts";
import { hasActiveKYCVerification } from "@/services/kycService";
import { useActivePlan } from "@/hooks/use-has-active-plan";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Crown, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContractRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
}

const ContractRequestModal = ({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
}: ContractRequestModalProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: activePlan } = useActivePlan();
  const createRequest = useCreateContractRequest();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verificar si tiene plan PRO
  const isPro = activePlan?.plan_id?.includes("_pro") || activePlan?.plan_id === "tenant_pro";

  // Verificar KYC
  const { data: hasKYC = false, isLoading: isLoadingKYC } = useQuery({
    queryKey: ["kyc-verification", user?.id],
    queryFn: async () => {
      if (!user) return false;
      return await hasActiveKYCVerification(user.id, "person");
    },
    enabled: !!user && open,
  });

  const handleRequest = async () => {
    if (!user || !isPro) {
      toast({
        variant: "destructive",
        title: "Plan PRO requerido",
        description: "Necesitas un plan PRO para solicitar contratos de arrendamiento.",
      });
      navigate("/planes");
      return;
    }

    if (!hasKYC) {
      toast({
        variant: "destructive",
        title: "Verificación KYC requerida",
        description: "Debes completar tu verificación KYC antes de solicitar contratos.",
      });
      // TODO: Navegar a página de KYC cuando esté implementada
      return;
    }

    try {
      await createRequest.mutateAsync({
        propertyId,
        tenantId: user.id,
      });
      onOpenChange(false);
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Solicitar Contratación Digital
          </DialogTitle>
          <DialogDescription>
            Solicita un contrato de arrendamiento digital para esta propiedad
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información de la propiedad */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-semibold mb-1">{propertyTitle}</p>
            <p className="text-sm text-muted-foreground">ID: {propertyId}</p>
          </div>

          {/* Estado del Plan */}
          {isPro ? (
            <Alert>
              <Crown className="h-4 w-4" />
              <AlertDescription>
                Tienes un plan PRO activo. Puedes solicitar contratos de arrendamiento.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Necesitas un plan PRO para solicitar contratos.{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto ml-1"
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/planes");
                  }}
                >
                  Ver planes
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Estado de KYC */}
          {isLoadingKYC ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando estado de verificación KYC...
            </div>
          ) : hasKYC ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Tu verificación KYC está activa. Puedes continuar con la solicitud.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Debes completar tu verificación KYC antes de solicitar contratos.
                {/* TODO: Agregar link a página de KYC */}
              </AlertDescription>
            </Alert>
          )}

          {/* Información adicional */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Al solicitar un contrato de arrendamiento:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>El propietario recibirá una notificación</li>
              <li>Se iniciará el proceso de contratación digital</li>
              <li>Deberás completar la verificación KYC si aún no lo has hecho</li>
              <li>El inmueble quedará bloqueado para otros inquilinos una vez iniciado el contrato</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleRequest}
            disabled={!isPro || !hasKYC || createRequest.isPending}
          >
            {createRequest.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Solicitar Contrato"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractRequestModal;
