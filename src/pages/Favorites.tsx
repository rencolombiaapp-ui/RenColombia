import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/hooks/use-favorites";
import PropertyCard from "@/components/properties/PropertyCard";

const Favorites = () => {
  const { user } = useAuth();
  const { data: favorites = [], isLoading } = useFavorites();

  // Función para obtener la imagen principal de una propiedad
  const getPrimaryImage = (property: typeof favorites[0]["properties"]) => {
    const primaryImage = property.property_images?.find((img) => img.is_primary);
    if (primaryImage) return primaryImage.url;
    if (property.property_images?.length > 0) return property.property_images[0].url;
    return "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";
  };

  // Función para formatear el tipo de propiedad
  const formatPropertyType = (type: string) => {
    const types: Record<string, string> = {
      apartamento: "Apartamento",
      casa: "Casa",
      apartaestudio: "Apartaestudio",
      local: "Local",
      loft: "Loft",
      penthouse: "Penthouse",
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Mis Favoritos
            </h1>
            <p className="text-muted-foreground">
              Hola, {user?.user_metadata?.full_name || user?.email?.split("@")[0]}. Aquí están tus propiedades guardadas.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Cargando tus favoritos...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && favorites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Heart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Aún no tienes favoritos
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Explora nuestras propiedades y guarda tus favoritas haciendo clic en el corazón.
              </p>
              <Link to="/buscar">
                <Button className="gap-2">
                  Explorar propiedades
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* Favorites Grid */}
          {!isLoading && favorites.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {favorites.length} {favorites.length === 1 ? "propiedad guardada" : "propiedades guardadas"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((favorite) => (
                  <Link key={favorite.id} to={`/inmueble/${favorite.property_id}`}>
                    <PropertyCard
                      id={favorite.property_id}
                      title={favorite.properties.title}
                      location={`${favorite.properties.neighborhood || ""} ${favorite.properties.city}`.trim()}
                      price={favorite.properties.price}
                      image={getPrimaryImage(favorite.properties)}
                      bedrooms={favorite.properties.bedrooms}
                      bathrooms={favorite.properties.bathrooms}
                      area={favorite.properties.area || 0}
                      type={formatPropertyType(favorite.properties.property_type)}
                      isFeatured={favorite.properties.is_featured}
                    />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Favorites;
