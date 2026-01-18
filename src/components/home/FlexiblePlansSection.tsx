import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, CheckCircle } from "lucide-react";

const FlexiblePlansSection = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 rounded-3xl p-8 md:p-12 border border-primary/20">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-semibold">Planes Flexibles</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Empieza gratis, crece cuando lo necesites
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Puedes usar RenColombia completamente gratis. Los planes PRO desbloquean contratación digital y análisis avanzados de precios.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Plan Gratuito</h3>
                  <p className="text-sm text-muted-foreground">
                    Búsqueda ilimitada, publicación básica y todas las funciones esenciales sin costo.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Plan PRO</h3>
                  <p className="text-sm text-muted-foreground">
                    Contratos digitales, análisis de precios detallados y herramientas avanzadas.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Sin compromisos</h3>
                  <p className="text-sm text-muted-foreground">
                    Cancela cuando quieras. Tu plan permanece activo hasta el final del período pagado.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Planes por tipo de usuario</h3>
                  <p className="text-sm text-muted-foreground">
                    Inquilinos, propietarios e inmobiliarias tienen planes diseñados para sus necesidades.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link to="/planes">
                <Button size="lg" className="gap-2 group">
                  Ver planes y precios
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlexiblePlansSection;
