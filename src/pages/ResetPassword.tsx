import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Lock, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar si hay una sesión válida de recuperación
    const checkSession = async () => {
      try {
        // Primero verificar si hay hash en la URL (token de recuperación desde el correo)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        if (accessToken && type === 'recovery') {
          // Intentar establecer la sesión con el token del correo
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (!sessionError) {
            setIsValidSession(true);
          } else {
            toast({
              variant: "destructive",
              title: "Enlace inválido",
              description: "El enlace de recuperación ha expirado o es inválido.",
            });
            setTimeout(() => navigate("/forgot-password"), 2000);
          }
        } else {
          // Si no hay hash, verificar si ya hay una sesión activa
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            setIsValidSession(true);
          } else {
            toast({
              variant: "destructive",
              title: "Sesión requerida",
              description: "Necesitas un enlace válido para restablecer tu contraseña.",
            });
            setTimeout(() => navigate("/forgot-password"), 2000);
          }
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Ocurrió un error al verificar la sesión.",
        });
        setTimeout(() => navigate("/forgot-password"), 2000);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar contraseñas
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas no coinciden.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        toast({
          title: "¡Contraseña actualizada!",
          description: "Tu contraseña ha sido restablecida correctamente.",
        });
        
        // Limpiar los campos
        setPassword("");
        setConfirmPassword("");
        
        // Redirigir al login después de un breve delay
        setTimeout(() => {
          navigate("/auth", { 
            state: { message: "Contraseña restablecida exitosamente. Inicia sesión con tu nueva contraseña." }
          });
        }, 2000);
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

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return null; // El useEffect ya maneja la redirección
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 md:px-12 lg:px-16 xl:px-24 py-12">
        {/* Back Button */}
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
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
            Restablecer contraseña
          </h1>
          <p className="text-muted-foreground">
            Ingresa tu nueva contraseña
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          <Button type="submit" variant="default" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Restablecer contraseña"
            )}
          </Button>
        </form>

        {/* Back to Login */}
        <p className="text-center text-muted-foreground mt-6">
          ¿Recordaste tu contraseña?{" "}
          <Link to="/auth" className="text-primary hover:text-primary/80 font-semibold">
            Inicia sesión
          </Link>
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
              Únete a miles de colombianos que ya encontraron su hogar ideal a través de RentarColombia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
