import { supabase } from "@/integrations/supabase/client";

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
      return {
        average_price: 0,
        median_price: 0,
        min_price: 0,
        max_price: 0,
        recommended_min: 0,
        recommended_max: 0,
        sample_size: 0,
      };
    }

    // Extraer precios y eliminar nulls/undefined
    const prices = properties
      .map((p) => Number(p.price))
      .filter((p) => !isNaN(p) && p > 0);

    if (prices.length === 0) {
      return {
        average_price: 0,
        median_price: 0,
        min_price: 0,
        max_price: 0,
        recommended_min: 0,
        recommended_max: 0,
        sample_size: 0,
      };
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

      return {
        average_price: Math.round(average),
        median_price: Math.round(median),
        min_price: min,
        max_price: max,
        recommended_min: Math.max(min, Math.round(average - stdDev)),
        recommended_max: Math.round(average + stdDev),
        sample_size: sorted.length,
      };
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

    const result: PriceInsightResult = {
      average_price: Math.round(average),
      median_price: Math.round(median),
      min_price: min,
      max_price: max,
      recommended_min: Math.max(min, Math.round(average - stdDev)),
      recommended_max: Math.round(average + stdDev),
      sample_size: sorted.length,
    };

    // Si se proporciona un precio para comparar, calcular la diferencia
    // Esto se hace en el hook, no aquí

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
      sample_size: 0,
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

    const cacheData = {
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
    };

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
    };

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

  // Guardar en cache (solo si hay datos suficientes)
  if (result.sample_size >= 3) {
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
      sample_size: 0,
    };
  }
}
