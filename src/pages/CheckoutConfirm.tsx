import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { confirmSubscription } from "@/services/subscriptionService";
import { getWompiTransactionStatus } from "@/services/wompiService";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const CheckoutConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const subscriptionId = searchParams.get("subscription_id");
  const transactionId = searchParams.get("transaction_id");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!subscriptionId) {
      setStatus("error");
      setErrorMessage("No se encontró información de la suscripción");
      return;
    }

    handleConfirmation();
  }, [user, subscriptionId, transactionId]);

  const handleConfirmation = async () => {
    if (!subscriptionId) return;

    try {
      // Si tenemos transaction_id, verificar estado en Wompi
      if (transactionId) {
        const wompiStatus = await getWompiTransactionStatus(transactionId);
        
        if (wompiStatus.data.status !== "APPROVED") {
          setStatus("error");
          setErrorMessage(
            wompiStatus.data.status === "DECLINED"
              ? "El pago fue rechazado"
              : wompiStatus.data.status === "PENDING"
              ? "El pago está pendiente"
              : "El pago no pudo ser procesado"
          );
          return;
        }
      }

      // Confirmar suscripción
      await confirmSubscription(subscriptionId, transactionId || "");

      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["has-active-plan"] });
      queryClient.invalidateQueries({ queryKey: ["active-plan"] });
      queryClient.invalidateQueries({ queryKey: ["has-price-insights-access"] });

      setStatus("success");

      toast({
        title: "¡Pago exitoso!",
        description: "Tu suscripción ha sido activada correctamente",
      });
    } catch (error) {
      console.error("Error confirming subscription:", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error al confirmar la suscripción. Contacta soporte si el pago fue exitoso."
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl border border-border p-8 md:p-12">
              {status === "loading" && (
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                    Confirmando tu pago
                  </h1>
                  <p className="text-muted-foreground">
                    Por favor espera mientras verificamos tu transacción...
                  </p>
                </div>
              )}

              {status === "success" && (
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                    ¡Pago exitoso!
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    Tu suscripción ha sido activada correctamente. Ya puedes disfrutar de todas las
                    funcionalidades premium.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/perfil">
                      <Button size="lg" className="gap-2">
                        Ver mi perfil
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link to="/publicar">
                      <Button variant="outline" size="lg">
                        Publicar inmueble
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                    Error en el pago
                  </h1>
                  <p className="text-muted-foreground mb-8">{errorMessage}</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/planes">
                      <Button size="lg">Volver a planes</Button>
                    </Link>
                    <Link to="/ayuda">
                      <Button variant="outline" size="lg">
                        Contactar soporte
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutConfirm;
