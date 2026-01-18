import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Home, Building2, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePropertiesCount } from "@/hooks/use-properties";
import { cityHeroImages, detectCityInText, defaultHeroImage, type CityHeroImage } from "@/data/city-hero-images";

const propertyTypes = [
  { id: "all", label: "Todos", icon: Home },
  { id: "apartamento", label: "Apartamentos", icon: Building2 },
  { id: "casa", label: "Casas", icon: Home },
  { id: "local", label: "Locales", icon: Warehouse },
];

interface HeroSectionProps {
  backgroundImage: string;
}

const HeroSection = ({ backgroundImage }: HeroSectionProps) => {
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentImage, setCurrentImage] = useState<CityHeroImage>(defaultHeroImage);
  const [nextImage, setNextImage] = useState<CityHeroImage | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentImageLoaded, setCurrentImageLoaded] = useState(false);
  const [nextImageLoaded, setNextImageLoaded] = useState(false);
  const navigate = useNavigate();
  const { data: propertiesCount = 0 } = usePropertiesCount();
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadedImagesRef = useRef<Set<string>>(new Set());

  // Detectar ciudad en el texto de búsqueda y cambiar imagen
  useEffect(() => {
    if (searchQuery.trim()) {
      const detectedCity = detectCityInText(searchQuery);
      if (detectedCity && detectedCity.city !== currentImage.city) {
        // Detener rotación automática cuando hay una ciudad seleccionada
        if (rotationIntervalRef.current) {
          clearInterval(rotationIntervalRef.current);
          rotationIntervalRef.current = null;
        }
        changeImage(detectedCity);
      }
    } else {
      // Si no hay texto, reiniciar rotación automática
      startAutoRotation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Preload de todas las imágenes para mejor rendimiento
  useEffect(() => {
    cityHeroImages.forEach((cityImage) => {
      if (!preloadedImagesRef.current.has(cityImage.imageUrl)) {
        const img = new Image();
        img.src = cityImage.imageUrl;
        preloadedImagesRef.current.add(cityImage.imageUrl);
      }
    });
  }, []);

  // Cargar imagen actual al cambiar
  useEffect(() => {
    setCurrentImageLoaded(false);
    const img = new Image();
    img.onload = () => setCurrentImageLoaded(true);
    img.src = currentImage.imageUrl;
  }, [currentImage]);

  // Preload imagen siguiente cuando hay transición
  useEffect(() => {
    if (nextImage) {
      setNextImageLoaded(false);
      const img = new Image();
      img.onload = () => setNextImageLoaded(true);
      img.src = nextImage.imageUrl;
    }
  }, [nextImage]);

  // Rotación automática inicial cuando no hay ciudad seleccionada
  useEffect(() => {
    // Iniciar rotación automática al cargar si no hay búsqueda
    if (!searchQuery.trim()) {
      startAutoRotation();
    }
    
    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeImage = (newImage: CityHeroImage) => {
    if (newImage.city === currentImage.city) return;
    
    setIsTransitioning(true);
    setNextImage(newImage);
    
    // Después de la transición fade-out, cambiar la imagen actual
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentImage(newImage);
      setNextImage(null);
      setIsTransitioning(false);
    }, 500); // Duración de la transición fade
  };

  const startAutoRotation = () => {
    // Limpiar intervalo anterior si existe
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
    }
    
    let currentIndex = cityHeroImages.findIndex(img => img.city === currentImage.city);
    if (currentIndex === -1) currentIndex = 0;
    
    // Rotar cada 6 segundos (entre 5-7 segundos como se solicitó)
    rotationIntervalRef.current = setInterval(() => {
      const nextIndex = (currentIndex + 1) % cityHeroImages.length;
      changeImage(cityHeroImages[nextIndex]);
      currentIndex = nextIndex;
    }, 6000);
  };

  const handleSearch = (query?: string) => {
    const searchText = query || searchQuery;
    const params = new URLSearchParams();
    if (searchText) params.set("q", searchText);
    if (selectedType !== "all") params.set("type", selectedType);
    navigate(`/buscar${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleCityClick = (city: string) => {
    // Detener rotación automática
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
      rotationIntervalRef.current = null;
    }
    handleSearch(city);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Fade Transition */}
      <div className="absolute inset-0">
        {/* Skeleton placeholder mientras carga */}
        {!currentImageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse" />
        )}
        
        {/* Imagen actual */}
        <img
          key={currentImage.city}
          src={currentImage.imageUrl}
          alt={currentImage.alt}
          loading="eager"
          decoding="async"
          className={cn(
            "w-full h-full object-cover transition-opacity duration-700 ease-in-out will-change-opacity",
            isTransitioning ? "opacity-0" : currentImageLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{
            imageRendering: "high-quality" as any,
            transform: "translateZ(0)",
            backfaceVisibility: "hidden" as any,
            WebkitBackfaceVisibility: "hidden",
          }}
          onLoad={() => setCurrentImageLoaded(true)}
        />
        
        {/* Imagen siguiente (durante transición) */}
        {nextImage && (
          <img
            key={`next-${nextImage.city}`}
            src={nextImage.imageUrl}
            alt={nextImage.alt}
            loading="eager"
            decoding="async"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out will-change-opacity",
              isTransitioning && nextImageLoaded ? "opacity-100" : "opacity-0"
            )}
            style={{
              imageRendering: "high-quality" as any,
              transform: "translateZ(0)",
              backfaceVisibility: "hidden" as any,
              WebkitBackfaceVisibility: "hidden",
            }}
            onLoad={() => setNextImageLoaded(true)}
          />
        )}
        
        {/* Overlay oscuro mejorado con gradiente más suave */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/75" />
        
        {/* Capa adicional para mejorar contraste y saturación */}
        <div 
          className="absolute inset-0 mix-blend-overlay opacity-30"
          style={{
            background: "linear-gradient(135deg, rgba(158, 64, 32, 0.1) 0%, rgba(38, 92, 50, 0.1) 100%)",
          }}
        />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
            <span className="text-white/90 text-sm font-medium">
              {propertiesCount > 0 
                ? `${propertiesCount} ${propertiesCount === 1 ? 'propiedad disponible' : 'propiedades disponibles'} en Colombia`
                : 'Propiedades disponibles en Colombia'}
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-white leading-tight">
            Arrienda inmuebles en Colombia
            <br />
            <span className="text-accent">de forma simple, segura y 100% digital</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            Busca, analiza precios, comunica y genera contratos digitales en un solo lugar.
          </p>

          {/* Search Box */}
          <div className="mt-10 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-4 md:p-6 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
            {/* Property Type Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {propertyTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all",
                    selectedType === type.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <type.icon className="w-4 h-4" />
                  {type.label}
                </button>
              ))}
            </div>

            {/* Search Fields */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Ciudad, barrio o dirección..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 h-12 text-base border-2 border-muted focus:border-primary"
                />
              </div>
              <Button variant="hero" size="xl" className="gap-2 md:px-8" onClick={() => handleSearch()}>
                <Search className="w-5 h-5" />
                <span>Buscar</span>
              </Button>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Populares:</span>
              {["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"].map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityClick(city)}
                  className="text-sm text-primary hover:text-primary/80 font-medium hover:underline"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-4 mt-8 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <Button
              variant="hero"
              size="lg"
              onClick={() => handleSearch("")}
              className="gap-2"
            >
              Buscar inmuebles
            </Button>
            <Button
              variant="heroOutline"
              size="lg"
              onClick={() => navigate("/publicar")}
              className="gap-2"
            >
              Publicar inmueble
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 mt-12 animate-slide-up" style={{ animationDelay: "0.6s" }}>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white font-display">{propertiesCount}</p>
              <p className="text-white/70 text-sm mt-1">Propiedades</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white font-display">100%</p>
              <p className="text-white/70 text-sm mt-1">Digital</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white font-display">Colombia</p>
              <p className="text-white/70 text-sm mt-1">Nativo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-white/70 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
