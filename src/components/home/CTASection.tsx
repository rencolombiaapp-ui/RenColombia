import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useActivePlan } from "@/hooks/use-has-active-plan";

// MVP: Simplificado a solo un CTA final para planes
// Regla de visibilidad: Solo mostrar si el usuario NO es PRO
// Un usuario PRO no necesita ver upsell de planes
const CTASection = () => {
  const { user } = useAuth();
  const { data: activePlan } = useActivePlan();

  // Determinar si el usuario es PRO
  const isPro = activePlan?.plan_id?.includes("_pro") || false;

  // Ocultar completamente la sección si el usuario es PRO
  // Mostrar solo cuando: usuario NO autenticado O usuario autenticado pero NO es PRO
  const showPricingCTA = !user || !isPro;

  if (!showPricingCTA) {
    return null; // Usuario PRO: no mostrar CTA de planes
  }

  return (
    <section className="py-16 md:py-24 bg-primary relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      {/* Final CTA Banner */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Empieza hoy
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Descubre nuestros planes y comienza a arrendar de forma digital.
          </p>
          <Link to="/planes">
            <Button variant="hero" size="lg" className="gap-2 group">
              Ver planes y precios
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
