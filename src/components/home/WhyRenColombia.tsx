import { FileText, Lock, BarChart3 } from "lucide-react";

// MVP: Solo 3 diferenciales principales para simplificar el landing
const features = [
  {
    icon: FileText,
    title: "Contratos digitales de arrendamiento",
    description: "Genera, revisa y aprueba contratos 100% digitales. Sin papeles, sin complicaciones.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Lock,
    title: "Bloqueo automático de inmuebles",
    description: "Cuando inicias un contrato, el inmueble se bloquea automáticamente para evitar conflictos.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: BarChart3,
    title: "Análisis de precios por zona",
    description: "Conoce el precio real del mercado en tu ciudad y barrio con datos actualizados.",
    color: "bg-purple-500/10 text-purple-600",
  },
  // MVP: Mensajería y plataforma Colombia ocultas para simplificar
  // Se pueden reactivar en futuras versiones
];

const WhyRenColombia = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <span className="text-primary font-semibold text-sm tracking-wide uppercase">
            Diferenciales
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3">
            ¿Por qué RentarColombia?
          </h2>
          <p className="text-muted-foreground mt-4">
            No somos solo un portal de búsqueda. Somos una plataforma digital completa para arrendar, contratar y pagar inmuebles con mayor seguridad y procesos legales claros.
          </p>
        </div>

        {/* Features Grid - MVP: Solo 3 diferenciales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-card rounded-2xl p-6 md:p-8 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-5`}>
                <feature.icon className="w-7 h-7" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-foreground mb-3 font-display">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyRenColombia;
