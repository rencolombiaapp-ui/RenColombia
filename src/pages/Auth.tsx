import { useState } from "react";
import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isRegister = searchParams.get("mode") === "register";
  const [isLogin, setIsLogin] = useState(!isRegister);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Error al iniciar sesión",
            description: error.message === "Invalid login credentials" 
              ? "Credenciales incorrectas. Verifica tu email y contraseña."
              : error.message,
          });
        } else {
          toast({
            title: "¡Bienvenido!",
            description: "Has iniciado sesión correctamente.",
          });
          navigate(from, { replace: true });
        }
      } else {
        // Validar contraseñas
        if (formData.password !== formData.confirmPassword) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Las contraseñas no coinciden.",
          });
          setIsLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "La contraseña debe tener al menos 6 caracteres.",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.name);
        if (error) {
          toast({
            variant: "destructive",
            title: "Error al registrarse",
            description: error.message,
          });
        } else {
          toast({
            title: "¡Registro exitoso!",
            description: "Revisa tu correo para confirmar tu cuenta.",
          });
          // Limpiar el formulario después de un registro exitoso
          setFormData({
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 md:px-12 lg:px-16 xl:px-24 py-12">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al inicio</span>
        </Link>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Home className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">
            Ren<span className="text-accent">Colombia</span>
          </span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            {isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin
              ? "Ingresa tus datos para acceder a tu cuenta"
              : "Regístrate para encontrar tu hogar ideal"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Tu nombre completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 pr-10 h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>
          )}

          {isLogin && (
            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          )}

          <Button type="submit" variant="default" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isLogin ? "Iniciando..." : "Creando cuenta..."}
              </>
            ) : (
              isLogin ? "Iniciar Sesión" : "Crear Cuenta"
            )}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center text-muted-foreground mt-6">
          {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:text-primary/80 font-semibold"
          >
            {isLogin ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>

        {/* Legal */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          Al continuar, aceptas nuestros{" "}
          <Link to="/terminos" className="text-primary hover:underline">
            Términos y Condiciones
          </Link>{" "}
          y nuestra{" "}
          <Link to="/privacidad" className="text-primary hover:underline">
            Política de Privacidad
          </Link>
          .
        </p>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop"
          alt="Beautiful home"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary/40" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white max-w-md">
            <h2 className="text-3xl font-display font-bold mb-4">
              Tu próximo hogar te espera
            </h2>
            <p className="text-white/90 text-lg">
              Únete a miles de colombianos que ya encontraron su hogar ideal a través de RenColombia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
