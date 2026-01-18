import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X, Home, Search, Heart, User, Building2, LogOut, LayoutDashboard, Scale, Settings, MessageCircle, HandHeart, Shield } from "lucide-react";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useIsLandlord } from "@/hooks/use-my-properties";
import { useProfile } from "@/hooks/use-profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  
  // Los hooks deben llamarse siempre, no condicionalmente
  const { user, signOut, loading } = useAuth();
  const { data: isLandlord = false, error: landlordError } = useIsLandlord();
  const { data: profile, error: profileError } = useProfile();
  
  // Si hay errores en los hooks, usar valores por defecto seguros
  const safeIsLandlord = landlordError ? false : isLandlord;
  const safeProfile = profileError ? null : profile;
  
  // Verificar si el usuario es propietario o inmobiliaria
  const isPublisher = safeProfile?.role === "landlord" || safeProfile?.publisher_type === "inmobiliaria" || safeProfile?.publisher_type === "individual";

  // Detectar scroll en la página home
  useEffect(() => {
    if (!isHome) {
      setIsScrolled(false);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinks = [
    { href: "/buscar", label: "Buscar", icon: Search },
    { href: "/publicar", label: "Publicar", icon: Building2 },
    { href: "/favoritos", label: "Favoritos", icon: Heart },
    { href: "/comparar", label: "Comparar", icon: Scale },
  ];

  const shouldShowBackground = !isHome || isScrolled;

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-colors duration-300 isolate",
        shouldShowBackground ? "bg-card shadow-sm border-b border-border" : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className={cn(
              "text-xl font-display font-bold transition-colors",
              shouldShowBackground ? "text-foreground" : "text-white"
            )}>
              Rentar<span className="text-accent">Colombia</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "gap-2 font-medium",
                    !shouldShowBackground ? "text-white/90 hover:text-white hover:bg-white/10" : ""
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
            {/* Mis Inmuebles - solo visible si es propietario o inmobiliaria */}
            {user && isPublisher && (
              <Link to="/mis-inmuebles">
                <Button
                  variant="ghost"
                  className={cn(
                    "gap-2 font-medium",
                    !shouldShowBackground ? "text-white/90 hover:text-white hover:bg-white/10" : ""
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Mis Inmuebles
                </Button>
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <>
                {/* Notificaciones - solo visible si el usuario está autenticado */}
                <NotificationsList shouldShowBackground={shouldShowBackground} />
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={shouldShowBackground ? "outline" : "heroOutline"}
                    size="default"
                    className="gap-2"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={safeProfile?.avatar_url || undefined} alt="Avatar" />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        <User className="w-3 h-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[120px] truncate">
                      {user.user_metadata?.full_name || user.email?.split("@")[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-48 bg-white dark:bg-gray-950 border border-border shadow-lg z-[101]"
                >
                  <DropdownMenuItem className="text-foreground text-sm cursor-default">
                    <span className="truncate block w-full">{user.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Mis Inmuebles - solo visible si es propietario o inmobiliaria */}
                  {isPublisher && (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer text-foreground">
                        <Link to="/mis-inmuebles" className="flex items-center">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Mis Inmuebles
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer text-foreground">
                        <Link to="/intenciones" className="flex items-center">
                          <HandHeart className="w-4 h-4 mr-2" />
                          Intenciones
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {/* Mensajes - visible para todos los usuarios autenticados */}
                  <DropdownMenuItem asChild className="cursor-pointer text-foreground">
                    <Link to="/mensajes" className="flex items-center">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Mensajes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer text-foreground">
                    <Link to="/favoritos" className="flex items-center">
                      <Heart className="w-4 h-4 mr-2" />
                      Mis Favoritos
                    </Link>
                  </DropdownMenuItem>
                  {/* Seguros - solo visible para inquilinos */}
                  {!isPublisher && (
                    <DropdownMenuItem asChild className="cursor-pointer text-foreground">
                      <Link to="/seguros" className="flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Seguros
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="cursor-pointer text-foreground">
                    <Link to="/comparar" className="flex items-center">
                      <Scale className="w-4 h-4 mr-2" />
                      Comparar
                    </Link>
                  </DropdownMenuItem>
                  {/* Configuración - siempre visible si está logueado */}
                  <DropdownMenuItem asChild className="cursor-pointer text-foreground">
                    <Link to="/perfil" className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Configuración
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <>
            <Link to="/auth">
              <Button
                    variant={shouldShowBackground ? "outline" : "heroOutline"}
                size="default"
              >
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/auth?mode=register">
                  <Button variant={shouldShowBackground ? "default" : "hero"} size="default">
                Registrarse
              </Button>
            </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "md:hidden p-2 rounded-lg transition-colors",
              shouldShowBackground ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/10"
            )}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden absolute top-full left-0 right-0 bg-card border-b border-border shadow-lg transition-all duration-300 overflow-hidden",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="container mx-auto px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <link.icon className="w-5 h-5 text-primary" />
              <span className="font-medium">{link.label}</span>
            </Link>
          ))}
          <div className="pt-4 border-t border-border space-y-2">
            {user ? (
              <>
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {user.email}
                </div>
                {/* Notificaciones en móvil */}
                <div className="px-3 pb-2">
                  <NotificationsList shouldShowBackground={true} />
                </div>
                {/* Mis Inmuebles - solo visible si es propietario o inmobiliaria */}
                {isPublisher && (
                  <>
                    <Link
                      to="/mis-inmuebles"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <LayoutDashboard className="w-5 h-5 text-primary" />
                      <span className="font-medium">Mis Inmuebles</span>
                    </Link>
                    <Link
                      to="/intenciones"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <HandHeart className="w-5 h-5 text-primary" />
                      <span className="font-medium">Intenciones</span>
                    </Link>
                  </>
                )}
                {/* Mensajes - visible para todos los usuarios autenticados */}
                <Link
                  to="/mensajes"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <span className="font-medium">Mensajes</span>
                </Link>
                {/* Seguros - solo visible para inquilinos */}
                {!isPublisher && (
                  <Link
                    to="/seguros"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="font-medium">Seguros</span>
                  </Link>
                )}
                {/* Configuración - siempre visible si está logueado */}
                <Link
                  to="/perfil"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <Settings className="w-5 h-5 text-primary" />
                  <span className="font-medium">Configuración</span>
                </Link>
                <Button
                  variant="outline"
                  className="w-full text-destructive"
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <>
            <Link to="/auth" onClick={() => setIsOpen(false)}>
              <Button variant="outline" className="w-full">
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/auth?mode=register" onClick={() => setIsOpen(false)}>
              <Button variant="default" className="w-full">
                Registrarse
              </Button>
            </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
