import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { createSupportReport, type SupportReportType } from "@/services/supportService";

const ReportProblem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [type, setType] = useState<SupportReportType | "">("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const reportTypes: { value: SupportReportType; label: string }[] = [
    { value: "error_platform", label: "Error en la plataforma" },
    { value: "problem_publication", label: "Problema con una publicación" },
    { value: "problem_payment", label: "Problema con pagos" },
    { value: "suggestion", label: "Sugerencia / mejora" },
    { value: "other", label: "Otro" },
  ];

  const sections = [
    "Búsqueda de inmuebles",
    "Publicar inmueble",
    "Mis inmuebles",
    "Mensajes",
    "Favoritos",
    "Perfil / Configuración",
    "Pagos / Suscripciones",
    "Otro",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!type) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Por favor selecciona el tipo de reporte.",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Por favor describe el problema o sugerencia.",
      });
      return;
    }

    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Por favor ingresa tu correo electrónico.",
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        variant: "destructive",
        title: "Correo inválido",
        description: "Por favor ingresa un correo electrónico válido.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createSupportReport({
        userId: user?.id || null,
        email: email.trim(),
        type: type as SupportReportType,
        section: section || null,
        description: description.trim(),
      });

      setIsSuccess(true);
      toast({
        title: "¡Reporte enviado!",
        description: "Hemos recibido tu reporte. Te contactaremos si necesitamos más información.",
      });

      // Limpiar formulario después de 3 segundos
      setTimeout(() => {
        setType("");
        setSection("");
        setDescription("");
        setIsSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast({
        variant: "destructive",
        title: "Error al enviar reporte",
        description: error.message || "Ocurrió un error al enviar tu reporte. Por favor intenta de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto">
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                  ¡Reporte enviado!
                </h1>
                <p className="text-muted-foreground mb-6">
                  Hemos recibido tu reporte correctamente. Te contactaremos si necesitamos más información.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link to="/ayuda">
                    <Button variant="outline">Volver al Centro de Ayuda</Button>
                  </Link>
                  <Button onClick={() => setIsSuccess(false)}>
                    Enviar otro reporte
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            to="/ayuda"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Centro de Ayuda</span>
          </Link>

          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground">
                    Reportar un problema
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Ayúdanos a mejorar RenColombia reportando problemas o compartiendo sugerencias
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 md:p-8 space-y-6">
              {/* Tipo de reporte */}
              <div className="space-y-2">
                <Label htmlFor="type">
                  Tipo de reporte <span className="text-destructive">*</span>
                </Label>
                <Select value={type} onValueChange={(value) => setType(value as SupportReportType)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecciona el tipo de reporte" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((reportType) => (
                      <SelectItem key={reportType.value} value={reportType.value}>
                        {reportType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sección afectada */}
              <div className="space-y-2">
                <Label htmlFor="section">Sección afectada (opcional)</Label>
                <Select value={section || undefined} onValueChange={(value) => setSection(value === "none" ? "" : value)}>
                  <SelectTrigger id="section">
                    <SelectValue placeholder="Selecciona la sección afectada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No especificar</SelectItem>
                    {sections.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Descripción del problema <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe detalladamente el problema, error o sugerencia..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[150px] resize-none"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Mientras más detalles proporciones, más fácil será para nosotros ayudarte.
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Correo de contacto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!user} // Deshabilitar si el usuario está autenticado
                  required
                />
                {user && (
                  <p className="text-xs text-muted-foreground">
                    Usando el correo de tu cuenta: {user.email}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Link to="/ayuda" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar reporte"
                  )}
                </Button>
              </div>
            </form>

            {/* Info adicional */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground text-center">
                <strong>Nota:</strong> Revisamos todos los reportes y trabajamos para resolverlos lo antes posible.
                Te contactaremos por correo si necesitamos más información.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReportProblem;
