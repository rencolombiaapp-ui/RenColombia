import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        toast({
          title: "Correo enviado",
          description: "Te enviamos un correo con instrucciones para restablecer tu contraseña",
        });
        // Limpiar el campo después del éxito
        setEmail("");
        // Opcional: redirigir después de unos segundos
        setTimeout(() => {
          navigate("/auth");
        }, 3000);
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
          to="/auth"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al inicio de sesión</span>
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
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="text-muted-foreground">
            Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          <Button type="submit" variant="default" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar instrucciones"
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
              Únete a miles de colombianos que ya encontraron su hogar ideal a través de RenColombia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
