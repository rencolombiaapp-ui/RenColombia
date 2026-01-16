import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Check,
  Star,
  Zap,
  Users,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const Plans = () => {
  const plans = [
    {
      name: "Básico",
      price: "Gratis",
      description: "Perfecto para empezar",
      features: [
        "Hasta 5 inmuebles",
        "Marca visible",
        "Búsqueda estándar",
        "Dashboard básico",
        "Soporte por email",
      ],
      popular: false,
    },
    {
      name: "Pro",
      price: "Próximamente",
      description: "Para inmobiliarias en crecimiento",
      features: [
        "Inmuebles ilimitados",
        "Visibilidad prioritaria",
        "Marca destacada",
        "Dashboard avanzado",
        "Analíticas detalladas",
        "Soporte prioritario",
        "Inmuebles destacados incluidos",
      ],
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio</span>
          </Link>

          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Para Inmobiliarias</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Planes para Inmobiliarias
            </h1>
            <p className="text-lg text-muted-foreground">
              Elige el plan que mejor se adapte a las necesidades de tu inmobiliaria.
              Los arrendadores individuales siempre son gratis.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative bg-card rounded-2xl border-2 p-8",
                  plan.popular
                    ? "border-primary shadow-lg"
                    : "border-border"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Más Popular
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                    Plan {plan.name}
                  </h3>
                  <p className="text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold text-primary">{plan.price}</span>
                    {plan.price !== "Gratis" && (
                      <span className="text-muted-foreground">/mes</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full"
                  size="lg"
                  disabled={plan.price === "Próximamente"}
                >
                  {plan.price === "Gratis" ? (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Ya lo tienes
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Próximamente
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="bg-muted/50 rounded-xl p-6 md:p-8 max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  ¿Eres arrendador individual?
                </h3>
                <p className="text-muted-foreground mb-4">
                  Los arrendadores individuales pueden publicar inmuebles de forma completamente gratuita,
                  sin límites ni restricciones. Estos planes son exclusivos para inmobiliarias.
                </p>
                <Link to="/publicar">
                  <Button variant="outline">
                    Publicar inmueble gratis
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mt-12">
            <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">
              Preguntas Frecuentes
            </h2>
            <div className="space-y-4">
              <div className="bg-card rounded-lg border border-border p-5">
                <h3 className="font-semibold text-foreground mb-2">
                  ¿Cuándo estarán disponibles los planes de pago?
                </h3>
                <p className="text-muted-foreground text-sm">
                  Estamos trabajando en la implementación de planes de pago. Mientras tanto,
                  puedes usar la plataforma de forma gratuita con el Plan Básico.
                </p>
              </div>
              <div className="bg-card rounded-lg border border-border p-5">
                <h3 className="font-semibold text-foreground mb-2">
                  ¿Qué pasa si tengo más de 5 inmuebles?
                </h3>
                <p className="text-muted-foreground text-sm">
                  Por ahora puedes publicar todos los inmuebles que necesites sin restricciones.
                  Cuando los planes estén disponibles, te notificaremos para que puedas elegir el que mejor se adapte a ti.
                </p>
              </div>
              <div className="bg-card rounded-lg border border-border p-5">
                <h3 className="font-semibold text-foreground mb-2">
                  ¿Puedo cambiar de plan más adelante?
                </h3>
                <p className="text-muted-foreground text-sm">
                  Sí, podrás cambiar de plan en cualquier momento desde tu dashboard.
                  Los cambios se aplicarán de forma inmediata.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Plans;
