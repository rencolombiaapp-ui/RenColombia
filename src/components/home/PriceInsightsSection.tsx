import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, MapPin, Building2 } from "lucide-react";
import { PriceInsightsCard } from "@/components/price-insights/PriceInsightsCard";
import { usePriceInsights } from "@/hooks/use-price-insights";
import { PriceInsightParams } from "@/services/priceInsightsService";
import colombiaData from "@/data/colombia-departments.json";

const PROPERTY_TYPES = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "apartaestudio", label: "Apartaestudio" },
  { value: "local", label: "Local" },
  { value: "loft", label: "Loft" },
  { value: "penthouse", label: "Penthouse" },
] as const;

const PriceInsightsSection = () => {
  const [departamento, setDepartamento] = useState<string>("");
  const [municipio, setMunicipio] = useState<string>("");
  const [propertyType, setPropertyType] = useState<string>("apartamento");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [availableMunicipalities, setAvailableMunicipalities] = useState<string[]>([]);

  // Cargar municipios cuando cambia el departamento
  useEffect(() => {
    if (departamento) {
      const department = colombiaData.departments?.find(
        (d) => d.name === departamento
      );
      if (department) {
        setAvailableMunicipalities(department.municipalities || []);
        // Limpiar municipio si no está en la lista
        if (municipio && !department.municipalities?.includes(municipio)) {
          setMunicipio("");
        }
      } else {
        setAvailableMunicipalities([]);
      }
    } else {
      setAvailableMunicipalities([]);
      setMunicipio("");
    }
  }, [departamento, municipio]);

  // Usar municipio como ciudad para el análisis
  const city = municipio;

  const params: PriceInsightParams | null =
    city && propertyType
      ? {
          city,
          neighborhood: neighborhood || undefined,
          property_type: propertyType,
        }
      : null;

  const { data: insights, isLoading } = usePriceInsights(params);

  return (
    <section id="precio-zona" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-semibold">Análisis de Precios</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Conoce el precio de arriendo en tu zona
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Obtén insights precisos sobre los precios de arriendo basados en datos reales de
              RenColombia. Compara y toma decisiones informadas.
            </p>
          </div>

          {/* Formulario de búsqueda */}
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Departamento */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Departamento
                </label>
                <Select value={departamento} onValueChange={setDepartamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {colombiaData.departments?.map((dept) => (
                      <SelectItem key={dept.name} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Municipio */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Municipio
                </label>
                <Select 
                  value={municipio} 
                  onValueChange={setMunicipio}
                  disabled={!departamento || availableMunicipalities.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un municipio" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMunicipalities.map((municipioName) => (
                      <SelectItem key={municipioName} value={municipioName}>
                        {municipioName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Inmueble */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Tipo de Inmueble
                </label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Barrio (Opcional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Barrio (Opcional)
                </label>
                <Input
                  placeholder="Ej: Poblado, Chapinero..."
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Resultados */}
          {city && propertyType && (
            <PriceInsightsCard
              insights={insights || null}
              isLoading={isLoading}
              city={city}
              neighborhood={neighborhood}
              propertyType={propertyType}
              showTeaser={true}
            />
          )}

          {/* Mensaje inicial */}
          {!city && (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Selecciona departamento, municipio y tipo de inmueble
              </h3>
              <p className="text-muted-foreground">
                Comienza seleccionando el departamento, luego el municipio y el tipo de inmueble para ver el análisis de
                precios
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PriceInsightsSection;
