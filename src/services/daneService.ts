/**
 * Servicio para obtener datos de referencia del DANE
 * 
 * IMPORTANTE LEGAL:
 * - Este servicio NO redistribuye datos crudos del DANE
 * - Solo utiliza datos agregados y referencias macroeconómicas
 * - Los datos se usan únicamente para validación y contexto
 * - Siempre se debe citar la fuente: "DANE – análisis agregado y elaboración propia"
 */

import { supabase } from "@/integrations/supabase/client";

export interface DaneReferenceData {
  id: string;
  city: string;
  area_metropolitan: string | null;
  property_type: string;
  reference_price: number;
  data_period: string;
  source_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface DaneValidationResult {
  reference_price: number | null;
  deviation_percentage: number | null;
  coherence_status: "coherent" | "slight_deviation" | "significant_deviation" | "no_data";
  data_period: string | null;
  source_url: string | null;
}

/**
 * Normaliza el nombre de la ciudad para búsqueda en datos DANE
 * Mapea nombres comunes a nombres oficiales del DANE
 */
function normalizeCityName(city: string): string {
  const cityMap: Record<string, string> = {
    "Bogotá": "Bogotá D.C.",
    "Bogota": "Bogotá D.C.",
    "Medellín": "Medellín",
    "Medellin": "Medellín",
    "Cali": "Cali",
    "Barranquilla": "Barranquilla",
    "Cartagena": "Cartagena",
    "Bucaramanga": "Bucaramanga",
    "Pereira": "Pereira",
    "Santa Marta": "Santa Marta",
    "Manizales": "Manizales",
    "Pasto": "Pasto",
    "Cúcuta": "Cúcuta",
    "Armenia": "Armenia",
    "Villavicencio": "Villavicencio",
    "Ibagué": "Ibagué",
    "Valledupar": "Valledupar",
    "Montería": "Montería",
    "Sincelejo": "Sincelejo",
    "Popayán": "Popayán",
    "Tunja": "Tunja",
    "Riohacha": "Riohacha",
    "Quibdó": "Quibdó",
    "Neiva": "Neiva",
    "Yopal": "Yopal",
    "Mocoa": "Mocoa",
    "Leticia": "Leticia",
    "San Andrés": "San Andrés",
    "Arauca": "Arauca",
    "Inírida": "Inírida",
    "Mitú": "Mitú",
    "Puerto Carreño": "Puerto Carreño",
  };

  // Normalizar: quitar tildes y convertir a minúsculas para comparación
  const normalized = city.trim();
  return cityMap[normalized] || normalized;
}

/**
 * Obtiene datos de referencia del DANE para una ciudad y tipo de inmueble
 * 
 * @param city - Nombre de la ciudad
 * @param propertyType - Tipo de inmueble
 * @returns Datos de referencia del DANE o null si no están disponibles
 */
export async function getDaneReferenceData(
  city: string,
  propertyType: string
): Promise<DaneReferenceData | null> {
  try {
    const normalizedCity = normalizeCityName(city);

    // Primero intentar buscar por tipo específico
    let query = supabase
      .from("dane_reference_data")
      .select("*")
      .eq("city", normalizedCity)
      .eq("property_type", propertyType)
      .gte("expires_at", new Date().toISOString())
      .order("data_period", { ascending: false })
      .limit(1);

    const { data, error } = await query.single();

    if (!error && data) {
      return data as DaneReferenceData;
    }

    // Si no hay datos específicos, intentar con tipo "general"
    const { data: generalData, error: generalError } = await supabase
      .from("dane_reference_data")
      .select("*")
      .eq("city", normalizedCity)
      .eq("property_type", "general")
      .gte("expires_at", new Date().toISOString())
      .order("data_period", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!generalError && generalData) {
      return generalData as DaneReferenceData;
    }

    return null;
  } catch (error) {
    // Si la tabla no existe aún, retornar null silenciosamente
    console.warn("Error getting DANE reference data (table may not exist yet):", error);
    return null;
  }
}

/**
 * Valida la coherencia de un precio promedio calculado con datos del DANE
 * 
 * @param calculatedAverage - Precio promedio calculado desde datos de RentarColombia
 * @param city - Ciudad del análisis
 * @param propertyType - Tipo de inmueble
 * @returns Resultado de validación con DANE
 */
export async function validateWithDane(
  calculatedAverage: number,
  city: string,
  propertyType: string
): Promise<DaneValidationResult> {
  try {
    const daneData = await getDaneReferenceData(city, propertyType);

    if (!daneData || !daneData.reference_price) {
      return {
        reference_price: null,
        deviation_percentage: null,
        coherence_status: "no_data",
        data_period: null,
        source_url: daneData?.source_url || null,
      };
    }

    // Calcular desviación porcentual
    const deviationPercentage =
      ((calculatedAverage - daneData.reference_price) / daneData.reference_price) * 100;
    const absDeviation = Math.abs(deviationPercentage);

    // Determinar estado de coherencia
    let coherenceStatus: DaneValidationResult["coherence_status"];
    if (absDeviation < 10) {
      coherenceStatus = "coherent";
    } else if (absDeviation < 20) {
      coherenceStatus = "slight_deviation";
    } else {
      coherenceStatus = "significant_deviation";
    }

    return {
      reference_price: Number(daneData.reference_price),
      deviation_percentage: Math.round(deviationPercentage * 10) / 10,
      coherence_status: coherenceStatus,
      data_period: daneData.data_period,
      source_url: daneData.source_url || null,
    };
  } catch (error) {
    console.warn("Error validating with DANE:", error);
    return {
      reference_price: null,
      deviation_percentage: null,
      coherence_status: "no_data",
      data_period: null,
      source_url: null,
    };
  }
}

/**
 * Obtiene el texto de fuente de datos para mostrar en la UI
 */
export function getDataSourcesText(hasDaneData: boolean): string[] {
  const sources = ["RentarColombia Marketplace Data"];
  if (hasDaneData) {
    sources.push("DANE – análisis agregado y elaboración propia");
  }
  return sources;
}

/**
 * Obtiene el texto completo de atribución de fuentes
 */
export function getDataSourcesAttribution(hasDaneData: boolean): string {
  if (hasDaneData) {
    return "Fuente: Datos del mercado RentarColombia y DANE (análisis agregado y elaboración propia)";
  }
  return "Fuente: Datos del mercado RentarColombia";
}
