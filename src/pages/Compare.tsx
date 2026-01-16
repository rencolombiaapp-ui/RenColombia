import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Scale,
  Heart,
  Loader2,
  MapPin,
  Home,
  Square,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

const Compare = () => {
  const { user } = useAuth();
  const { data: favorites = [], isLoading } = useFavorites();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatPropertyType = (type: string) => {
    const types: Record<string, string> = {
      apartamento: "Apartamento",
      casa: "Casa",
      apartaestudio: "Apartaestudio",
      local: "Local comercial",
      loft: "Loft",
      penthouse: "Penthouse",
    };
    return types[type] || type;
  };

  // Obtener imagen principal
  const getPrimaryImage = (property: typeof favorites[0]["properties"]) => {
    const primary = property.property_images?.find((img) => img.is_primary);
    if (primary) return primary.url;
    if (property.property_images?.length > 0) return property.property_images[0].url;
    return "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400";
  };

  const toggleSelection = (propertyId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId);
      } else if (prev.length < 3) {
        return [...prev, propertyId];
      }
      return prev;
    });
  };

  const selectedProperties = favorites
    .filter((fav) => selectedIds.includes(fav.property_id))
    .map((fav) => fav.properties);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Comparar Inmuebles
            </h1>
            <p className="text-muted-foreground">
              Selecciona hasta 3 inmuebles de tus favoritos para compararlos.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Cargando tus favoritos...</p>
            </div>
          )}

          {/* Empty State - Sin favoritos */}
          {!isLoading && favorites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Heart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Aún no tienes favoritos
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Guarda inmuebles en tus favoritos para poder compararlos.
              </p>
              <Link to="/buscar">
                <Button className="gap-2">
                  Explorar propiedades
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* Empty State - Menos de 2 favoritos */}
          {!isLoading && favorites.length > 0 && favorites.length < 2 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Scale className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Necesitas más favoritos
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Guarda al menos 2 inmuebles en tus favoritos para poder compararlos.
              </p>
              <Link to="/buscar">
                <Button className="gap-2">
                  Explorar más propiedades
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* Selection List */}
          {!isLoading && favorites.length >= 2 && (
            <>
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedIds.length} de {Math.min(3, favorites.length)} seleccionados
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((favorite) => {
                    const property = favorite.properties;
                    const isSelected = selectedIds.includes(favorite.property_id);
                    const canSelect = selectedIds.length < 3 || isSelected;

                    return (
                      <div
                        key={favorite.id}
                        className={cn(
                          "bg-card rounded-xl border-2 overflow-hidden cursor-pointer transition-all",
                          isSelected
                            ? "border-primary shadow-md"
                            : canSelect
                            ? "border-border hover:border-primary/50"
                            : "border-border opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => canSelect && toggleSelection(favorite.property_id)}
                      >
                        <div className="relative aspect-[4/3]">
                          <img
                            src={getPrimaryImage(property)}
                            alt={property.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 right-3">
                            {isSelected ? (
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border-2 border-border" />
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                            {property.title}
                          </h3>
                          <p className="text-lg font-bold text-primary mb-2">
                            {formatPrice(property.price)}
                            <span className="text-sm font-normal text-muted-foreground">/mes</span>
                          </p>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>
                              {property.neighborhood && `${property.neighborhood}, `}
                              {property.city}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comparison View */}
              {selectedProperties.length >= 2 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Comparación
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIds([])}
                    >
                      Limpiar selección
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedProperties.map((property) => (
                      <div
                        key={property.id}
                        className="bg-card rounded-xl border border-border overflow-hidden"
                      >
                        {/* Image */}
                        <div className="aspect-[4/3] relative">
                          <img
                            src={getPrimaryImage(property)}
                            alt={property.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-white/90 text-foreground">
                              {formatPropertyType(property.property_type)}
                            </Badge>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                          {/* Title */}
                          <h3 className="font-semibold text-foreground line-clamp-2">
                            {property.title}
                          </h3>

                          {/* Price */}
                          <div>
                            <p className="text-2xl font-bold text-primary font-display">
                              {formatPrice(property.price)}
                              <span className="text-sm font-normal text-muted-foreground font-sans">
                                /mes
                              </span>
                            </p>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm">
                              {property.neighborhood && `${property.neighborhood}, `}
                              {property.city}
                            </span>
                          </div>

                          {/* Features */}
                          <div className="space-y-2 pt-3 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Área</span>
                              <span className="text-sm font-semibold text-foreground">
                                {property.area ? `${property.area} m²` : "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Habitaciones</span>
                              <span className="text-sm font-semibold text-foreground">
                                {property.bedrooms}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Baños</span>
                              <span className="text-sm font-semibold text-foreground">
                                {property.bathrooms}
                              </span>
                            </div>
                          </div>

                          {/* View Button */}
                          <Link to={`/inmueble/${property.id}`} className="block">
                            <Button variant="outline" className="w-full gap-2">
                              <ExternalLink className="w-4 h-4" />
                              Ver detalle
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty Comparison State */}
              {selectedProperties.length < 2 && (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl">
                  <Scale className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Selecciona al menos 2 inmuebles para compararlos
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Compare;
