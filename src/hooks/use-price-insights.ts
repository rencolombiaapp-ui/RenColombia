import { useQuery } from "@tanstack/react-query";
import {
  getPriceInsights,
  PriceInsightParams,
  PriceInsightResult,
} from "@/services/priceInsightsService";

/**
 * Hook para obtener insights de precio
 */
export function usePriceInsights(
  params: PriceInsightParams | null,
  comparePrice?: number
) {
  return useQuery({
    queryKey: ["price-insights", params, comparePrice],
    queryFn: async () => {
      if (!params) {
        return null;
      }

      return await getPriceInsights(params, comparePrice);
    },
    enabled: !!params && !!params.city && !!params.property_type,
    staleTime: 10 * 60 * 1000, // Cache por 10 minutos
    retry: 1, // Solo reintentar una vez en caso de error
  });
}

/**
 * Hook para obtener insights de precio para una propiedad específica
 */
export function usePropertyPriceInsights(
  city: string | null,
  neighborhood: string | null | undefined,
  propertyType: string | null,
  area: number | null | undefined,
  price?: number | null
) {
  const params: PriceInsightParams | null =
    city && propertyType
      ? {
          city,
          neighborhood: neighborhood || undefined,
          property_type: propertyType,
          area: area || undefined,
        }
      : null;

  return usePriceInsights(params, price || undefined);
}
