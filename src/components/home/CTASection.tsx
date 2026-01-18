import { Link } from "react-router-dom";
import { Building2, Users, ArrowRight, Store, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-16 md:py-24 bg-primary relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      {/* Final CTA Banner */}
      <div className="container mx-auto px-4 mb-12 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Empieza hoy
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Únete a RenColombia y transforma la forma en que arriendas inmuebles en Colombia.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/publicar">
              <Button variant="hero" size="lg" className="gap-2 group">
                Publicar inmueble
                <Building2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </Button>
            </Link>
            <Link to="/buscar">
              <Button variant="heroOutline" size="lg" className="gap-2 group">
                Buscar inmuebles
                <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* User Types */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {/* For Tenants */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/20 group hover:bg-white/15 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
              Inquilinos
            </h3>
            <p className="text-white/80 mb-6 leading-relaxed">
              Encuentra inmuebles reales verificados, solicita contratos digitales y comunícate directamente con propietarios. Más seguridad y menos fricción.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Búsqueda ilimitada de inmuebles",
                "Solicita contratos digitales (PRO)",
                "Comunicación directa y segura",
                "Análisis de precios por zona",
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
              Propietarios
            </h3>
            <p className="text-white/80 mb-6 leading-relaxed">
              Publica y gestiona inmuebles fácilmente, genera contratos digitales y bloquea automáticamente durante el proceso. Analiza precios por zona con datos reales.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Publicación gratuita de inmuebles",
                "Genera contratos digitales",
                "Bloqueo automático en proceso",
                "Análisis de precios por zona (PRO)",
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
              Inmobiliarias
            </h3>
            <p className="text-white/80 mb-6 leading-relaxed">
              Gestión centralizada para múltiples inmuebles, contratos digitales escalables y métricas mejoradas. Todo desde un solo lugar.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Gestión centralizada de portafolio",
                "Múltiples inmuebles en un lugar",
                "Contratos digitales escalables",
                "Métricas y visibilidad (PRO)",
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
