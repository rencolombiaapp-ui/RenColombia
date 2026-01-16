import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PropertyCard from "@/components/properties/PropertyCard";
import { useProperties } from "@/hooks/use-properties";

const FeaturedProperties = () => {
  // Traer las 6 propiedades más recientes (sin filtrar por destacadas)
  const { data: properties = [], isLoading, error } = useProperties({ limit: 6 });
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="space-y-3">
            <span className="text-primary font-semibold text-sm tracking-wide uppercase">
              Propiedades Destacadas
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Descubre los mejores inmuebles
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Seleccionamos las mejores opciones de arrendamiento verificadas por nuestro equipo.
            </p>
          </div>
          <Link to="/buscar">
            <Button variant="outline" className="gap-2 group">
              Ver todos
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Properties Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground">
            Error al cargar propiedades. Intenta de nuevo.
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Aún no hay propiedades
            </h3>
            <p className="text-muted-foreground max-w-md mb-4">
              Sé el primero en publicar tu inmueble en RenColombia.
            </p>
            <Link to="/publicar">
              <Button>Publicar propiedad</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {properties.map((property, index) => {
              const primaryImage = property.property_images?.find(img => img.is_primary) || property.property_images?.[0];
              return (
                <Link
                  key={property.id}
                  to={`/inmueble/${property.id}`}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <PropertyCard
                    id={property.id}
                    title={property.title}
                    location={`${property.neighborhood || ""}, ${property.city}`}
                    price={property.price}
                    image={primaryImage?.url || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop"}
                    bedrooms={property.bedrooms}
                    bathrooms={property.bathrooms}
                    area={property.area || 0}
                    type={property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}
                    isFeatured={property.is_featured}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProperties;
