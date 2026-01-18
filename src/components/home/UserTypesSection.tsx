import { Link } from "react-router-dom";
import { Users, Building2, Store, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const userTypes = [
  {
    icon: Users,
    title: "Inquilinos",
    description: "Encuentra tu próximo hogar con herramientas que facilitan todo el proceso.",
    features: [
      "Encuentra inmuebles reales verificados",
      "Solicita contratos digitales (PRO)",
      "Comunícate directamente con propietarios",
      "Más seguridad y menos fricción",
    ],
    cta: "Buscar inmuebles",
    ctaLink: "/buscar",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Building2,
    title: "Propietarios",
    description: "Gestiona tus propiedades y encuentra inquilinos verificados de forma eficiente.",
    features: [
      "Publica y gestiona inmuebles fácilmente",
      "Genera contratos digitales",
      "Bloquea inmuebles en proceso automáticamente",
      "Analiza precios por zona (PRO)",
    ],
    cta: "Publicar inmueble",
    ctaLink: "/publicar",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: Store,
    title: "Inmobiliarias",
    description: "Gestión centralizada para múltiples inmuebles con herramientas profesionales.",
    features: [
      "Gestión centralizada de portafolio",
      "Múltiples inmuebles en un solo lugar",
      "Contratos digitales escalables",
      "Métricas y visibilidad mejorada (PRO)",
    ],
    cta: "Publicar como inmobiliaria",
    ctaLink: "/publicar",
    color: "bg-purple-500/10 text-purple-600",
  },
];

const UserTypesSection = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <span className="text-primary font-semibold text-sm tracking-wide uppercase">
            Para cada tipo de usuario
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3">
            Una plataforma para todos
          </h2>
          <p className="text-muted-foreground mt-4">
            RenColombia se adapta a tus necesidades, ya seas inquilino, propietario o inmobiliaria.
          </p>
        </div>

        {/* User Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {userTypes.map((type, index) => (
            <div
              key={type.title}
              className="bg-card rounded-2xl p-6 md:p-8 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 animate-slide-up flex flex-col"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl ${type.color} flex items-center justify-center mb-5`}>
                <type.icon className="w-7 h-7" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-foreground mb-3 font-display">
                {type.title}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {type.description}
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-grow">
                {type.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link to={type.ctaLink}>
                <Button variant="outline" className="w-full group gap-2">
                  {type.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UserTypesSection;
