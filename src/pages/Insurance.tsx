import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Shield,
  Upload,
  FileText,
  Calendar,
  CheckCircle,
  X,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  createInsuranceApproval,
  getUserInsuranceApprovals,
  deleteInsuranceApproval,
  uploadInsuranceDocument,
  AVAILABLE_INSURERS,
  type InsuranceApproval,
} from "@/services/insuranceService";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const Insurance = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [approvals, setApprovals] = useState<InsuranceApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [insurerName, setInsurerName] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string>("");
  const [validUntil, setValidUntil] = useState("");

  useEffect(() => {
    if (user) {
      loadApprovals();
    }
  }, [user]);

  const loadApprovals = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getUserInsuranceApprovals(user.id);
      setApprovals(data);
    } catch (error) {
      console.error("Error loading approvals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Tipo de archivo no válido",
        description: "Solo se permiten archivos PDF, JPG o PNG.",
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Archivo muy grande",
        description: "El archivo no debe superar los 5MB.",
      });
      return;
    }

    setDocumentFile(file);
    setDocumentPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para continuar.",
      });
      return;
    }

    if (!insurerName || !documentFile || !validUntil) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor completa todos los campos.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Subir documento
      const documentUrl = await uploadInsuranceDocument(user.id, documentFile);

      // Crear aprobación
      await createInsuranceApproval({
        userId: user.id,
        insurerName,
        documentUrl,
        validUntil,
      });

      toast({
        title: "¡Aprobación registrada!",
        description: "Tu aprobación de seguro ha sido registrada correctamente.",
      });

      // Limpiar formulario
      setInsurerName("");
      setDocumentFile(null);
      setDocumentPreview("");
      setValidUntil("");
      setShowForm(false);

      // Recargar aprobaciones
      await loadApprovals();
    } catch (error: any) {
      console.error("Error submitting approval:", error);
      toast({
        variant: "destructive",
        title: "Error al registrar aprobación",
        description: error.message || "Ocurrió un error. Por favor intenta de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (approvalId: string) => {
    if (!user) return;

    if (!confirm("¿Estás seguro de que deseas eliminar esta aprobación?")) {
      return;
    }

    try {
      await deleteInsuranceApproval(approvalId, user.id);
      toast({
        title: "Aprobación eliminada",
        description: "La aprobación ha sido eliminada correctamente.",
      });
      await loadApprovals();
    } catch (error: any) {
      console.error("Error deleting approval:", error);
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la aprobación.",
      });
    }
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            to="/perfil"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a mi perfil</span>
          </Link>

          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground">
                    Seguros de Arrendamiento
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Gestiona tus aprobaciones de seguros de arrendamiento
                  </p>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="bg-muted/50 rounded-xl border border-border p-6 mb-8">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    ¿Qué es un seguro de arrendamiento?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Un seguro de arrendamiento es una póliza que protege al propietario contra
                    posibles daños o impagos durante el período de arrendamiento. Muchos propietarios
                    requieren que los inquilinos tengan esta aprobación antes de firmar el contrato.
                  </p>
                  <h4 className="font-semibold text-foreground mb-2 text-sm">
                    Aseguradoras disponibles en Colombia:
                  </h4>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    {AVAILABLE_INSURERS.slice(0, -1).map((insurer) => (
                      <li key={insurer}>{insurer}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Add Approval Button */}
            {!showForm && (
              <div className="mb-6">
                <Button onClick={() => setShowForm(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Agregar aprobación de seguro
                </Button>
              </div>
            )}

            {/* Form */}
            {showForm && (
              <div className="bg-card rounded-xl border border-border p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    Nueva aprobación de seguro
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowForm(false);
                      setInsurerName("");
                      setDocumentFile(null);
                      setDocumentPreview("");
                      setValidUntil("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Aseguradora */}
                  <div className="space-y-2">
                    <Label htmlFor="insurer">
                      Aseguradora <span className="text-destructive">*</span>
                    </Label>
                    <Select value={insurerName} onValueChange={setInsurerName}>
                      <SelectTrigger id="insurer">
                        <SelectValue placeholder="Selecciona la aseguradora" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_INSURERS.map((insurer) => (
                          <SelectItem key={insurer} value={insurer}>
                            {insurer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Documento */}
                  <div className="space-y-2">
                    <Label htmlFor="document">
                      Documento de aprobación <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="document"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                        className="flex-1"
                      />
                    </div>
                    {documentPreview && (
                      <div className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-sm text-foreground flex-1">
                          {documentFile?.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDocumentFile(null);
                            setDocumentPreview("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Formatos permitidos: PDF, JPG, PNG. Tamaño máximo: 5MB
                    </p>
                  </div>

                  {/* Fecha de vigencia */}
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">
                      Válido hasta <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Guardar aprobación
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Approvals List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Mis aprobaciones activas
              </h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : approvals.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-8 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No tienes aprobaciones registradas aún
                  </p>
                </div>
              ) : (
                approvals.map((approval) => (
                  <div
                    key={approval.id}
                    className="bg-card rounded-xl border border-border p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-foreground">
                            {approval.insurer_name}
                          </h3>
                          {isExpired(approval.valid_until) ? (
                            <span className="px-2 py-1 text-xs bg-destructive/10 text-destructive rounded">
                              Vencida
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                              Activa
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Válido hasta: {formatDate(approval.valid_until)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(approval.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Insurance;
