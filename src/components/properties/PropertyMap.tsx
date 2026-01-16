import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Fix para iconos de Leaflet en React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface PropertyMapProps {
  propertyId: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  municipio: string | null;
  neighborhood: string | null;
  departamento: string | null;
  className?: string;
}

const PropertyMap = ({
  propertyId,
  latitude: initialLatitude,
  longitude: initialLongitude,
  address,
  city,
  municipio,
  neighborhood,
  departamento,
  className,
}: PropertyMapProps) => {
  const [latitude, setLatitude] = useState<number | null>(initialLatitude);
  const [longitude, setLongitude] = useState<number | null>(initialLongitude);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Función para validar si las coordenadas guardadas son correctas
  const validateCoordinates = async (lat: number, lon: number): Promise<boolean> => {
    try {
      // Hacer reverse geocoding para verificar la ubicación
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        {
          headers: {
            "User-Agent": "RenColombia/1.0",
          },
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (!data || !data.address) {
        return false;
      }

      const address = data.address;
      const foundCity = address.city || address.town || address.municipality || address.county || "";
      const foundState = address.state || "";

      // Normalizar nombres para comparación (sin tildes, minúsculas)
      const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Verificar si coincide con municipio o ciudad
      if (municipio) {
        const municipioNormalized = normalize(municipio);
        const foundCityNormalized = normalize(foundCity);
        const foundStateNormalized = normalize(foundState);
        
        // Verificar si el municipio coincide con la ciudad encontrada o el estado
        if (foundCityNormalized.includes(municipioNormalized) || municipioNormalized.includes(foundCityNormalized) || foundStateNormalized.includes(municipioNormalized)) {
          return true;
        }
      } else if (city) {
        const cityNormalized = normalize(city);
        const foundCityNormalized = normalize(foundCity);
        const foundStateNormalized = normalize(foundState);
        
        if (foundCityNormalized.includes(cityNormalized) || cityNormalized.includes(foundCityNormalized) || foundStateNormalized.includes(cityNormalized)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error validando coordenadas:", error);
      return false;
    }
  };

  // Función para geocodificar usando Nominatim (OpenStreetMap)
  const geocodeAddress = async (force = false) => {
    // Si ya tenemos coordenadas y no se fuerza, validarlas primero
    if (latitude && longitude && !force) {
      const isValid = await validateCoordinates(latitude, longitude);
      if (isValid) {
        return; // Las coordenadas son válidas
      }
      // Si no son válidas, continuar con la geocodificación
      console.log("Coordenadas guardadas no coinciden con la ubicación, re-geocodificando...");
    }

    setIsGeocoding(true);
    setGeocodeError(false);

    try {
      // Construir la dirección para geocodificación de manera más específica
      const addressParts: string[] = [];
      
      // Si hay dirección, usar parte de ella (sin número exacto)
      if (address) {
        // Remover números y caracteres especiales, mantener solo texto descriptivo
        const addressClean = address
          .replace(/\d+/g, "")
          .replace(/[#-]/g, "")
          .trim();
        if (addressClean.length > 3) {
          addressParts.push(addressClean);
        }
      }
      
      // Priorizar barrio si existe
      if (neighborhood) {
        addressParts.push(neighborhood);
      }
      
      // Agregar municipio (prioritario) o ciudad
      if (municipio) {
        addressParts.push(municipio);
      } else if (city) {
        addressParts.push(city);
      }
      
      // Agregar departamento si está disponible (para mayor precisión)
      if (departamento) {
        addressParts.push(departamento);
      }
      
      // Agregar país
      addressParts.push("Colombia");

      const query = addressParts.filter(Boolean).join(", ");

      if (!query || query === "Colombia") {
        setGeocodeError(true);
        setIsGeocoding(false);
        return;
      }

      console.log("Geocodificando:", query);

      // Llamar a Nominatim API con parámetros más específicos
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=co&addressdetails=1`,
        {
          headers: {
            "User-Agent": "RenColombia/1.0", // Requerido por Nominatim
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error en geocodificación");
      }

      const data = await response.json();

      if (data && data.length > 0) {
        // Buscar el resultado que mejor coincida con el municipio/ciudad
        let bestMatch = data[0];
        
        if (municipio || city) {
          const targetCity = municipio || city || "";
          const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const targetNormalized = normalize(targetCity);
          
          for (const result of data) {
            const address = result.address || {};
            const foundCity = address.city || address.town || address.municipality || address.county || "";
            const foundCityNormalized = normalize(foundCity);
            
            if (foundCityNormalized.includes(targetNormalized) || targetNormalized.includes(foundCityNormalized)) {
              bestMatch = result;
              break;
            }
          }
        }

        const lat = parseFloat(bestMatch.lat);
        const lon = parseFloat(bestMatch.lon);

        setLatitude(lat);
        setLongitude(lon);

        // Guardar coordenadas en la base de datos
        const { error } = await supabase
          .from("properties")
          .update({
            latitude: lat,
            longitude: lon,
          })
          .eq("id", propertyId);

        if (error) {
          console.error("Error guardando coordenadas:", error);
        }
      } else {
        setGeocodeError(true);
      }
    } catch (error) {
      console.error("Error en geocodificación:", error);
      setGeocodeError(true);
    } finally {
      setIsGeocoding(false);
    }
  };

  useEffect(() => {
    // Si no hay coordenadas, geocodificar
    // Si hay coordenadas, validarlas y re-geocodificar si son incorrectas
    if (!latitude || !longitude) {
      geocodeAddress();
    } else {
      // Validar coordenadas existentes
      validateCoordinates(latitude, longitude).then((isValid) => {
        if (!isValid) {
          // Forzar re-geocodificación si las coordenadas no son válidas
          geocodeAddress(true);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si no hay coordenadas y hay error o no se puede geocodificar
  if (geocodeError || (!latitude && !longitude && !isGeocoding && (!address && !city && !municipio))) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Ubicación</h2>
        </div>
        <div className="h-[350px] bg-muted/50 rounded-xl flex items-center justify-center border border-border">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">La ubicación de este inmueble no está disponible.</p>
          </div>
        </div>
      </div>
    );
  }

  // Si está geocodificando
  if (isGeocoding || (!latitude || !longitude)) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Ubicación</h2>
        </div>
        <div className="h-[350px] bg-muted/50 rounded-xl flex items-center justify-center border border-border">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Cargando ubicación...</p>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar mapa
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Ubicación aproximada del inmueble</h2>
      </div>
      <div className="h-[350px] rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={[latitude, longitude]}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[latitude, longitude]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Ubicación aproximada</p>
                {municipio && <p>{municipio}</p>}
                {city && municipio !== city && <p>{city}</p>}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default PropertyMap;
