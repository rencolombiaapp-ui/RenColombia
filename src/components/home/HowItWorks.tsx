import { Search, MessageCircle, FileText, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Publica o busca un inmueble",
    description: "Publica tu propiedad gratis o busca entre miles de opciones verificadas en Colombia.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: MessageCircle,
    title: "Comunícate y analiza precios",
    description: "Habla directamente con propietarios o inquilinos y analiza precios por zona con datos reales.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: FileText,
    title: "Genera y aprueba el contrato",
    description: "Crea contratos digitales automáticamente, revísalos y aprueba todo en línea.",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    icon: CheckCircle,
    title: "Cierra el arrendamiento digitalmente",
    description: "Completa todo el proceso sin papeles. El inmueble se bloquea automáticamente durante la contratación.",
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
            Un proceso simple en 4 pasos para arrendar de forma digital y segura.
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
