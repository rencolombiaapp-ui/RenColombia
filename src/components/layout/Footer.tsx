import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Eye } from "lucide-react";
import { useSiteVisits } from "@/hooks/use-site-visits";

const Footer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalVisits } = useSiteVisits();

  const handleHowItWorksClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Si estamos en la landing, hacer scroll suave
    if (location.pathname === "/") {
      const element = document.getElementById("como-funciona");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // Si estamos en otra página, redirigir a landing con hash
      navigate("/#como-funciona");
      // Esperar a que la página cargue y luego hacer scroll
      setTimeout(() => {
        const element = document.getElementById("como-funciona");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Home className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold text-white">
                Rentar<span className="text-accent">Colombia</span>
              </span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed">
              La plataforma digital para arrendar, contratar y pagar inmuebles en Colombia. Contratos digitales, verificación y mayor seguridad.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/buscar"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Buscar Inmuebles
                </Link>
              </li>
              <li>
                <Link
                  to="/publicar"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Publicar Propiedad
                </Link>
              </li>
              <li>
                <a
                  href="#como-funciona"
                  onClick={handleHowItWorksClick}
                  className="text-white/70 hover:text-accent transition-colors text-sm cursor-pointer"
                >
                  Cómo Funciona
                </a>
              </li>
              <li>
                <Link
                  to="/planes"
                  className="text-white/70 hover:text-accent transition-colors text-sm"
                >
                  Planes
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Legal</h4>
            <ul className="space-y-3">
              {[
                { label: "Términos y Condiciones", href: "/terminos" },
                { label: "Política de Privacidad", href: "/privacidad" },
                { label: "Tratamiento de Datos", href: "/datos" },
                { label: "Centro de Ayuda", href: "/ayuda" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-white/70 hover:text-accent transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-white/70 text-sm">
                <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                <span>Bogotá, Colombia</span>
              </li>
              <li className="flex items-center gap-3 text-white/70 text-sm">
                <Mail className="w-4 h-4 text-accent flex-shrink-0" />
                <a href="mailto:info@rentarcolombia.com" className="hover:text-accent transition-colors">
                  info@rentarcolombia.com
                </a>
              </li>
              <li className="flex items-center gap-3 text-white/70 text-sm">
                <Phone className="w-4 h-4 text-accent flex-shrink-0" />
                <a href="tel:+573001234567" className="hover:text-accent transition-colors">
                  +57 300 123 4567
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © 2026 RenColombia. Todos los derechos reservados.
          </p>
          
          {/* Contador de visitas */}
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Eye className="w-4 h-4" />
            <span>Visitas:</span>
            <span className="font-semibold text-white/80">{totalVisits.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
