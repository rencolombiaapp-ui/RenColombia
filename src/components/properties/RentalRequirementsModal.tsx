import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileText, DollarSign, Calendar, Building2, X } from "lucide-react";
import {
  getRentalRequirements,
  upsertRentalRequirements,
  deleteRentalRequirements,
  AVAILABLE_DOCUMENTS,
  type RentalRequirements,
} from "@/services/rentalRequirementsService";
import { useToast } from "@/hooks/use-toast";

interface RentalRequirementsModalProps {
  propertyId: string;
  propertyTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RentalRequirementsModal({
  propertyId,
  propertyTitle,
  open,
  onOpenChange,
  onSuccess,
}: RentalRequirementsModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasRequirements, setHasRequirements] = useState(false);

  // Estados del formulario
  const [documentsRequired, setDocumentsRequired] = useState<string[]>([]);
  const [otherDocument, setOtherDocument] = useState("");
  const [depositRequired, setDepositRequired] = useState(false);
  const [depositValue, setDepositValue] = useState("");
  const [advancePayment, setAdvancePayment] = useState(false);
  const [adminIncluded, setAdminIncluded] = useState(false);
  const [notes, setNotes] = useState("");

  // Cargar requisitos existentes
  useEffect(() => {
    if (open && propertyId) {
      loadRequirements();
    }
  }, [open, propertyId]);

  const loadRequirements = async () => {
    setIsLoading(true);
    try {
      const requirements = await getRentalRequirements(propertyId);
      if (requirements) {
        setHasRequirements(true);
        setDocumentsRequired(requirements.documents_required || []);
        setDepositRequired(requirements.deposit_required || false);
        setDepositValue(requirements.deposit_value || "");
        setAdvancePayment(requirements.advance_payment || false);
        setAdminIncluded(requirements.admin_included || false);
        setNotes(requirements.notes || "");
        
        // Separar "Otro" si existe
        const otherDocs = requirements.documents_required.filter(
          (doc) => !AVAILABLE_DOCUMENTS.includes(doc as any)
        );
        if (otherDocs.length > 0) {
          setOtherDocument(otherDocs[0]);
        }
      } else {
        setHasRequirements(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error loading requirements:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los requisitos.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDocumentsRequired([]);
    setOtherDocument("");
    setDepositRequired(false);
    setDepositValue("");
    setAdvancePayment(false);
    setAdminIncluded(false);
    setNotes("");
  };

  const handleDocumentToggle = (document: string) => {
    setDocumentsRequired((prev) =>
      prev.includes(document)
        ? prev.filter((d) => d !== document)
        : [...prev, document]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const allDocuments = [...documentsRequired];
      if (otherDocument.trim()) {
        allDocuments.push(otherDocument.trim());
      }

      const result = await upsertRentalRequirements({
        property_id: propertyId,
        documents_required: allDocuments,
        deposit_required: depositRequired,
        deposit_value: depositValue.trim() || null,
        advance_payment: advancePayment,
        admin_included: adminIncluded,
        notes: notes.trim() || null,
      });

      if (result) {
        setHasRequirements(true);
        toast({
          title: "¡Requisitos guardados!",
          description: "Los requisitos se han guardado correctamente.",
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error("No se pudieron guardar los requisitos");
      }
    } catch (error: any) {
      console.error("Error saving requirements:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron guardar los requisitos.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar los requisitos de este inmueble?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteRentalRequirements(propertyId);
      if (success) {
        setHasRequirements(false);
        resetForm();
        toast({
          title: "Requisitos eliminados",
          description: "Los requisitos se han eliminado correctamente.",
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error("No se pudieron eliminar los requisitos");
      }
    } catch (error: any) {
      console.error("Error deleting requirements:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron eliminar los requisitos.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Requisitos para arrendar</DialogTitle>
          <DialogDescription>
            Define los requisitos necesarios para arrendar: {propertyTitle}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Documentos requeridos */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documentos requeridos
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_DOCUMENTS.map((doc) => (
                  <div key={doc} className="flex items-center space-x-2">
                    <Checkbox
                      id={`doc-${doc}`}
                      checked={documentsRequired.includes(doc)}
                      onCheckedChange={() => handleDocumentToggle(doc)}
                    />
                    <Label
                      htmlFor={`doc-${doc}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {doc}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Label htmlFor="other-doc" className="text-sm">
                  Otro documento (especificar)
                </Label>
                <Input
                  id="other-doc"
                  placeholder="Ej: Certificado de ingresos adicionales"
                  value={otherDocument}
                  onChange={(e) => setOtherDocument(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Condiciones económicas */}
            <div className="space-y-4 border-t border-border pt-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Condiciones económicas
              </Label>

              {/* Depósito */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deposit-required"
                    checked={depositRequired}
                    onCheckedChange={(checked) => setDepositRequired(checked === true)}
                  />
                  <Label htmlFor="deposit-required" className="cursor-pointer">
                    Se requiere depósito
                  </Label>
                </div>
                {depositRequired && (
                  <div className="ml-6">
                    <Label htmlFor="deposit-value" className="text-sm">
                      Valor del depósito
                    </Label>
                    <Input
                      id="deposit-value"
                      placeholder="Ej: $3.000.000 o 1 mes de arriendo"
                      value={depositValue}
                      onChange={(e) => setDepositValue(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Mes adelantado */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="advance-payment"
                  checked={advancePayment}
                  onCheckedChange={(checked) => setAdvancePayment(checked === true)}
                />
                <Label htmlFor="advance-payment" className="cursor-pointer">
                  Se requiere mes adelantado
                </Label>
              </div>

              {/* Administración incluida */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="admin-included"
                  checked={adminIncluded}
                  onCheckedChange={(checked) => setAdminIncluded(checked === true)}
                />
                <Label htmlFor="admin-included" className="cursor-pointer">
                  Administración incluida
                </Label>
              </div>
            </div>

            {/* Notas adicionales */}
            <div className="space-y-2 border-t border-border pt-4">
              <Label htmlFor="notes">Notas adicionales (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Información adicional sobre los requisitos..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasRequirements && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Eliminar requisitos
                </>
              )}
            </Button>
          )}
          <div className="flex gap-2 flex-1 sm:flex-initial">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isDeleting}
              className="flex-1 sm:flex-initial"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="flex-1 sm:flex-initial"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Guardar requisitos
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
