import { Link } from "react-router-dom";
import { Building2, Users, ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-16 md:py-24 bg-primary relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {/* For Tenants */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/20 group hover:bg-white/15 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
              ¿Buscas arriendo?
            </h3>
            <p className="text-white/80 mb-6 leading-relaxed">
              Encuentra tu próximo hogar entre miles de opciones verificadas. Aplica fácilmente y firma tu contrato 100% en línea.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Propiedades verificadas",
                "Proceso 100% digital",
                "Pagos seguros en línea",
                "Soporte personalizado",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/90">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/buscar">
              <Button variant="hero" size="lg" className="group/btn gap-2">
                Buscar inmuebles
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* For Owners */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/20 group hover:bg-white/15 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
              ¿Eres propietario?
            </h3>
            <p className="text-white/80 mb-6 leading-relaxed">
              Publica tu propiedad gratis y encuentra inquilinos verificados. Gestiona todo desde nuestra plataforma.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Publicación gratuita",
                "Inquilinos verificados",
                "Contratos digitales",
                "Recaudo automático",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/90">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/publicar">
              <Button variant="heroOutline" size="lg" className="group/btn gap-2">
                Publicar propiedad
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* For Real Estate Agencies */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/20 group hover:bg-white/15 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <Store className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
              ¿Eres inmobiliaria?
            </h3>
            <p className="text-white/80 mb-6 leading-relaxed">
              Publica y gestiona múltiples inmuebles desde un solo lugar. Dale visibilidad a tu marca y controla tu portafolio sin complicaciones.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Gestión centralizada de inmuebles",
                "Marca visible en cada publicación",
                "Dashboard con métricas básicas",
                "Publicación gratuita (planes próximamente)",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/90">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/publicar">
              <Button variant="heroOutline" size="lg" className="group/btn gap-2">
                Publicar como inmobiliaria
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
