import { Search, FileCheck, Home, CreditCard } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Publica tu inmueble",
    description: "Publica tu propiedad de forma gratuita y rápida. Sube fotos y completa la información en minutos.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: FileCheck,
    title: "Gestiona desde tu dashboard",
    description: "Controla todas tus propiedades desde un solo lugar. Activa, pausa o edita cuando quieras.",
    color: "bg-emerald-500/10 text-emerald",
  },
  {
    icon: Home,
    title: "Mide el interés",
    description: "Ve cuántas personas han visto tu inmueble y cuántas lo han guardado en favoritos.",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    icon: CreditCard,
    title: "Control total",
    description: "Tú decides qué propiedades mostrar y cuándo. Sin intermediarios, sin complicaciones.",
    color: "bg-accent/20 text-accent",
  },
];

const HowItWorks = () => {
  return (
    <section id="como-funciona" className="py-16 md:py-24 bg-muted/50 scroll-mt-20 md:scroll-mt-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <span className="text-primary font-semibold text-sm tracking-wide uppercase">
            Proceso Simple
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3">
            ¿Cómo funciona RenColombia?
          </h2>
          <p className="text-muted-foreground mt-4">
            Gestiona tus propiedades de forma simple y profesional. Todo el control en tus manos.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative group animate-slide-up"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Connector Line (hidden on mobile and last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-border to-transparent" />
              )}

              <div className="bg-card rounded-2xl p-6 md:p-8 shadow-card hover:shadow-card-hover transition-all duration-300 group-hover:-translate-y-2 h-full border border-border/50">
                {/* Step Number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center mb-5`}>
                  <step.icon className="w-7 h-7" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3 font-display">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
