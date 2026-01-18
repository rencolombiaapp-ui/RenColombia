import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Loader2,
  Lock,
  BarChart3,
  Store,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { useActivePlan } from "@/hooks/use-has-active-plan";
import { getPlansForUserType, Plan } from "@/services/subscriptionService";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const Plans = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: activePlan } = useActivePlan();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Determinar tipo de usuario (con fallback seguro)
  const userType: "tenant" | "landlord" | "inmobiliaria" = 
    profile?.publisher_type === "inmobiliaria" 
      ? "inmobiliaria" 
      : profile?.role === "landlord" 
      ? "landlord" 
      : "tenant";

  // Obtener planes según el tipo de usuario
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans", userType],
    queryFn: () => getPlansForUserType(userType),
    enabled: true, // Siempre habilitado, incluso sin usuario
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const handleSelectPlan = (planId: string) => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para contratar un plan",
      });
      navigate("/auth?mode=register");
      return;
    }

    // Si el plan es gratis, no necesita checkout
    const plan = plans.find((p) => p.id === planId);
    if (plan && plan.price_monthly === 0) {
      toast({
        title: "Plan gratuito",
        description: "Ya tienes acceso al plan gratuito",
      });
      return;
    }

    // Verificar si es un plan PRO (temporalmente deshabilitado)
    if (planId === "tenant_pro" || planId === "landlord_pro" || planId === "inmobiliaria_pro") {
      toast({
        variant: "default",
        title: "Plan PRO próximamente",
        description: "La compra del plan PRO todavía no está disponible. Estará disponible muy pronto. ¡Mantente atento!",
      });
      return;
    }

    // Redirigir a checkout (solo para planes que no sean PRO)
    navigate(`/checkout?plan_id=${planId}`);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Gratis";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPlanFeatures = (plan: Plan): string[] => {
    if (plan.features && Array.isArray(plan.features) && plan.features.length > 0) {
      return plan.features;
    }

    // Features por defecto según el plan
    if (plan.id === "tenant_free") {
      return [
        "Buscar inmuebles sin límite",
        "Filtrar por ciudad, barrio, precio, tipo",
        "Ver detalles completos del inmueble",
        "Guardar inmuebles en favoritos",
        "Enviar mensajes de interés",
        "Contactar propietarios o inmobiliarias",
        "Usar el chatbot LIA (modo básico)",
        "Crear perfil de usuario",
      ];
    }

    if (plan.id === "tenant_pro") {
      return [
        "Solicitar contratos digitales de arrendamiento",
        "Verificación de identidad (KYC)",
        "Comunicación directa dentro del contrato",
        "Mayor seguridad y menos fricción",
        "Acceso a análisis de precios por zona",
      ];
    }

    if (plan.id === "landlord_free") {
      return [
        "Publicar 1 inmueble",
        "Visibilidad estándar en búsquedas",
        "Recibir mensajes de interesados",
        "Gestión básica del inmueble",
        "Acceso al dashboard básico",
      ];
    }

    if (plan.id === "landlord_pro") {
      return [
        // Publicación y visibilidad
        "Publicar hasta 5 inmuebles activos",
        "Destacar hasta 5 inmuebles para mayor visibilidad",
        "Prioridad en los resultados de búsqueda",
        // Inteligencia de precios
        "Análisis de precio por zona (ciudad y barrio)",
        "Precio recomendado al momento de publicar",
        "Comparación del inmueble con el mercado local",
        "Acceso completo al módulo de inteligencia de precios",
        // Métricas y control
        "Métricas básicas: visitas y favoritos por inmueble",
        // Contratación digital
        "Recepción de solicitudes de contrato verificadas",
        "Generación de contratos digitales de arrendamiento",
        "Bloqueo automático del inmueble durante contratación",
        "Mensajería segura y trazable con el inquilino",
      ];
    }

    if (plan.id === "inmobiliaria_free") {
      return [
        "Publicar hasta 3 inmuebles",
        "Perfil básico de inmobiliaria",
        "Gestión básica de inmuebles",
        "Recibir mensajes de interesados",
        "Dashboard básico (lista, estado)",
        "Visibilidad estándar en búsquedas",
      ];
    }

    if (plan.id === "inmobiliaria_pro") {
      return [
        // Gestión y escala
        "Publicación de inmuebles ilimitados",
        "Gestión centralizada de propiedades",
        "Control de estados y contratos desde un solo dashboard",
        // Visibilidad y marca
        "Destaca hasta 100 inmuebles al mes",
        "Marca destacada frente a usuarios finales",
        "Visibilidad prioritaria en resultados de búsqueda",
        // Inteligencia y analítica avanzada
        "Análisis de precios premium por zona",
        "Analíticas detalladas de desempeño",
        "Dashboard avanzado con métricas clave",
        "Acceso a históricos de precios y actividad",
        "Exportación de reportes para uso interno",
        // Contratación digital a escala
        "Recepción de solicitudes de contrato verificadas",
        "Generación y gestión de contratos digitales",
        "Bloqueo automático de inmuebles durante contratación",
        "Mensajería segura y trazable con inquilinos",
        // Soporte y acompañamiento
        "Soporte prioritario para operaciones críticas",
      ];
    }

    return [];
  };

  // Vista intermedia para usuarios NO autenticados
  if (!user) {
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

            {/* Vista Intermedia Educativa */}
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Planes Flexibles</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Planes diseñados según cómo uses RenColombia
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  RenColombia ofrece planes pensados para cada tipo de usuario.
                  Para mostrarte el plan adecuado, primero necesitamos saber
                  cómo quieres usar la plataforma.
                </p>
              </div>

              {/* Sección Informativa */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Inquilinos */}
                <div className="bg-card rounded-2xl p-6 border border-border/50">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-5">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 font-display">
                    Inquilinos
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Busca inmuebles, analiza precios y contrata de forma digital.
                  </p>
                </div>

                {/* Propietarios */}
                <div className="bg-card rounded-2xl p-6 border border-border/50">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-5">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 font-display">
                    Propietarios
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Publica inmuebles, recibe solicitudes y genera contratos digitales.
                  </p>
                </div>

                {/* Inmobiliarias */}
                <div className="bg-card rounded-2xl p-6 border border-border/50">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-5">
                    <Store className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 font-display">
                    Inmobiliarias
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Gestiona múltiples inmuebles, contratos y métricas desde un solo lugar.
                  </p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth?mode=register")}
                  className="gap-2 group"
                >
                  Crear cuenta y ver planes
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="gap-2"
                >
                  Iniciar sesión
                </Button>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Vista normal para usuarios autenticados (comportamiento actual)
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
              <span className="text-sm font-semibold">
                {userType === "inmobiliaria" 
                  ? "Para Inmobiliarias" 
                  : userType === "landlord" 
                  ? "Para Propietarios" 
                  : "Para Inquilinos"}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              {userType === "tenant" 
                ? "Planes para Inquilinos" 
                : userType === "landlord" 
                ? "Planes para Propietarios" 
                : "Planes para Inmobiliarias"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {userType === "tenant" 
                ? "Elige el plan que mejor se adapte a tus necesidades como inquilino."
                : userType === "landlord"
                ? "Elige el plan que mejor se adapte a tus necesidades como propietario."
                : "Elige el plan que mejor se adapte a las necesidades de tu inmobiliaria."}
            </p>
          </div>

          {/* Plans Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay planes disponibles en este momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
              {plans.map((plan) => {
                const isActive = activePlan?.plan_id === plan.id;
                const isPopular = plan.price_monthly > 0 && plan.id !== "inmobiliaria_free";

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative bg-card rounded-2xl border-2 p-8",
                      isPopular
                        ? "border-primary shadow-lg"
                        : "border-border",
                      isActive && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        Más Popular
                      </Badge>
                    )}

                    {isActive && (
                      <Badge className="absolute -top-3 right-4 bg-green-500 text-white">
                        Activo
                      </Badge>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                        {plan.id === "tenant_free" ? "🆓 Plan Gratis"
                          : plan.id === "tenant_pro" ? "⭐ Inquilino PRO"
                          : plan.id === "landlord_free" ? "🆓 Plan Gratis" 
                          : plan.id === "landlord_pro" ? "⭐ Propietario PRO"
                          : plan.id === "inmobiliaria_free" ? "🆓 Plan Inmobiliaria Free"
                          : plan.id === "inmobiliaria_pro" ? "⭐ Inmobiliaria PRO"
                          : `Plan ${plan.name}`}
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        {plan.id === "tenant_free"
                          ? "Acceso completo a búsqueda y funcionalidades básicas"
                          : plan.id === "tenant_pro"
                          ? "Contratos digitales, verificación KYC y análisis de precios"
                          : plan.id === "landlord_free" 
                          ? "Pensado para probar la plataforma y subir un inmueble básico"
                          : plan.id === "landlord_pro"
                          ? "Publica, analiza y cierra contratos con mayor control"
                          : plan.id === "inmobiliaria_free"
                          ? "Perfil básico de inmobiliaria con hasta 3 inmuebles"
                          : plan.id === "inmobiliaria_pro"
                          ? "Escala tu operación con gestión y contratos digitales"
                          : plan.description || "Plan para usuarios"}
                      </p>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-4xl font-bold text-primary">
                          {formatPrice(plan.price_monthly)}
                        </span>
                        {plan.price_monthly > 0 && (
                          <span className="text-muted-foreground">/mes</span>
                        )}
                      </div>
                      {plan.id === "landlord_pro" && (
                        <p className="text-xs text-muted-foreground mt-2">
                          $299.000 COP / año (2 meses gratis)
                        </p>
                      )}
                    </div>

                    <ul className="space-y-4 mb-8">
                      {getPlanFeatures(plan).map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="text-foreground text-sm">{feature}</span>
                        </li>
                      ))}
                      {plan.id === "landlord_free" && (
                        <>
                          <div className="pt-2 border-t border-border mt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">El Plan PRO desbloquea:</p>
                            <ul className="space-y-2">
                              <li className="flex items-start gap-2">
                                <span className="text-destructive">❌</span>
                                <span className="text-xs text-muted-foreground">Mayor capacidad de publicación (hasta 5 inmuebles)</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-destructive">❌</span>
                                <span className="text-xs text-muted-foreground">Inteligencia de precios completa</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-destructive">❌</span>
                                <span className="text-xs text-muted-foreground">Mayor visibilidad (destacar inmuebles)</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-destructive">❌</span>
                                <span className="text-xs text-muted-foreground">Herramientas de contratación digital</span>
                              </li>
                            </ul>
                          </div>
                        </>
                      )}
                      {/* MVP: Mostrar beneficios PRO para inquilinos solo si NO son PRO */}
                      {plan.id === "tenant_free" && (!activePlan || !activePlan.plan_id?.includes("_pro")) && (
                        <>
                          <div className="pt-2 border-t border-border mt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">El Plan PRO desbloquea:</p>
                            <ul className="space-y-2">
                              <li className="flex items-start gap-2">
                                <span className="text-primary">✔</span>
                                <span className="text-xs text-muted-foreground">Solicitar contratos digitales de arrendamiento</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">✔</span>
                                <span className="text-xs text-muted-foreground">Verificación de identidad (KYC)</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">✔</span>
                                <span className="text-xs text-muted-foreground">Comunicación directa dentro del contrato</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">✔</span>
                                <span className="text-xs text-muted-foreground">Mayor seguridad y menos fricción</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary">✔</span>
                                <span className="text-xs text-muted-foreground">Acceso a análisis de precios por zona</span>
                              </li>
                            </ul>
                          </div>
                        </>
                      )}
                      {plan.id === "inmobiliaria_free" && (
                        <>
                          <div className="pt-2 border-t border-border mt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">El Plan PRO desbloquea:</p>
                            <ul className="space-y-2">
                              <li className="flex items-start gap-2">
                                <span className="text-destructive">❌</span>
                                <span className="text-xs text-muted-foreground">Escalabilidad operativa (inmuebles ilimitados)</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-destructive">❌</span>
                                <span className="text-xs text-muted-foreground">Analítica avanzada y reportes</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-destructive">❌</span>
                                <span className="text-xs text-muted-foreground">Mayor visibilidad y marca destacada</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-destructive">❌</span>
                                <span className="text-xs text-muted-foreground">Contratación digital centralizada</span>
                              </li>
                            </ul>
                          </div>
                        </>
                      )}
                    </ul>

                    <Button
                      variant={isPopular ? "default" : "outline"}
                      className="w-full"
                      size="lg"
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isActive || plan.price_monthly === 0}
                    >
                      {isActive ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Plan Activo
                        </>
                      ) : plan.price_monthly === 0 ? (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Ya lo tienes
                        </>
                      ) : plan.id === "tenant_pro" ? (
                        <>
                          <Star className="w-4 h-4 mr-2" />
                          Contratar plan Inquilino PRO
                        </>
                      ) : plan.id === "landlord_pro" ? (
                        <>
                          <Star className="w-4 h-4 mr-2" />
                          Contratar plan Propietario PRO
                        </>
                      ) : plan.id === "inmobiliaria_pro" ? (
                        <>
                          <Star className="w-4 h-4 mr-2" />
                          Contratar plan Inmobiliaria PRO
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4 mr-2" />
                          Contratar Plan
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}


          {/* Info Section para propietarios */}
          {userType === "landlord" && (
            <div className="bg-muted/50 rounded-xl p-6 md:p-8 max-w-3xl mx-auto mb-12">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    ¿Eres arrendador individual?
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Puedes empezar con el plan gratuito que incluye 1 inmueble. Si necesitas más
                    funcionalidades, elige el plan PRO con análisis de precios premium.
                  </p>
                  <Link to="/publicar">
                    <Button variant="outline">
                      Publicar inmueble gratis
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mt-12">
            <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">
              Preguntas Frecuentes
            </h2>
            <div className="space-y-4">
              <div className="bg-card rounded-lg border border-border p-5">
                <h3 className="font-semibold text-foreground mb-2">
                  ¿Cómo funciona el pago?
                </h3>
                <p className="text-muted-foreground text-sm">
                  Los pagos se procesan de forma segura a través de Wompi. Puedes pagar con
                  tarjeta de crédito, débito, Nequi, PSE o transferencia bancaria.
                </p>
              </div>
              <div className="bg-card rounded-lg border border-border p-5">
                <h3 className="font-semibold text-foreground mb-2">
                  ¿Puedo cancelar mi suscripción?
                </h3>
                <p className="text-muted-foreground text-sm">
                  Sí, puedes cancelar tu suscripción en cualquier momento desde tu perfil. Tu plan
                  permanecerá activo hasta el final del período pagado.
                </p>
              </div>
              <div className="bg-card rounded-lg border border-border p-5">
                <h3 className="font-semibold text-foreground mb-2">
                  ¿Qué incluye el análisis de precios premium?
                </h3>
                <p className="text-muted-foreground text-sm">
                  Con el plan PRO obtienes acceso completo al análisis de precios por zona, incluyendo
                  promedios, medianas, rangos recomendados y comparaciones detalladas basadas en datos reales.
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
