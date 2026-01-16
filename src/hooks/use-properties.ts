import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeText } from "@/lib/utils";
import type { PropertyWithImages } from "@/integrations/supabase/types";

interface UsePropertiesOptions {
  featured?: boolean;
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  publisherType?: string;
  hasParking?: boolean;
  estrato?: number;
  feature?: string;
  selectedFeatures?: string[];
  limit?: number;
}

export function useProperties(options: UsePropertiesOptions = {}) {
  return useQuery({
    queryKey: ["properties", options],
    queryFn: async () => {
      let query = supabase
        .from("properties")
        .select(`
          *,
          property_images (*),
          profiles (*)
        `)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      // Filtros opcionales (excepto ciudad que se filtra localmente para normalización de tildes)
      if (options.featured) {
        query = query.eq("is_featured", true);
      }
      // NO filtrar por ciudad aquí, se hará localmente para soportar búsqueda sin tildes
      if (options.propertyType && options.propertyType !== "all") {
        query = query.eq("property_type", options.propertyType);
      }
      if (options.minPrice) {
        query = query.gte("price", options.minPrice);
      }
      if (options.maxPrice) {
        query = query.lte("price", options.maxPrice);
      }
      if (options.bedrooms) {
        query = query.gte("bedrooms", options.bedrooms);
      }
      if (options.limit && !options.city) {
        // Solo aplicar limit si no hay filtro de ciudad (para que el filtrado local tenga todos los datos)
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching properties:", error);
        return [];
      }

      let filteredData = (data || []) as PropertyWithImages[];

      // Filtrar por ciudad localmente con normalización de tildes
      if (options.city) {
        const normalizedCity = normalizeText(options.city);
        filteredData = filteredData.filter((p) =>
          normalizeText(p.city).includes(normalizedCity)
        );
      }

      // Filtrar por características si se especifican
      if (options.selectedFeatures && options.selectedFeatures.length > 0) {
        filteredData = filteredData.filter((property) => {
          if (!property.caracteristicas || property.caracteristicas.length === 0) {
            return false;
          }
          // Verificar que todas las características seleccionadas estén presentes
          return options.selectedFeatures!.every((feature) =>
            property.caracteristicas!.some((propFeature) =>
              normalizeText(propFeature).includes(normalizeText(feature))
            )
          );
        });
      }

      // Ordenar: destacados primero, luego por fecha de creación
      filteredData.sort((a, b) => {
        // Primero ordenar por is_featured (destacados primero)
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        // Si ambos tienen el mismo estado de destacado, ordenar por fecha
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Aplicar limit después del filtrado local si hay filtro de ciudad
      if (options.limit && options.city) {
        filteredData = filteredData.slice(0, options.limit);
      }

      return filteredData;
    },
  });
}

export function useFeaturedProperties() {
  return useProperties({ featured: true, limit: 6 });
}

// Hook para contar el total de propiedades publicadas
export function usePropertiesCount() {
  return useQuery({
    queryKey: ["properties-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("status", "published");

      if (error) {
        console.error("Error counting properties:", error);
        return 0;
      }

      return count || 0;
    },
  });
}

// Hook para obtener una propiedad por ID
export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          property_images (*),
          profiles (*)
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching property:", error);
        return null;
      }

      return data as PropertyWithImages;
    },
    enabled: !!id,
  });
}

// Hook para obtener propiedades de un publicador específico
export function usePublisherProperties(publisherId: string | undefined) {
  return useQuery({
    queryKey: ["publisher-properties", publisherId],
    queryFn: async () => {
      if (!publisherId) return [];

      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          property_images (*),
          profiles (*)
        `)
        .eq("owner_id", publisherId)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching publisher properties:", error);
        return [];
      }

      return (data || []) as PropertyWithImages[];
    },
    enabled: !!publisherId,
  });
}
