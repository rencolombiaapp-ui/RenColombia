import { supabase } from "@/integrations/supabase/client";
import {
  validateWithDane,
  getDataSourcesText,
  getDataSourcesAttribution,
  type DaneValidationResult,
} from "./daneService";
import { getMarketStats, type MarketStatsResponse } from "./marketStatsClient";

export interface PriceInsight {
  id: string;
  city: string;
  neighborhood: string | null;
  property_type: string;
  area_min: number | null;
  area_max: number | null;
  average_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  recommended_min: number;
  recommended_max: number;
  sample_size: number;
  calculated_at: string;
  expires_at: string;
  // Campos DANE
  dane_reference_price?: number | null;
  dane_deviation_percentage?: number | null;
  dane_coherence_status?: "coherent" | "slight_deviation" | "significant_deviation" | "no_data" | null;
  dane_data_period?: string | null;
  data_sources?: string[] | null;
}

export interface PriceInsightParams {
  city: string;
  neighborhood?: string;
  property_type: string;
  area?: number; // Área del inmueble para calcular rango ±20%
}

export interface PriceInsightResult {
  average_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  recommended_min: number;
  recommended_max: number;
  sample_size: number;
  price_comparison?: {
    percentage_diff: number; // Diferencia porcentual respecto al precio dado
    status: "below" | "fair" | "above"; // Por debajo, justo, por encima
  };
  // Datos DANE
  dane_validation?: DaneValidationResult;
  data_sources: string[];
  data_sources_attribution: string;
  // Fuente de datos y nivel de análisis
  source?: "own" | "market"; // "own" = datos propios, "market" = fallback de market-stats
  analysis_level?: "city" | "neighborhood" | "area"; // Nivel de análisis (propagado desde market-stats si aplica)
  // Rango recomendado estructurado (cuando viene de market-stats)
  recommended_range?: {
    min: number;
    max: number;
  };
}

/**
 * Calcula el rango de área basado en el área del inmueble (±20%)
 */
function calculateAreaRange(area: number): { min: number; max: number } {
  const margin = area * 0.2;
  return {
    min: Math.max(1, Math.floor(area - margin)),
    max: Math.ceil(area + margin),
  };
}

/**
 * Elimina outliers usando el método IQR (Interquartile Range)
 */
function removeOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices; // Necesitamos al menos 4 valores para calcular IQR

  const sorted = [...prices].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return sorted.filter((price) => price >= lowerBound && price <= upperBound);
}

/**
 * Calcula la mediana de un array de números
 */
function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

/**
 * Obtiene insights desde el cache si están disponibles y no expirados
 */
async function getCachedInsights(
  params: PriceInsightParams
): Promise<PriceInsight | null> {
  try {
    const areaRange = params.area ? calculateAreaRange(params.area) : null;

    let query = supabase
      .from("price_insights")
      .select("*")
      .eq("city", params.city)
      .eq("property_type", params.property_type)
      .gte("expires_at", new Date().toISOString())
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (params.neighborhood) {
      query = query.eq("neighborhood", params.neighborhood);
    } else {
      query = query.is("neighborhood", null);
    }

    if (areaRange) {
      query = query
        .lte("area_min", areaRange.max)
        .gte("area_max", areaRange.min);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return null;
    }

    return data as PriceInsight;
  } catch (error) {
    // Si la tabla no existe aún, retornar null silenciosamente
    console.warn("Error getting cached insights:", error);
    return null;
  }
}

/**
 * Calcula los insights de precio desde los datos reales de propiedades
 */
async function calculatePriceInsights(
  params: PriceInsightParams
): Promise<PriceInsightResult> {
  try {
    const areaRange = params.area ? calculateAreaRange(params.area) : null;

    // Construir query para obtener propiedades comparables
    let query = supabase
      .from("properties")
      .select("price, area")
      .eq("status", "published")
      .eq("city", params.city)
      .eq("property_type", params.property_type);

    if (params.neighborhood) {
      query = query.eq("neighborhood", params.neighborhood);
    }

    if (areaRange) {
      query = query
        .gte("area", areaRange.min)
        .lte("area", areaRange.max);
    }

    const { data: properties, error } = await query;

    if (error || !properties || properties.length === 0) {
      // Retornar valores por defecto si no hay datos
      // Si no hay propiedades, intentar usar market-stats como fallback
      const fallbackResult: PriceInsightResult = {
        average_price: 0,
        median_price: 0,
        min_price: 0,
        max_price: 0,
        recommended_min: 0,
        recommended_max: 0,
        recommended_range: {
          min: 0,
          max: 0,
        },
        sample_size: 0,
        data_sources: ["RentarColombia Marketplace Data"],
        data_sources_attribution: "Fuente: Datos del mercado RentarColombia",
        source: "own",
      };

      try {
        const marketStats = await getMarketStats({
          city: params.city,
          propertyType: params.property_type,
          neighborhood: params.neighborhood,
          area: params.area,
        });

        if (marketStats && marketStats.recommended_range) {
          fallbackResult.recommended_min = marketStats.recommended_range.min;
          fallbackResult.recommended_max = marketStats.recommended_range.max;
          fallbackResult.recommended_range = {
            min: marketStats.recommended_range.min,
            max: marketStats.recommended_range.max,
          };
          fallbackResult.source = "market";
          fallbackResult.analysis_level = marketStats.analysis_level;
          fallbackResult.sample_size = marketStats.sample_size;
        }
      } catch (error) {
        console.warn("[priceInsightsService] Error al obtener market-stats fallback:", error);
      }

      return fallbackResult;
    }

    // Extraer precios y eliminar nulls/undefined
    const prices = properties
      .map((p) => Number(p.price))
      .filter((p) => !isNaN(p) && p > 0);

    if (prices.length === 0) {
      // Si no hay precios válidos, intentar usar market-stats como fallback
      const fallbackResult: PriceInsightResult = {
        average_price: 0,
        median_price: 0,
        min_price: 0,
        max_price: 0,
        recommended_min: 0,
        recommended_max: 0,
        recommended_range: {
          min: 0,
          max: 0,
        },
        sample_size: 0,
        data_sources: ["RentarColombia Marketplace Data"],
        data_sources_attribution: "Fuente: Datos del mercado RentarColombia",
        source: "own",
      };

      try {
        const marketStats = await getMarketStats({
          city: params.city,
          propertyType: params.property_type,
          neighborhood: params.neighborhood,
          area: params.area,
        });

        if (marketStats && marketStats.recommended_range) {
          fallbackResult.recommended_min = marketStats.recommended_range.min;
          fallbackResult.recommended_max = marketStats.recommended_range.max;
          fallbackResult.recommended_range = {
            min: marketStats.recommended_range.min,
            max: marketStats.recommended_range.max,
          };
          fallbackResult.source = "market";
          fallbackResult.analysis_level = marketStats.analysis_level;
          fallbackResult.sample_size = marketStats.sample_size;
        }
      } catch (error) {
        console.warn("[priceInsightsService] Error al obtener market-stats fallback:", error);
      }

      return fallbackResult;
    }

    // Eliminar outliers
    const filteredPrices = removeOutliers(prices);

    if (filteredPrices.length === 0) {
      // Si después de filtrar no quedan datos, usar los originales
      const sorted = [...prices].sort((a, b) => a - b);
      const average = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const median = calculateMedian(sorted);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const stdDev = Math.sqrt(
        sorted.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / sorted.length
      );

      const recommendedMin = Math.max(min, Math.round(average - stdDev));
      const recommendedMax = Math.round(average + stdDev);
      
      const fallbackResult: PriceInsightResult = {
        average_price: Math.round(average),
        median_price: Math.round(median),
        min_price: min,
        max_price: max,
        recommended_min: recommendedMin,
        recommended_max: recommendedMax,
        recommended_range: {
          min: recommendedMin,
          max: recommendedMax,
        },
        sample_size: sorted.length,
        data_sources: ["RentarColombia Marketplace Data"],
        data_sources_attribution: "Fuente: Datos del mercado RentarColombia",
        source: "own",
      };

      // Si sample_size < 3, intentar usar market-stats como fallback
      if (fallbackResult.sample_size < 3) {
        try {
          const marketStats = await getMarketStats({
            city: params.city,
            propertyType: params.property_type,
            neighborhood: params.neighborhood,
            area: params.area,
          });

          if (marketStats && marketStats.recommended_range) {
            fallbackResult.recommended_min = marketStats.recommended_range.min;
            fallbackResult.recommended_max = marketStats.recommended_range.max;
            fallbackResult.recommended_range = {
              min: marketStats.recommended_range.min,
              max: marketStats.recommended_range.max,
            };
            fallbackResult.source = "market";
            fallbackResult.analysis_level = marketStats.analysis_level;
            
            if (marketStats.sample_size > fallbackResult.sample_size) {
              fallbackResult.sample_size = marketStats.sample_size;
            }
          }
        } catch (error) {
          console.warn("[priceInsightsService] Error al obtener market-stats fallback:", error);
        }
      }

      return fallbackResult;
    }

    // Calcular estadísticas
    const sorted = [...filteredPrices].sort((a, b) => a - b);
    const average = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const median = calculateMedian(sorted);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const stdDev = Math.sqrt(
      sorted.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / sorted.length
    );

    const recommendedMin = Math.max(min, Math.round(average - stdDev));
    const recommendedMax = Math.round(average + stdDev);
    
    const result: PriceInsightResult = {
      average_price: Math.round(average),
      median_price: Math.round(median),
      min_price: min,
      max_price: max,
      recommended_min: recommendedMin,
      recommended_max: recommendedMax,
      recommended_range: {
        min: recommendedMin,
        max: recommendedMax,
      },
      sample_size: sorted.length,
      data_sources: ["RenColombia Marketplace Data"],
      data_sources_attribution: "Fuente: Datos del mercado RenColombia",
      source: "own", // Datos propios de RentarColombia
    };

    // Si hay datos suficientes (sample_size >= 3), usar datos propios y validar con DANE
    if (result.sample_size >= 3) {
      // Validar con DANE (solo para contexto macroeconómico, NO invasivo)
      // El DANE NO reemplaza los datos reales del marketplace
      const daneValidation = await validateWithDane(
        result.average_price,
        params.city,
        params.property_type
      );

      if (daneValidation.coherence_status !== "no_data") {
        result.dane_validation = daneValidation;
        result.data_sources = getDataSourcesText(true);
        result.data_sources_attribution = getDataSourcesAttribution(true);
      }

      return result;
    }

    // Si sample_size < 3, intentar usar market-stats como fallback
    // Solo usamos recommended_range del market-stats, NO mezclamos promedios
    try {
      const marketStats = await getMarketStats({
        city: params.city,
        propertyType: params.property_type,
        neighborhood: params.neighborhood,
        area: params.area,
      });

      if (marketStats && marketStats.recommended_range) {
        // Usar solo recommended_range del market-stats como fallback
        // Mantener los valores propios calculados (o 0 si no hay datos)
        result.recommended_min = marketStats.recommended_range.min;
        result.recommended_max = marketStats.recommended_range.max;
        result.recommended_range = {
          min: marketStats.recommended_range.min,
          max: marketStats.recommended_range.max,
        };
        result.source = "market"; // Marcar como fuente externa
        result.analysis_level = marketStats.analysis_level; // Propagar nivel de análisis
        
        // Actualizar sample_size con el del market-stats si es mayor
        if (marketStats.sample_size > result.sample_size) {
          result.sample_size = marketStats.sample_size;
        }

        // NO usar average_price del market-stats (regla de negocio)
        // Mantener los valores propios calculados (pueden ser 0 si no hay datos suficientes)
      }
    } catch (error) {
      // Si falla el market-stats, continuar con los datos propios
      console.warn("[priceInsightsService] Error al obtener market-stats fallback:", error);
      // El resultado ya tiene los datos propios, solo no tendrá el fallback
    }

    // Validar con DANE incluso si usamos fallback (para contexto macroeconómico)
    if (result.average_price > 0) {
      const daneValidation = await validateWithDane(
        result.average_price,
        params.city,
        params.property_type
      );

      if (daneValidation.coherence_status !== "no_data") {
        result.dane_validation = daneValidation;
        result.data_sources = getDataSourcesText(true);
        result.data_sources_attribution = getDataSourcesAttribution(true);
      }
    }

    return result;
  } catch (error) {
    console.error("Error calculating price insights:", error);
    // Retornar valores por defecto en caso de error
    return {
      average_price: 0,
      median_price: 0,
      min_price: 0,
      max_price: 0,
      recommended_min: 0,
      recommended_max: 0,
      recommended_range: {
        min: 0,
        max: 0,
      },
      sample_size: 0,
      data_sources: ["RenColombia Marketplace Data"],
      data_sources_attribution: "Fuente: Datos del mercado RenColombia",
      source: "own",
    };
  }
}

/**
 * Guarda los insights calculados en el cache
 */
async function cacheInsights(
  params: PriceInsightParams,
  result: PriceInsightResult
): Promise<void> {
  try {
    const areaRange = params.area ? calculateAreaRange(params.area) : null;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Cache por 24 horas

    const cacheData: any = {
      city: params.city,
      neighborhood: params.neighborhood || null,
      property_type: params.property_type,
      area_min: areaRange?.min || null,
      area_max: areaRange?.max || null,
      average_price: result.average_price,
      median_price: result.median_price,
      min_price: result.min_price,
      max_price: result.max_price,
      recommended_min: result.recommended_min,
      recommended_max: result.recommended_max,
      sample_size: result.sample_size,
      expires_at: expiresAt.toISOString(),
      data_sources: result.data_sources || ["RenColombia Marketplace Data"],
      // Campos opcionales para fuente y nivel de análisis
      source: result.source || "own",
      analysis_level: result.analysis_level || null,
    };

    // Agregar datos DANE si están disponibles
    if (result.dane_validation && result.dane_validation.coherence_status !== "no_data") {
      cacheData.dane_reference_price = result.dane_validation.reference_price;
      cacheData.dane_deviation_percentage = result.dane_validation.deviation_percentage;
      cacheData.dane_coherence_status = result.dane_validation.coherence_status;
      cacheData.dane_data_period = result.dane_validation.data_period;
    }

    // Intentar insertar, si ya existe actualizar
    const { error: insertError } = await supabase
      .from("price_insights")
      .upsert(cacheData, {
        onConflict: "city,neighborhood,property_type,area_min,area_max",
      });

    if (insertError) {
      // Si la tabla no existe aún, solo loguear warning
      console.warn("Error caching price insights (table may not exist yet):", insertError);
    }
  } catch (error) {
    console.warn("Error in cacheInsights:", error);
  }
}

/**
 * Servicio principal para obtener insights de precio
 */
export async function getPriceInsights(
  params: PriceInsightParams,
  comparePrice?: number
): Promise<PriceInsightResult> {
  try {
    // Primero intentar obtener del cache
    const cached = await getCachedInsights(params);
    if (cached) {
      const result: PriceInsightResult = {
        average_price: Number(cached.average_price),
        median_price: Number(cached.median_price),
        min_price: Number(cached.min_price),
        max_price: Number(cached.max_price),
        recommended_min: Number(cached.recommended_min),
        recommended_max: Number(cached.recommended_max),
        sample_size: cached.sample_size,
        data_sources:
          cached.data_sources && Array.isArray(cached.data_sources)
            ? cached.data_sources
            : ["RenColombia Marketplace Data"],
        data_sources_attribution: cached.data_sources?.includes("DANE")
          ? getDataSourcesAttribution(true)
          : getDataSourcesAttribution(false),
        // Campos opcionales desde caché (compatibilidad hacia atrás)
        source: (cached as any).source || "own",
        analysis_level: (cached as any).analysis_level,
        // Construir recommended_range desde recommended_min/max si no existe en caché
        recommended_range: (cached as any).recommended_range || {
          min: Number(cached.recommended_min),
          max: Number(cached.recommended_max),
        },
      };

      // Agregar validación DANE desde caché si está disponible
      if (
        cached.dane_coherence_status &&
        cached.dane_coherence_status !== "no_data" &&
        cached.dane_reference_price
      ) {
        result.dane_validation = {
          reference_price: Number(cached.dane_reference_price),
          deviation_percentage: cached.dane_deviation_percentage
            ? Number(cached.dane_deviation_percentage)
            : null,
          coherence_status: cached.dane_coherence_status,
          data_period: cached.dane_data_period || null,
          source_url: null, // No se guarda en caché por ahora
        };
      }

      // Si se proporciona un precio para comparar
      if (comparePrice && result.average_price > 0) {
        const percentageDiff =
          ((comparePrice - result.average_price) / result.average_price) * 100;
        const absDiff = Math.abs(percentageDiff);

        result.price_comparison = {
          percentage_diff: Math.round(percentageDiff * 10) / 10,
          status:
            absDiff < 5
              ? "fair"
              : comparePrice > result.average_price
              ? "above"
              : "below",
        };
      }

      return result;
    }

  // Si no hay cache, calcular desde los datos
  const result = await calculatePriceInsights(params);

  // Guardar en cache (solo si hay datos suficientes O si viene del market-stats)
  // El market-stats puede tener sample_size >= 3 aunque nuestros datos propios no
  if (result.sample_size >= 3 || result.source === "market") {
    await cacheInsights(params, result);
  }

  // Agregar comparación si se proporciona precio
  if (comparePrice && result.average_price > 0) {
    const percentageDiff =
      ((comparePrice - result.average_price) / result.average_price) * 100;
    const absDiff = Math.abs(percentageDiff);

      result.price_comparison = {
        percentage_diff: Math.round(percentageDiff * 10) / 10,
        status:
          absDiff < 5
            ? "fair"
            : comparePrice > result.average_price
            ? "above"
            : "below",
      };
    }

    return result;
  } catch (error) {
    console.error("Error in getPriceInsights:", error);
    // Retornar valores por defecto en caso de error
    return {
      average_price: 0,
      median_price: 0,
      min_price: 0,
      max_price: 0,
      recommended_min: 0,
      recommended_max: 0,
      recommended_range: {
        min: 0,
        max: 0,
      },
      sample_size: 0,
      data_sources: ["RenColombia Marketplace Data"],
      data_sources_attribution: "Fuente: Datos del mercado RenColombia",
      source: "own",
    };
  }
}
