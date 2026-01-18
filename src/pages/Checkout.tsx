import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { createSubscriptionCheckout } from "@/services/subscriptionService";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CreditCard, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const planId = searchParams.get("plan_id");

  useEffect(() => {
    if (!user) {
      navigate("/auth?mode=register");
      return;
    }

    if (!planId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se especificó un plan",
      });
      navigate("/planes");
      return;
    }

    // Iniciar checkout automáticamente
    handleCheckout();
  }, [user, planId]);

  const handleCheckout = async () => {
    if (!user || !planId || !profile) return;

    setIsLoading(true);

    try {
      const { checkoutUrl } = await createSubscriptionCheckout(
        user.id,
        planId,
        user.email || profile.email,
        profile.full_name || "Usuario"
      );

      // Redirigir a Wompi
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al procesar el pago. Intenta de nuevo.",
      });
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            {/* Back Button */}
            <Link
              to="/planes"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a planes</span>
            </Link>

            {/* Loading State */}
            <div className="bg-card rounded-2xl border border-border p-8 md:p-12 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-primary animate-pulse" />
                </div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                    Procesando tu pago
                  </h1>
                  <p className="text-muted-foreground">
                    Estamos preparando tu checkout seguro con Wompi
                  </p>
                </div>

                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Redirigiendo a Wompi...</span>
                  </div>
                )}

                <div className="mt-4 pt-6 border-t border-border w-full">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>Pago 100% seguro procesado por Wompi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
