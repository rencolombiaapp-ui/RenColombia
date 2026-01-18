import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileText, DollarSign, Calendar, Building2, CheckCircle2, X } from "lucide-react";
import { getRentalRequirements, AVAILABLE_DOCUMENTS, type RentalRequirements } from "@/services/rentalRequirementsService";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

interface ViewRequirementsModalProps {
  propertyId: string;
  propertyTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewRequirementsModal({
  propertyId,
  propertyTitle,
  open,
  onOpenChange,
}: ViewRequirementsModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [requirements, setRequirements] = useState<RentalRequirements | null>(null);

  useEffect(() => {
    if (open && propertyId && user) {
      loadRequirements();
    }
  }, [open, propertyId, user]);

  const loadRequirements = async () => {
    setIsLoading(true);
    try {
      const data = await getRentalRequirements(propertyId);
      setRequirements(data);
    } catch (error) {
      console.error("Error loading requirements:", error);
      setRequirements(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    onOpenChange(false);
    navigate(`/auth?mode=register&redirect=${encodeURIComponent(window.location.pathname)}`);
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ver requisitos</DialogTitle>
            <DialogDescription>
              Necesitas estar registrado para ver los requisitos de este inmueble.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              Regístrate para ver los requisitos de este inmueble
            </p>
            <Button onClick={handleLoginClick} className="w-full">
              Registrarse o Iniciar sesión
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[1000]">
        <DialogHeader>
          <DialogTitle>Requisitos para arrendar</DialogTitle>
          <DialogDescription>
            Requisitos necesarios para arrendar: {propertyTitle}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !requirements ? (
          <div className="py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Este inmueble aún no tiene requisitos definidos
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Documentos requeridos */}
            {requirements.documents_required && requirements.documents_required.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documentos requeridos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {requirements.documents_required.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condiciones económicas */}
            {(requirements.deposit_required ||
              requirements.advance_payment ||
              requirements.admin_included) && (
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Condiciones económicas
                </h3>
                <div className="space-y-2">
                  {requirements.deposit_required && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium">Depósito requerido</span>
                        {requirements.deposit_value && (
                          <p className="text-sm text-muted-foreground">
                            {requirements.deposit_value}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {requirements.advance_payment && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Se requiere mes adelantado</span>
                    </div>
                  )}
                  {requirements.admin_included && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Administración incluida</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas adicionales */}
            {requirements.notes && (
              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="font-semibold text-foreground">Notas adicionales</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {requirements.notes}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
