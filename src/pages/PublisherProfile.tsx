import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import PropertyCard from "@/components/properties/PropertyCard";
import {
  ArrowLeft,
  Building2,
  User,
  Loader2,
  Home,
  MapPin,
} from "lucide-react";
import { usePublisherProfile } from "@/hooks/use-profile";
import { usePublisherProperties } from "@/hooks/use-properties";
import { cn } from "@/lib/utils";

const PublisherProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: publisher, isLoading: isLoadingPublisher } = usePublisherProfile(id);
  const { data: properties = [], isLoading: isLoadingProperties } = usePublisherProperties(id);

  if (isLoadingPublisher) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-16">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Cargando información...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!publisher) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-4">
                Publicador no encontrado
              </h1>
              <p className="text-muted-foreground mb-8">
                El publicador que buscas no existe o ha sido eliminado.
              </p>
              <Link to="/buscar">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a buscar
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isInmobiliaria = publisher.publisher_type === "inmobiliaria";
  const displayName = isInmobiliaria
    ? publisher.company_name || "Inmobiliaria"
    : publisher.full_name || publisher.email?.split("@")[0] || "Usuario";

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            to="/buscar"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a búsqueda</span>
          </Link>

          {/* Publisher Header */}
          <div className="bg-card rounded-xl border border-border p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Logo o Avatar */}
              {isInmobiliaria && publisher.company_logo ? (
                <img
                  src={publisher.company_logo}
                  alt={displayName}
                  className="w-24 h-24 rounded-xl object-cover border border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center border border-border">
                  {isInmobiliaria ? (
                    <Building2 className="w-12 h-12 text-primary" />
                  ) : (
                    <User className="w-12 h-12 text-primary" />
                  )}
                </div>
              )}

              {/* Info */}
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    {displayName}
                  </h1>
                  {isInmobiliaria && (
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      Inmobiliaria
                    </span>
                  )}
                </div>
                {publisher.phone && (
                  <p className="text-muted-foreground mb-2">
                    {publisher.phone}
                  </p>
                )}
                {publisher.address && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm">{publisher.address}</p>
                  </div>
                )}
                {publisher.email && (
                  <p className="text-sm text-muted-foreground">
                    {publisher.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Properties Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-foreground">
                Inmuebles publicados
              </h2>
              {isLoadingProperties && (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              )}
            </div>

            {/* Empty State */}
            {!isLoadingProperties && properties.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Home className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No hay inmuebles disponibles
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Este publicador aún no tiene propiedades publicadas.
                </p>
              </div>
            )}

            {/* Properties Grid */}
            {!isLoadingProperties && properties.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  {properties.length} {properties.length === 1 ? "inmueble disponible" : "inmuebles disponibles"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property) => {
                    const primaryImage = property.property_images?.find((img) => img.is_primary) || property.property_images?.[0];
                    return (
                      <Link key={property.id} to={`/inmueble/${property.id}`}>
                        <PropertyCard
                          id={property.id}
                          title={property.title}
                          location={`${property.neighborhood || ""} ${property.city}`.trim()}
                          price={property.price}
                          image={primaryImage?.url || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"}
                          bedrooms={property.bedrooms}
                          bathrooms={property.bathrooms}
                          area={property.area || 0}
                          type={formatPropertyType(property.property_type)}
                          isFeatured={property.is_featured}
                        />
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublisherProfile;
