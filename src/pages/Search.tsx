import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PropertyCard from "@/components/properties/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, SlidersHorizontal, MapPin, X, Grid, List, Loader2, Home, Building2, User, Car, Layers, Sparkles } from "lucide-react";
import { cn, normalizeText } from "@/lib/utils";
import { useProperties } from "@/hooks/use-properties";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [propertyType, setPropertyType] = useState(searchParams.get("type") || "all");
  const [bedrooms, setBedrooms] = useState("any");
  const [bathrooms, setBathrooms] = useState("any");
  const [publisherType, setPublisherType] = useState("all");
  const [hasParking, setHasParking] = useState("all");
  const [estrato, setEstrato] = useState("all");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");

  // Actualizar estado cuando cambian los query params
  useEffect(() => {
    const q = searchParams.get("q");
    const type = searchParams.get("type");
    if (q) setSearchQuery(q);
    if (type) setPropertyType(type);
  }, [searchParams]);

  // Obtener propiedades desde Supabase
  // Nota: Los filtros de publisherType, hasParking, estrato, selectedFeatures y área se aplican localmente
  // porque requieren datos completos (profiles, arrays) que se filtran mejor en el cliente
  const { data: properties, isLoading, error } = useProperties({
    city: searchQuery || undefined,
    propertyType: propertyType !== "all" ? propertyType : undefined,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    bedrooms: bedrooms !== "any" ? parseInt(bedrooms) : undefined,
  });

  // Obtener características únicas de todas las propiedades para el dropdown
  const availableFeatures = useMemo(() => {
    if (!properties || properties.length === 0) {
      return [];
    }
    
    const featuresSet = new Set<string>();
    
    properties.forEach((p) => {
      // Manejar diferentes formatos posibles del campo caracteristicas
      let caracteristicasArray: string[] = [];
      
      if (p.caracteristicas) {
        if (Array.isArray(p.caracteristicas)) {
          caracteristicasArray = p.caracteristicas;
        } else if (typeof p.caracteristicas === 'string') {
          // Si viene como string JSON, intentar parsearlo
          try {
            const parsed = JSON.parse(p.caracteristicas);
            if (Array.isArray(parsed)) {
              caracteristicasArray = parsed;
            }
          } catch (e) {
            // Si no es JSON válido, ignorar
          }
        }
      }
      
      // Agregar características válidas al set
      if (caracteristicasArray.length > 0) {
        caracteristicasArray.forEach((f) => {
          if (f && typeof f === 'string' && f.trim() !== '') {
            featuresSet.add(f.trim());
          }
        });
      }
    });
    
    return Array.from(featuresSet).sort();
  }, [properties]);

  // Filtrar localmente por búsqueda, tipo y baños
  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    
    let filtered = properties;
    
    // Excluir inmuebles bloqueados para contratación (ya filtrados en backend, pero por seguridad)
    filtered = filtered.filter(p => p.status !== "locked_for_contract");
    
    // Filtrar por texto de búsqueda (título, ciudad, barrio) - insensible a tildes
    if (searchQuery) {
      const normalizedQuery = normalizeText(searchQuery);
      filtered = filtered.filter(p => 
        normalizeText(p.title).includes(normalizedQuery) ||
        normalizeText(p.city).includes(normalizedQuery) ||
        (p.neighborhood && normalizeText(p.neighborhood).includes(normalizedQuery))
      );
    }
    
    // Filtrar por tipo de propiedad
    if (propertyType && propertyType !== "all") {
      filtered = filtered.filter(p => p.property_type === propertyType);
    }
    
    // Filtrar por baños
    if (bathrooms !== "any") {
      filtered = filtered.filter(p => p.bathrooms >= parseInt(bathrooms));
    }
    
    // Filtrar por tipo de propietario
    if (publisherType !== "all") {
      filtered = filtered.filter(p => {
        if (publisherType === "inmobiliaria") {
          return p.profiles?.publisher_type === "inmobiliaria";
        } else if (publisherType === "propietario") {
          return p.profiles?.publisher_type === "individual" || !p.profiles?.publisher_type;
        }
        return true;
      });
    }
    
    // Filtrar por parqueadero
    if (hasParking !== "all") {
      filtered = filtered.filter(p => {
        if (hasParking === "yes") {
          return p.tiene_parqueadero === true;
        } else {
          return p.tiene_parqueadero === false || !p.tiene_parqueadero;
        }
      });
    }
    
    // Filtrar por estrato
    if (estrato !== "all") {
      filtered = filtered.filter(p => p.estrato === parseInt(estrato));
    }
    
    // Filtrar por características (múltiples)
    if (selectedFeatures.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.caracteristicas || !Array.isArray(p.caracteristicas)) return false;
        // La propiedad debe tener todas las características seleccionadas
        return selectedFeatures.every(feat => p.caracteristicas.includes(feat));
      });
    }
    
    // Filtrar por área mínima
    if (minArea) {
      const minAreaValue = parseFloat(minArea);
      if (!isNaN(minAreaValue)) {
        filtered = filtered.filter(p => p.area && p.area >= minAreaValue);
      }
    }
    
    // Filtrar por área máxima
    if (maxArea) {
      const maxAreaValue = parseFloat(maxArea);
      if (!isNaN(maxAreaValue)) {
        filtered = filtered.filter(p => p.area && p.area <= maxAreaValue);
      }
    }
    
    return filtered;
  }, [properties, bathrooms, searchQuery, propertyType, publisherType, hasParking, estrato, selectedFeatures, minArea, maxArea]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 md:pt-24">
        {/* Search Header */}
        <div className="bg-card border-b border-border sticky top-16 md:top-20 z-[90]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search Input */}
              <div className="relative flex-1 w-full">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por ciudad, barrio o dirección..."
                  className="pl-10 h-12 text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Toggle */}
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 w-full md:w-auto"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
              </Button>

              {/* View Mode Toggle */}
              <div className="hidden md:flex items-center gap-1 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === "grid" ? "bg-card shadow-sm" : "hover:bg-card/50"
                  )}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === "list" ? "bg-card shadow-sm" : "hover:bg-card/50"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-border animate-slide-up overflow-visible">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                  {/* Property Type */}
                  <div className="space-y-2">
                    <Label>Tipo de inmueble</Label>
                    <Select value={propertyType} onValueChange={setPropertyType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="apartamento">Apartamento</SelectItem>
                        <SelectItem value="casa">Casa</SelectItem>
                        <SelectItem value="apartaestudio">Apartaestudio</SelectItem>
                        <SelectItem value="local">Local comercial</SelectItem>
                        <SelectItem value="loft">Loft</SelectItem>
                        <SelectItem value="penthouse">Penthouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo de Propietario */}
                  <div className="space-y-2">
                    <Label>Tipo de propietario</Label>
                    <Select value={publisherType} onValueChange={setPublisherType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="propietario">Propietario directo</SelectItem>
                        <SelectItem value="inmobiliaria">Inmobiliaria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Parqueadero */}
                  <div className="space-y-2">
                    <Label>Parqueadero</Label>
                    <Select value={hasParking} onValueChange={setHasParking}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="yes">Con parqueadero</SelectItem>
                        <SelectItem value="no">Sin parqueadero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estrato */}
                  <div className="space-y-2">
                    <Label>Estrato</Label>
                    <Select value={estrato} onValueChange={setEstrato}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            Estrato {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bedrooms */}
                  <div className="flex flex-col">
                    <Label className="block h-5 mb-2">Habitaciones</Label>
                    <div className="h-10">
                      <Select value={bedrooms} onValueChange={setBedrooms}>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Cualquiera" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Cualquiera</SelectItem>
                          <SelectItem value="1">1+</SelectItem>
                          <SelectItem value="2">2+</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Area Range */}
                  <div className="flex flex-col">
                    <Label className="block h-5 mb-2">Área (m²)</Label>
                    <div className="h-10 grid grid-cols-2 gap-2">
                      <Input
                        id="minArea"
                        type="text"
                        placeholder="Desde"
                        value={minArea}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setMinArea(value);
                        }}
                        className="h-10 w-full"
                      />
                      <Input
                        id="maxArea"
                        type="text"
                        placeholder="Hasta"
                        value={maxArea}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setMaxArea(value);
                        }}
                        className="h-10 w-full"
                      />
                    </div>
                  </div>

                  {/* Bathrooms */}
                  <div className="flex flex-col">
                    <Label className="block h-5 mb-2">Baños</Label>
                    <div className="h-10">
                      <Select value={bathrooms} onValueChange={setBathrooms}>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Cualquiera" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Cualquiera</SelectItem>
                          <SelectItem value="1">1+</SelectItem>
                          <SelectItem value="2">2+</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="flex flex-col">
                    <Label className="block h-5 mb-2">Precio</Label>
                    <div className="h-10 grid grid-cols-2 gap-2">
                      <Input
                        id="minPrice"
                        type="text"
                        placeholder="Desde"
                        value={minPrice}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setMinPrice(value);
                        }}
                        className="h-10 w-full"
                      />
                      <Input
                        id="maxPrice"
                        type="text"
                        placeholder="Hasta"
                        value={maxPrice}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setMaxPrice(value);
                        }}
                        className="h-10 w-full"
                      />
                    </div>
                  </div>

                  {/* Características */}
                  <div className="space-y-2 col-span-full">
                    <Label>Características</Label>
                    {availableFeatures.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto border border-border rounded-md p-2 space-y-2">
                        {availableFeatures.map((feat) => {
                          const isChecked = selectedFeatures.includes(feat);
                          return (
                            <div key={feat} className="flex items-center space-x-2">
                              <Checkbox
                                id={`feature-${feat}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFeatures((prev) => [...prev, feat]);
                                  } else {
                                    setSelectedFeatures((prev) => prev.filter((f) => f !== feat));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`feature-${feat}`}
                                className="text-sm font-medium leading-none cursor-pointer flex-1"
                              >
                                {feat}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Las características aparecerán aquí cuando se publiquen propiedades con características.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="ghost" onClick={() => {
                    setPropertyType("all");
                    setBedrooms("any");
                    setBathrooms("any");
                    setPublisherType("all");
                    setHasParking("all");
                    setEstrato("all");
                    setMinPrice("");
                    setMaxPrice("");
                    setMinArea("");
                    setMaxArea("");
                    setSelectedFeatures([]);
                    setSearchQuery("");
                  }}>
                    Limpiar
                  </Button>
                  <Button variant="default" onClick={() => setShowFilters(false)}>
                    Aplicar filtros
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="container mx-auto px-4 py-8">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Inmuebles disponibles
              </h1>
              <p className="text-muted-foreground">
                {isLoading ? "Cargando..." : `${filteredProperties.length} propiedades encontradas`}
              </p>
            </div>

            <Select defaultValue="recent">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Más recientes</SelectItem>
                <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
                <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Cargando propiedades...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Error al cargar</h3>
              <p className="text-muted-foreground mb-4">No pudimos cargar las propiedades. Intenta de nuevo.</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredProperties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Home className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No encontramos propiedades</h3>
              <p className="text-muted-foreground mb-4">Intenta ajustar los filtros de búsqueda.</p>
              <Button variant="outline" onClick={() => {
                setPropertyType("all");
                setBedrooms("any");
                setBathrooms("any");
                setPublisherType("all");
                setHasParking("all");
                setEstrato("all");
                setSelectedFeatures([]);
                setMinPrice("");
                setMaxPrice("");
                setMinArea("");
                setMaxArea("");
                setSearchQuery("");
              }}>
                Limpiar filtros
              </Button>
            </div>
          )}

          {/* Properties Grid */}
          {!isLoading && !error && filteredProperties.length > 0 && (
          <div
            className={cn(
              "grid gap-6",
              viewMode === "grid"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            )}
          >
              {filteredProperties.map((property) => {
                const primaryImage = property.property_images?.find(img => img.is_primary) || property.property_images?.[0];
                return (
              <Link key={property.id} to={`/inmueble/${property.id}`}>
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
      </main>

      <Footer />
    </div>
  );
};

export default SearchPage;
