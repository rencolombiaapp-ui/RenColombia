import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { 
  startPersonVerification, 
  completeVerification,
  type DocumentType,
  type KYCVerification 
} from "@/services/kycService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  FileText, 
  Camera,
  X,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface KYCVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

type StepStatus = "pending" | "completed" | "error";

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: StepStatus;
  file?: File;
  preview?: string;
}

const KYCVerificationModal = ({
  open,
  onOpenChange,
  onComplete,
}: KYCVerificationModalProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [documentType, setDocumentType] = useState<DocumentType>("cc");
  const [documentNumber, setDocumentNumber] = useState("");
  const [steps, setSteps] = useState<Step[]>([
    {
      id: "document-front",
      label: "Documento de Identidad (Frente)",
      description: "Sube una foto del frente de tu documento",
      icon: <FileText className="w-5 h-5" />,
      status: "pending",
    },
    {
      id: "document-back",
      label: "Documento de Identidad (Reverso)",
      description: "Sube una foto del reverso de tu documento",
      icon: <FileText className="w-5 h-5" />,
      status: "pending",
    },
    {
      id: "selfie",
      label: "Selfie con Documento",
      description: "Toma una foto sosteniendo tu documento",
      icon: <Camera className="w-5 h-5" />,
      status: "pending",
    },
  ]);

  const fileInputRefs = {
    "document-front": useRef<HTMLInputElement>(null),
    "document-back": useRef<HTMLInputElement>(null),
    "selfie": useRef<HTMLInputElement>(null),
  };

  // Verificar si ya tiene una verificación activa
  const { data: existingVerification, isLoading: isLoadingVerification } = useQuery({
    queryKey: ["kyc-verification-status", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Buscar verificación pendiente o verificada directamente desde Supabase
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: verifications, error } = await supabase
        .from("kyc_verifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("verification_type", "person")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching KYC verification:", error);
        return null;
      }

      return verifications?.[0] || null;
    },
    enabled: !!user && open,
  });

  // Mutación para iniciar verificación
  const startVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuario no autenticado");

      // Validar que todos los pasos estén completos
      const allStepsCompleted = steps.every(step => step.status === "completed" && step.file);
      if (!allStepsCompleted) {
        throw new Error("Debes completar todos los pasos antes de continuar");
      }

      // Validar número de documento
      if (!documentNumber.trim()) {
        throw new Error("Debes ingresar tu número de documento");
      }

      // Crear URLs fake para los archivos (simulación)
      const documentFrontUrl = `fake://document-front-${Date.now()}.jpg`;
      const documentBackUrl = `fake://document-back-${Date.now()}.jpg`;
      const selfieUrl = `fake://selfie-${Date.now()}.jpg`;

      return await startPersonVerification({
        userId: user.id,
        documentType,
        documentNumber: documentNumber.trim(),
        documentFrontUrl,
        documentBackUrl,
        selfieUrl,
      });
    },
    onSuccess: (verification) => {
      toast({
        title: "Verificación iniciada",
        description: "Tu verificación ha sido iniciada correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["kyc-verification", user?.id] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Mutación para completar verificación
  const completeVerificationMutation = useMutation({
    mutationFn: async (verificationId: string) => {
      return await completeVerification(verificationId);
    },
    onSuccess: () => {
      toast({
        title: "¡Verificación completada!",
        description: "Tu verificación KYC ha sido aprobada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["kyc-verification", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["kyc-verification-status", user?.id] });
      onComplete?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleFileSelect = (stepId: string, file: File | null) => {
    if (!file) return;

    // Validar tipo de archivo (simulación - acepta cualquier imagen)
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Archivo inválido",
        description: "Solo se permiten archivos de imagen.",
      });
      return;
    }

    // Validar tamaño (simulación - máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Archivo muy grande",
        description: "El archivo no debe superar los 5MB.",
      });
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setSteps((prevSteps) =>
        prevSteps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                status: "completed" as StepStatus,
                file,
                preview: reader.result as string,
              }
            : step
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (stepId: string) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status: "pending" as StepStatus,
              file: undefined,
              preview: undefined,
            }
          : step
      )
    );
    
    // Limpiar input
    const inputRef = fileInputRefs[stepId as keyof typeof fileInputRefs];
    if (inputRef?.current) {
      inputRef.current.value = "";
    }
  };

  const handleStartVerification = async () => {
    try {
      const verification = await startVerificationMutation.mutateAsync();
      
      // Completar verificación inmediatamente (simulación)
      setTimeout(() => {
        completeVerificationMutation.mutate(verification.id);
      }, 1000);
    } catch (error) {
      // Error ya manejado en el mutation
    }
  };

  const canSubmit = 
    steps.every(step => step.status === "completed" && step.file) &&
    documentNumber.trim() !== "" &&
    !startVerificationMutation.isPending &&
    !completeVerificationMutation.isPending;

  const isVerified = existingVerification?.status === "verified";
  const isPending = existingVerification?.status === "pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Verificación de Identidad (KYC)
          </DialogTitle>
          <DialogDescription>
            Completa tu verificación de identidad para acceder a contratos de arrendamiento digital
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Estado de verificación existente */}
          {isLoadingVerification ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando estado...
            </div>
          ) : isVerified ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Tu verificación KYC está activa y verificada.</span>
                  <Badge variant="default" className="ml-2">
                    Verificado
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ) : isPending ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tienes una verificación pendiente. Puedes completarla ahora.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Tipo de documento */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Documento</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              disabled={isVerified || isPending}
            >
              <option value="cc">Cédula de Ciudadanía</option>
              <option value="ce">Cédula de Extranjería</option>
              <option value="passport">Pasaporte</option>
              <option value="nit">NIT</option>
            </select>
          </div>

          {/* Número de documento */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Número de Documento</label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="Ingresa tu número de documento"
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              disabled={isVerified || isPending}
            />
          </div>

          {/* Checklist de pasos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Pasos de Verificación</h3>
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "border rounded-lg p-4 transition-colors",
                  step.status === "completed"
                    ? "border-green-500/20 bg-green-500/5"
                    : "border-border bg-card"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox visual */}
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      step.status === "completed"
                        ? "bg-green-500 text-white"
                        : "border-2 border-muted-foreground/30"
                    )}
                  >
                    {step.status === "completed" && (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-grow space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {step.icon}
                        <span className="font-medium text-sm">{step.label}</span>
                      </div>
                      {step.status === "completed" && (
                        <Badge variant="default" className="text-xs">
                          Completado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>

                    {/* Preview de imagen */}
                    {step.preview && (
                      <div className="relative mt-2">
                        <img
                          src={step.preview}
                          alt={step.label}
                          className="w-full max-w-xs h-32 object-cover rounded-md border border-border"
                        />
                        <button
                          onClick={() => handleRemoveFile(step.id)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                          disabled={isVerified || isPending}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Botón de upload */}
                    {!step.preview && (
                      <div>
                        <input
                          ref={fileInputRefs[step.id as keyof typeof fileInputRefs]}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleFileSelect(step.id, file);
                          }}
                          className="hidden"
                          disabled={isVerified || isPending}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const inputRef = fileInputRefs[step.id as keyof typeof fileInputRefs];
                            inputRef?.current?.click();
                          }}
                          disabled={isVerified || isPending}
                          className="w-full sm:w-auto"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {step.id === "selfie" ? "Tomar Foto" : "Subir Archivo"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Información adicional */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Nota:</strong> Esta es una verificación simulada para el MVP. 
              Los archivos no se validan realmente. Una vez completados todos los pasos, 
              tu verificación será aprobada automáticamente.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isVerified ? "Cerrar" : "Cancelar"}
          </Button>
          {!isVerified && (
            <Button
              onClick={handleStartVerification}
              disabled={!canSubmit || startVerificationMutation.isPending || completeVerificationMutation.isPending}
            >
              {startVerificationMutation.isPending || completeVerificationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completar Verificación
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KYCVerificationModal;
