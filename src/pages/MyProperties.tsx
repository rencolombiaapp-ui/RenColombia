import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Eye,
  Heart,
  Plus,
  Loader2,
  Pause,
  Play,
  ExternalLink,
  MapPin,
  Edit,
  Trash2,
  Star,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { useMyProperties, useTogglePropertyStatus, useDeleteProperty, type PropertyWithStats } from "@/hooks/use-my-properties";
import { cn } from "@/lib/utils";

const MyProperties = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: properties = [], isLoading } = useMyProperties();
  const toggleStatus = useTogglePropertyStatus();
  const deleteProperty = useDeleteProperty();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<PropertyWithStats | null>(null);
  const [featuredDialogOpen, setFeaturedDialogOpen] = useState(false);

  const isInmobiliaria = profile?.publisher_type === "inmobiliaria";
  const publishedPropertiesCount = Array.isArray(properties) ? properties.filter((p) => p.status === "published").length : 0;
  const FREE_LIMIT = 5; // Límite suave para inmobiliarias

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Estadísticas totales
  const totalPublished = properties.filter((p) => p.status === "published").length;
  const totalViews = properties.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const totalFavorites = properties.reduce((sum, p) => sum + p.favorites_count, 0);

  // Obtener imagen principal
  const getPrimaryImage = (property: PropertyWithStats) => {
    const primary = property.property_images?.find((img) => img.is_primary);
    if (primary) return primary.url;
    if (property.property_images?.length > 0) return property.property_images[0].url;
    return "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Publicado</Badge>;
      case "paused":
        return <Badge variant="secondary">Pausado</Badge>;
      case "rented":
        return <Badge className="bg-accent/10 text-accent-foreground border-accent/20">Arrendado</Badge>;
      default:
        return <Badge variant="outline">Borrador</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                Mis Inmuebles
              </h1>
              <p className="text-muted-foreground">
                Hola, {user?.user_metadata?.full_name || user?.email?.split("@")[0]}. Gestiona tus propiedades.
              </p>
            </div>
            <Link to="/publicar">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Publicar inmueble
              </Button>
            </Link>
          </div>

          {/* Banner para inmobiliarias */}
          {isInmobiliaria && (
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4 md:p-6 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Conoce nuestros planes para inmobiliarias
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Descubre cómo puedes hacer crecer tu inmobiliaria con más visibilidad y herramientas avanzadas.
                    </p>
                  </div>
                </div>
                <Link to="/planes">
                  <Button variant="default" className="w-full sm:w-auto">
                    Ver planes
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Mensaje informativo si alcanza límite suave */}
          {isInmobiliaria && publishedPropertiesCount >= FREE_LIMIT && (
            <div className="bg-muted/50 border border-border rounded-xl p-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Star className="w-3 h-3 text-primary" />
                </div>
                <div className="flex-grow">
                  <p className="text-sm text-foreground font-medium mb-1">
                    Has alcanzado el límite de publicaciones gratuitas
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Próximamente tendremos planes para inmobiliarias con más beneficios. Por ahora puedes seguir publicando sin restricciones.
                  </p>
                  <Link to="/planes">
                    <Button variant="outline" size="sm">
                      Conocer planes
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalPublished}</p>
                  <p className="text-sm text-muted-foreground">Publicados</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalViews}</p>
                  <p className="text-sm text-muted-foreground">Vistas totales</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalFavorites}</p>
                  <p className="text-sm text-muted-foreground">Favoritos totales</p>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Cargando tus inmuebles...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && properties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Building2 className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Publica tu primer inmueble para acceder al dashboard
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Una vez que publiques tu primera propiedad, podrás gestionarla desde aquí y ver estadísticas de vistas y favoritos.
              </p>
              <Link to="/publicar">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Publicar inmueble
                </Button>
              </Link>
            </div>
          )}

          {/* Properties List */}
          {!isLoading && properties.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {properties.length} {properties.length === 1 ? "inmueble" : "inmuebles"} en total
              </p>

              <div className="space-y-4">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className={cn(
                      "bg-card rounded-xl border border-border overflow-hidden",
                      "hover:border-primary/30 transition-colors"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      <div className="sm:w-48 sm:h-36 aspect-video sm:aspect-auto flex-shrink-0">
                        <img
                          src={getPrimaryImage(property)}
                          alt={property.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-grow p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          {/* Info */}
                          <div className="space-y-2 flex-grow">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground">
                                {property.title}
                              </h3>
                              {getStatusBadge(property.status)}
                            </div>

                            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span>
                                {property.neighborhood && `${property.neighborhood}, `}
                                {property.city}
                              </span>
                            </div>

                            <p className="text-lg font-bold text-primary">
                              {formatPrice(property.price)}
                              <span className="text-sm font-normal text-muted-foreground">/mes</span>
                            </p>

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-4 h-4" />
                                <span>{property.views_count || 0} vistas</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Heart className="w-4 h-4" />
                                <span>{property.favorites_count} favoritos</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex sm:flex-col gap-2 flex-shrink-0">
                            <Link to={`/inmueble/${property.id}`} className="flex-1 sm:flex-none">
                              <Button variant="outline" size="sm" className="w-full gap-1.5">
                                <ExternalLink className="w-4 h-4" />
                                Ver
                              </Button>
                            </Link>
                            {/* Botón Destacar - solo visible si está publicado */}
                            {property.status === "published" && (
                              <Button
                                variant={property.is_featured ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "flex-1 sm:flex-none gap-1.5",
                                  property.is_featured && "bg-primary text-primary-foreground"
                                )}
                                onClick={() => setFeaturedDialogOpen(true)}
                              >
                                <Star className={cn("w-4 h-4", property.is_featured && "fill-current")} />
                                {property.is_featured ? "Destacado" : "Destacar"}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none gap-1.5"
                              onClick={() =>
                                toggleStatus.mutate({
                                  propertyId: property.id,
                                  currentStatus: property.status,
                                })
                              }
                              disabled={toggleStatus.isPending}
                            >
                              {property.status === "published" ? (
                                <>
                                  <Pause className="w-4 h-4" />
                                  Pausar
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  Activar
                                </>
                              )}
                            </Button>
                            <Link to={`/publicar?edit=${property.id}`} className="flex-1 sm:flex-none">
                              <Button variant="outline" size="sm" className="w-full gap-1.5">
                                <Edit className="w-4 h-4" />
                                Modificar
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setPropertyToDelete(property);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Retirar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dialog de confirmación para retirar inmueble */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Retirar inmueble?</DialogTitle>
            <DialogDescription>
              ¿Ya arrendaste el apartamento? No lo retires, pausalo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (propertyToDelete) {
                  toggleStatus.mutate({
                    propertyId: propertyToDelete.id,
                    currentStatus: propertyToDelete.status,
                  });
                }
                setDeleteDialogOpen(false);
                setPropertyToDelete(null);
              }}
              disabled={toggleStatus.isPending}
              className="w-full sm:w-auto"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pausar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (propertyToDelete) {
                  deleteProperty.mutate(propertyToDelete.id);
                }
                setDeleteDialogOpen(false);
                setPropertyToDelete(null);
              }}
              disabled={deleteProperty.isPending}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Retirar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setPropertyToDelete(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog informativo para destacar inmueble */}
      <Dialog open={featuredDialogOpen} onOpenChange={setFeaturedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-primary fill-primary" />
              </div>
              <DialogTitle>Destacar inmueble</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Próximamente podrás destacar tu inmueble para tener más visibilidad en las búsquedas.
              <br /><br />
              Los inmuebles destacados aparecen primero en los resultados y tienen mayor exposición, lo que aumenta las posibilidades de encontrar inquilinos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeaturedDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default MyProperties;
