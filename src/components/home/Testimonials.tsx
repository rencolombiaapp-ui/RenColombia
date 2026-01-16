import { Star, Quote, User } from "lucide-react";
import { useReviews } from "@/hooks/use-reviews";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const Testimonials = () => {
  const { data: reviews = [], isLoading } = useReviews();

  // Función para obtener el nombre del usuario
  const getUserName = (review: typeof reviews[0]) => {
    if (review.profiles.publisher_type === "inmobiliaria" && review.profiles.company_name) {
      return review.profiles.company_name;
    }
    return review.profiles.full_name || review.profiles.email?.split("@")[0] || "Usuario";
  };

  // Función para obtener el tipo de usuario en español
  const getUserTypeLabel = (userType: string) => {
    const types: Record<string, string> = {
      inquilino: "Inquilino",
      propietario: "Propietario",
      inmobiliaria: "Inmobiliaria",
    };
    return types[userType] || userType;
  };

  // Función para obtener la ciudad (si existe en alguna propiedad del usuario)
  const getUserLocation = (review: typeof reviews[0]) => {
    // Por ahora retornamos null, en el futuro se puede obtener de las propiedades del usuario
    return null;
  };

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <span className="text-primary font-semibold text-sm tracking-wide uppercase">
            Testimonios
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-muted-foreground mt-4">
            Opiniones reales de usuarios que confían en RenColombia para sus necesidades de arrendamiento.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && reviews.length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-lg">
                Las opiniones de nuestros primeros usuarios aparecerán aquí.
              </p>
            </div>
          </div>
        )}

        {/* Reviews Grid */}
        {!isLoading && reviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {reviews.slice(0, 3).map((review, index) => (
              <div
                key={review.id}
                className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border/50 relative animate-slide-up"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Quote Icon */}
                <Quote className="w-10 h-10 text-primary/20 absolute top-6 right-6" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-4 h-4",
                        i < review.rating
                          ? "fill-accent text-accent"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>

                {/* Text */}
                {review.comment && (
                  <p className="text-foreground/80 leading-relaxed mb-6">
                    "{review.comment}"
                  </p>
                )}

                {/* Author */}
                <div className="flex items-center gap-4">
                  {review.profiles.publisher_type === "inmobiliaria" && review.profiles.company_logo ? (
                    <img
                      src={review.profiles.company_logo}
                      alt={getUserName(review)}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                      <AvatarImage src={review.profiles.avatar_url || undefined} alt={getUserName(review)} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{getUserName(review)}</p>
                    <p className="text-sm text-muted-foreground">
                      {getUserTypeLabel(review.user_type)}
                      {getUserLocation(review) && ` • ${getUserLocation(review)}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
