import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useProperty } from "@/hooks/use-properties";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/use-favorites";
import { useIncrementViews } from "@/hooks/use-my-properties";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useUserReview } from "@/hooks/use-reviews";
import Navbar from "@/components/layout/Navbar";
import ReviewModal from "@/components/reviews/ReviewModal";
import Footer from "@/components/layout/Footer";
import PropertyMap from "@/components/properties/PropertyMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  MapPin,
  BedDouble,
  Bath,
  Square,
  ArrowLeft,
  Home,
  Loader2,
  ImageOff,
  Building2,
  User,
  ExternalLink,
  MessageCircle,
  Phone,
  Mail,
  Play,
  Pause,
  X,
  Maximize2,
  Car,
  Layers,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: property, isLoading, error } = useProperty(id);
  const { user } = useAuth();
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const incrementViews = useIncrementViews();
  const { data: userReview } = useUserReview();
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const viewIncrementedRef = useRef(false);
  const { toast } = useToast();
  
  // Estado para modal de review
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Estados para modales
  const [interestDialogOpen, setInterestDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [tour360DialogOpen, setTour360DialogOpen] = useState(false);
  const [tour360Playing, setTour360Playing] = useState(true);
  const [tour360Index, setTour360Index] = useState(0);
  const tour360IntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para mensaje de interés
  const [interestMessage, setInterestMessage] = useState("");

  const isFavorite = id ? favoriteIds.includes(id) : false;

  // Incrementar vistas solo una vez cuando se carga la propiedad
  useEffect(() => {
    if (id && property && !viewIncrementedRef.current) {
      viewIncrementedRef.current = true;
      incrementViews.mutate(id);
    }
  }, [id, property, incrementViews]);

  // Get images (definir antes de los useEffects que lo usan)
  const images = property?.property_images || [];

  // Efecto para el carrusel automático del tour 360°
  useEffect(() => {
    if (tour360DialogOpen && tour360Playing && images.length > 1) {
      tour360IntervalRef.current = setInterval(() => {
        setTour360Index((prev) => (prev + 1) % images.length);
      }, 3000); // Cambiar imagen cada 3 segundos
    } else {
      if (tour360IntervalRef.current) {
        clearInterval(tour360IntervalRef.current);
        tour360IntervalRef.current = null;
      }
    }

    return () => {
      if (tour360IntervalRef.current) {
        clearInterval(tour360IntervalRef.current);
      }
    };
  }, [tour360DialogOpen, tour360Playing, images.length]);

  // Resetear índice cuando se abre el modal
  useEffect(() => {
    if (tour360DialogOpen) {
      setTour360Index(0);
      setTour360Playing(true);
    }
  }, [tour360DialogOpen]);

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

  const handleFavoriteClick = () => {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    if (id) {
      toggleFavorite.mutate({ propertyId: id, isFavorite });
    }
  };

  const handleInterestClick = () => {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setInterestDialogOpen(true);
  };

  const handleSendMessage = () => {
    if (!interestMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Mensaje requerido",
        description: "Por favor escribe un mensaje antes de enviar.",
      });
      return;
    }

    // MVP: Solo mostrar confirmación, no guardar en BD aún
    toast({
      title: "¡Mensaje enviado!",
      description: "Tu interés ha sido registrado. El publicador se pondrá en contacto contigo pronto.",
    });
    setInterestMessage("");
    setMessageDialogOpen(false);
    setInterestDialogOpen(false);

    // Mostrar modal de review si el usuario no tiene una review previa
    if (user && !userReview) {
      setTimeout(() => {
        setShowReviewModal(true);
      }, 1000); // Pequeño delay para que el usuario vea el toast primero
    }
  };

  const handleShowContact = () => {
    setInterestDialogOpen(false);
    setContactDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-16">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Cargando propiedad...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not found state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Home className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-4">
                Propiedad no encontrada
              </h1>
              <p className="text-muted-foreground mb-8">
                La propiedad que buscas no existe o ha sido eliminada.
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

  // Get images (ya definido arriba)
  const primaryImage = images.find((img) => img.is_primary) || images[0];
  const currentImage = images[selectedImageIndex] || primaryImage;
  const defaultImage = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
                {/* Skeleton placeholder */}
                <div
                  className={cn(
                    "absolute inset-0 bg-muted animate-pulse",
                    mainImageLoaded && "hidden"
                  )}
                />
                {currentImage ? (
                  <img
                    src={currentImage.url}
                    alt={property.title}
                    loading="eager"
                    decoding="async"
                    className={cn(
                      "w-full h-full object-cover transition-opacity duration-300",
                      !mainImageLoaded && "opacity-0"
                    )}
                    onLoad={() => setMainImageLoaded(true)}
                  />
                ) : (
                  <img
                    src={defaultImage}
                    alt={property.title}
                    loading="eager"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-white/90 text-foreground font-semibold shadow-md">
                    {formatPropertyType(property.property_type)}
                  </Badge>
                  {property.is_featured && (
                    <Badge className="bg-primary text-primary-foreground font-semibold shadow-md">
                      Destacado
                    </Badge>
                  )}
                </div>

                {/* Favorite Button */}
                <button
                  onClick={handleFavoriteClick}
                  disabled={toggleFavorite.isPending}
                  className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-transform disabled:opacity-50"
                >
                  <Heart
                    className={cn(
                      "w-6 h-6 transition-colors",
                      isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"
                    )}
                  />
                </button>

                {/* Tour 360° Button */}
                {images.length > 0 && (
                  <button
                    onClick={() => setTour360DialogOpen(true)}
                    className="absolute bottom-4 right-4 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm flex items-center gap-2 shadow-md hover:bg-white transition-colors text-sm font-medium text-foreground"
                  >
                    <Maximize2 className="w-4 h-4" />
                    Ver recorrido 360°
                  </button>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => {
                        setMainImageLoaded(false);
                        setSelectedImageIndex(index);
                      }}
                      className={cn(
                        "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                        selectedImageIndex === index
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-muted-foreground/30"
                      )}
                    >
                      <img
                        src={image.url}
                        alt={`${property.title} - ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* No images placeholder */}
              {images.length === 0 && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <ImageOff className="w-4 h-4" />
                  <span>Esta propiedad no tiene imágenes adicionales</span>
                </div>
              )}

              {/* Mapa de Ubicación */}
              <PropertyMap
                propertyId={property.id}
                latitude={property.latitude}
                longitude={property.longitude}
                address={property.address}
                city={property.city}
                municipio={property.municipio}
                neighborhood={property.neighborhood}
                departamento={property.departamento}
              />
            </div>

            {/* Right: Info */}
            <div className="space-y-6">
              {/* Price */}
              <div>
                <p className="text-3xl md:text-4xl font-bold text-primary font-display">
                  {formatPrice(property.price)}
                  <span className="text-lg font-normal text-muted-foreground font-sans">/mes</span>
                </p>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                  {property.title}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <span>
                    {property.neighborhood && `${property.neighborhood}, `}
                    {property.municipio && property.municipio !== property.city ? `${property.municipio}, ` : ""}
                    {property.city}
                    {property.address && ` - ${property.address}`}
                  </span>
                </div>
              </div>

              {/* Información Principal */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Información Principal</h2>
                <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Home className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="font-semibold text-foreground">{formatPropertyType(property.property_type)}</p>
                    </div>
                  </div>
                  {property.area && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                        <Square className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Área</p>
                        <p className="font-semibold text-foreground">{property.area} m²</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <BedDouble className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Habitaciones</p>
                      <p className="font-semibold text-foreground">{property.bedrooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Bath className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Baños</p>
                      <p className="font-semibold text-foreground">{property.bathrooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Parqueadero</p>
                      <p className="font-semibold text-foreground">
                        {property.tiene_parqueadero
                          ? property.cantidad_parqueaderos
                            ? `${property.cantidad_parqueaderos} ${property.cantidad_parqueaderos === 1 ? "vehículo" : "vehículos"}`
                            : "Sí"
                          : "No"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              {(property.departamento || property.municipio || property.neighborhood) && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">Ubicación</h2>
                  <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                    {property.departamento && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Departamento:</span>
                        <span className="font-medium text-foreground">{property.departamento}</span>
                      </div>
                    )}
                    {property.municipio && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Municipio:</span>
                        <span className="font-medium text-foreground">{property.municipio}</span>
                      </div>
                    )}
                    {property.neighborhood && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Barrio:</span>
                        <span className="font-medium text-foreground">{property.neighborhood}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Costos y Condiciones */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Costos y Condiciones</h2>
                <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Precio mensual:</span>
                    <span className="font-semibold text-foreground">{formatPrice(property.price)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Administración:</span>
                    <span className="font-semibold text-foreground">
                      {property.incluye_administracion ? (
                        <span className="text-primary">Incluida</span>
                      ) : property.valor_administracion ? (
                        formatPrice(property.valor_administracion)
                      ) : (
                        "No incluida"
                      )}
                    </span>
                  </div>
                  {property.estrato && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Estrato:</span>
                      <Badge variant="outline" className="font-semibold">
                        <Layers className="w-3 h-3 mr-1" />
                        {property.estrato}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {property.description && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-3">Descripción</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {property.description}
                  </p>
                </div>
              )}

              {/* Características del Inmueble */}
              {property.caracteristicas && property.caracteristicas.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">Características del Inmueble</h2>
                  <div className="flex flex-wrap gap-2">
                    {property.caracteristicas.map((feature, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="px-3 py-1.5 text-sm font-medium"
                      >
                        <CheckCircle className="w-3 h-3 mr-1.5 text-primary" />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Publisher Information - Mejorado y más visible */}
              {property.profiles && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Publicado por:</h2>
                    <Badge
                      variant={property.profiles.publisher_type === "inmobiliaria" ? "default" : "secondary"}
                      className={cn(
                        property.profiles.publisher_type === "inmobiliaria" && "bg-primary/10 text-primary border-primary/20"
                      )}
                    >
                      {property.profiles.publisher_type === "inmobiliaria" ? (
                        <>
                          <Building2 className="w-3 h-3 mr-1" />
                          Inmobiliaria
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 mr-1" />
                          Propietario directo
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    {/* Logo o Avatar */}
                    {property.profiles.publisher_type === "inmobiliaria" && property.profiles.company_logo ? (
                      <img
                        src={property.profiles.company_logo}
                        alt={property.profiles.company_name || "Inmobiliaria"}
                        className="w-16 h-16 rounded-lg object-cover border border-border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        {property.profiles.publisher_type === "inmobiliaria" ? (
                          <Building2 className="w-8 h-8 text-primary" />
                        ) : (
                          <User className="w-8 h-8 text-primary" />
                        )}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-grow">
                      <p className="font-semibold text-foreground mb-1">
                        {property.profiles.publisher_type === "inmobiliaria"
                          ? property.profiles.company_name || "Inmobiliaria"
                          : property.profiles.full_name || property.profiles.email?.split("@")[0] || "Usuario"}
                      </p>
                      {property.profiles.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {property.profiles.phone}
                        </p>
                      )}
                    </div>

                    {/* Link to publisher profile */}
                    <Link to={`/publicador/${property.owner_id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Ver más inmuebles
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleInterestClick}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Estoy interesado
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleFavoriteClick}
                  disabled={toggleFavorite.isPending}
                  variant={isFavorite ? "outline" : "default"}
                >
                  <Heart
                    className={cn(
                      "w-5 h-5 mr-2",
                      isFavorite && "fill-current"
                    )}
                  />
                  {isFavorite ? "Guardado" : "Favoritos"}
                </Button>
              </div>

              {/* Login prompt for non-authenticated users */}
              {!user && (
                <p className="text-sm text-muted-foreground text-center">
                  <Link to="/auth" className="text-primary hover:underline font-medium">
                    Inicia sesión
                  </Link>{" "}
                  para guardar esta propiedad en tus favoritos o mostrar interés.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Estoy Interesado */}
      <Dialog open={interestDialogOpen} onOpenChange={setInterestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estoy interesado</DialogTitle>
            <DialogDescription>
              ¿Cómo te gustaría contactar al publicador?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => {
                setInterestDialogOpen(false);
                setMessageDialogOpen(true);
              }}
            >
              <MessageCircle className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Enviar mensaje de interés</p>
                <p className="text-xs text-muted-foreground">Deja un mensaje para el publicador</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={handleShowContact}
            >
              <Phone className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Ver información de contacto</p>
                <p className="text-xs text-muted-foreground">Teléfono y email del publicador</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Enviar Mensaje */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar mensaje de interés</DialogTitle>
            <DialogDescription>
              Escribe un mensaje para el publicador de esta propiedad.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="Hola, estoy interesado en esta propiedad..."
                value={interestMessage}
                onChange={(e) => setInterestMessage(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendMessage}>
              Enviar mensaje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Información de Contacto */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Información de contacto</DialogTitle>
            <DialogDescription>
              Datos de contacto del publicador
            </DialogDescription>
          </DialogHeader>
          {property.profiles && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {property.profiles.publisher_type === "inmobiliaria" && property.profiles.company_logo ? (
                  <img
                    src={property.profiles.company_logo}
                    alt={property.profiles.company_name || "Inmobiliaria"}
                    className="w-16 h-16 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    {property.profiles.publisher_type === "inmobiliaria" ? (
                      <Building2 className="w-8 h-8 text-primary" />
                    ) : (
                      <User className="w-8 h-8 text-primary" />
                    )}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">
                    {property.profiles.publisher_type === "inmobiliaria"
                      ? property.profiles.company_name || "Inmobiliaria"
                      : property.profiles.full_name || "Propietario"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {property.profiles.publisher_type === "inmobiliaria" ? "Inmobiliaria" : "Propietario"}
                  </p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-border">
                {property.profiles.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <a
                        href={`tel:${property.profiles.phone}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {property.profiles.phone}
                      </a>
                    </div>
                  </div>
                )}
                {property.profiles.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${property.profiles.email}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {property.profiles.email}
                      </a>
                    </div>
                  </div>
                )}
                {!property.profiles.phone && !property.profiles.email && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    El publicador no ha compartido información de contacto.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setContactDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Tour 360° Fullscreen */}
      <Dialog open={tour360DialogOpen} onOpenChange={setTour360DialogOpen}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen m-0 p-0 rounded-none border-0 bg-black [&>button]:hidden">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Imagen principal - tamaño mejorado */}
            {images.length > 0 && (
              <img
                src={images[tour360Index]?.url || defaultImage}
                alt={`${property.title} - Vista ${tour360Index + 1}`}
                className="max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain"
              />
            )}

            {/* Controles superiores */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 backdrop-blur-sm text-white border border-white/20">
                <span className="text-sm font-medium">
                  {tour360Index + 1} / {images.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {images.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTour360Playing(!tour360Playing)}
                    className="bg-black/70 backdrop-blur-sm text-white hover:bg-black/90 border border-white/20"
                    title={tour360Playing ? "Pausar" : "Reproducir"}
                  >
                    {tour360Playing ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTour360DialogOpen(false)}
                  className="bg-black/70 backdrop-blur-sm text-white hover:bg-red-600/80 border border-white/20"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Botón de cerrar más visible en la parte inferior */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
              <Button
                onClick={() => setTour360DialogOpen(false)}
                className="bg-black/70 backdrop-blur-sm text-white hover:bg-black/90 border border-white/20 px-6 py-2"
              >
                <X className="w-4 h-4 mr-2" />
                Cerrar
              </Button>
            </div>

            {/* Navegación manual */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setTour360Index((prev) => (prev - 1 + images.length) % images.length);
                    setTour360Playing(false);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-sm text-white hover:bg-black/90 border border-white/20 z-10"
                  title="Imagen anterior"
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setTour360Index((prev) => (prev + 1) % images.length);
                    setTour360Playing(false);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-sm text-white hover:bg-black/90 border border-white/20 z-10"
                  title="Siguiente imagen"
                >
                  <ArrowLeft className="w-6 h-6 rotate-180" />
                </Button>
              </>
            )}

            {/* Indicadores de imágenes */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setTour360Index(index);
                      setTour360Playing(false);
                    }}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      index === tour360Index
                        ? "bg-white w-8"
                        : "bg-white/50 hover:bg-white/75 w-2"
                    )}
                    title={`Vista ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Review */}
      {user && <ReviewModal open={showReviewModal} onOpenChange={setShowReviewModal} />}

      <Footer />
    </div>
  );
};

export default PropertyDetail;
