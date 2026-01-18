import { Shield, Lock, TrendingUp, CheckCircle } from "lucide-react";

const trustFeatures = [
  {
    icon: Shield,
    title: "Seguridad y control",
    description: "Tus datos están protegidos y tienes control total sobre tus propiedades y contratos.",
  },
  {
    icon: Lock,
    title: "Datos protegidos",
    description: "Cumplimos con las mejores prácticas de seguridad y protección de datos personales.",
  },
  {
    icon: TrendingUp,
    title: "Plataforma en crecimiento",
    description: "Somos una plataforma joven pero sólida, creciendo rápidamente en Colombia.",
  },
  {
    icon: CheckCircle,
    title: "Proceso transparente",
    description: "Todo el proceso es claro y transparente, sin sorpresas ni costos ocultos.",
  },
];

const TrustSection = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Confía en RenColombia
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tu seguridad y privacidad son nuestra prioridad. Trabajamos constantemente para ofrecerte la mejor experiencia.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {trustFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-card rounded-2xl p-6 border border-border/50 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
