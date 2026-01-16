import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowLeft, Check, X, Building2, Star, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Prices = () => {
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

          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Precios de RenColombia
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                RenColombia se encuentra en fase inicial. Publicar inmuebles es gratuito.
                Próximamente ofreceremos opciones de visibilidad y planes para inmobiliarias.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Publicar Inmuebles */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Publicar Inmuebles</h3>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-primary">Gratis</span>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    Publicación ilimitada
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    Múltiples fotos
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    Dashboard de gestión
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    Métricas básicas
                  </li>
                </ul>
                <Link to="/publicar">
                  <Button className="w-full">Publicar ahora</Button>
                </Link>
              </div>

              {/* Destacar Inmuebles */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Star className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Destacar Inmuebles</h3>
                </div>
                <div className="mb-4">
                  <Badge variant="secondary" className="text-sm">Próximamente</Badge>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-muted-foreground/50" />
                    Aparecer primero en búsquedas
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-muted-foreground/50" />
                    Badge "Destacado"
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-muted-foreground/50" />
                    Mayor visibilidad
                  </li>
                </ul>
                <Button className="w-full" variant="outline" disabled>
                  Próximamente
                </Button>
              </div>

              {/* Planes Inmobiliarias */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Store className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Planes Inmobiliarias</h3>
                </div>
                <div className="mb-4">
                  <Badge variant="secondary" className="text-sm">Próximamente</Badge>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-muted-foreground/50" />
                    Publicaciones ilimitadas
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-muted-foreground/50" />
                    Marca visible
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-muted-foreground/50" />
                    Dashboard avanzado
                  </li>
                </ul>
                <Link to="/planes">
                  <Button className="w-full" variant="outline">
                    Conocer más
                  </Button>
                </Link>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-muted/50 rounded-xl border border-border p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No cobramos por publicar en esta etapa
                  </h3>
                  <p className="text-muted-foreground">
                    RenColombia está en fase inicial y queremos que todos puedan publicar sus inmuebles sin costo.
                    Cuando implementemos opciones de visibilidad y planes para inmobiliarias, serán completamente opcionales.
                    Tu publicación siempre será gratuita.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-8">
              <Link to="/publicar">
                <Button size="lg" className="gap-2">
                  Publicar mi primer inmueble
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Prices;
