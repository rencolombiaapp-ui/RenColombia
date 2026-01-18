/**
 * Generador de textos de UI para análisis de precios
 * 
 * Genera mensajes claros, cortos y honestos según:
 * - source: "own" | "market"
 * - analysis_level: "city" | "neighborhood" | "area"
 * - hasActivePlan: boolean (PRO vs no PRO)
 */

import { PriceInsightResult } from "@/services/priceInsightsService";

export interface PriceInsightTexts {
  title: string;
  description: string;
  sampleSizeText: string;
  sourceBadge?: string;
  sourceTooltip?: string;
  disclaimer?: string;
}

/**
 * Genera textos de UI para análisis de precios según el contexto
 */
export function getPriceInsightTexts(
  insights: PriceInsightResult,
  city?: string,
  neighborhood?: string,
  propertyType?: string,
  hasActivePlan: boolean = false
): PriceInsightTexts {
  const source = insights.source || "own";
  const analysisLevel = insights.analysis_level;
  const sampleSize = insights.sample_size;

  // Textos base según source
  if (source === "market") {
    return getMarketSourceTexts(insights, city, neighborhood, propertyType, analysisLevel, sampleSize, hasActivePlan);
  }

  // Textos para datos propios (source === "own")
  return getOwnSourceTexts(insights, city, neighborhood, propertyType, sampleSize, hasActivePlan);
}

/**
 * Textos cuando los datos vienen de market-stats (fallback)
 */
function getMarketSourceTexts(
  insights: PriceInsightResult,
  city?: string,
  neighborhood?: string,
  propertyType?: string,
  analysisLevel?: "city" | "neighborhood" | "area",
  sampleSize: number = 0,
  hasActivePlan: boolean = false
): PriceInsightTexts {
  const propertyTypeLabel = propertyType ? getPropertyTypeLabel(propertyType) : "inmuebles";
  
  // Determinar nivel de análisis para el texto
  let locationText = "";
  let levelText = "";
  
  if (analysisLevel === "neighborhood" && neighborhood) {
    locationText = `${neighborhood}, ${city || ""}`;
    levelText = "barrio";
  } else if (analysisLevel === "area") {
    locationText = city || "";
    levelText = "área específica";
  } else {
    locationText = city || "";
    levelText = "ciudad";
  }

  const locationDisplay = locationText.trim();

  if (!hasActivePlan) {
    // Usuario NO PRO
    return {
      title: "Análisis de Precio por Zona",
      description: locationDisplay
        ? `Precios estimados en ${locationDisplay} para ${propertyTypeLabel}`
        : `Precios estimados para ${propertyTypeLabel}`,
      sampleSizeText: `Basado en datos agregados del mercado (${sampleSize} inmuebles)`,
      sourceBadge: "Datos externos",
      sourceTooltip: "Estos datos provienen de fuentes externas de análisis de mercado",
      disclaimer: "Estimación basada en datos agregados. Puede variar según características específicas del inmueble.",
    };
  }

  // Usuario PRO
  return {
    title: "Análisis de Precio por Zona",
    description: locationDisplay
      ? `Precios estimados en ${locationDisplay} para ${propertyTypeLabel}`
      : `Precios estimados para ${propertyTypeLabel}`,
    sampleSizeText: analysisLevel === "neighborhood"
      ? `Basado en análisis a nivel de barrio (${sampleSize} inmuebles en ${neighborhood})`
      : analysisLevel === "area"
      ? `Basado en análisis por área específica (${sampleSize} inmuebles)`
      : `Basado en análisis a nivel de ciudad (${sampleSize} inmuebles en ${city})`,
    sourceBadge: "Datos externos",
    sourceTooltip: "Estos datos provienen de fuentes externas de análisis de mercado. Los datos propios de RenColombia son insuficientes en esta zona.",
    disclaimer: analysisLevel === "neighborhood"
      ? "Estimación a nivel de barrio basada en datos agregados. Considera características específicas de tu inmueble."
      : analysisLevel === "area"
      ? "Estimación por área específica basada en datos agregados. Considera características específicas de tu inmueble."
      : "Estimación a nivel de ciudad basada en datos agregados. Para mayor precisión, considera características específicas del inmueble y barrio.",
  };
}

/**
 * Textos cuando los datos vienen de RenColombia (propios)
 */
function getOwnSourceTexts(
  insights: PriceInsightResult,
  city?: string,
  neighborhood?: string,
  propertyType?: string,
  sampleSize: number = 0,
  hasActivePlan: boolean = false
): PriceInsightTexts {
  const propertyTypeLabel = propertyType ? getPropertyTypeLabel(propertyType) : "inmuebles";
  const locationText = neighborhood
    ? `${neighborhood}, ${city || ""}`
    : city || "";

  if (!hasActivePlan) {
    // Usuario NO PRO
    return {
      title: "Análisis de Precio por Zona",
      description: locationText
        ? `Precios en ${locationText} para ${propertyTypeLabel}`
        : `Precios para ${propertyTypeLabel}`,
      sampleSizeText: `Basado en ${sampleSize} inmueble${sampleSize !== 1 ? "s" : ""} comparable${sampleSize !== 1 ? "s" : ""} en esta zona`,
      sourceBadge: undefined,
      sourceTooltip: undefined,
      disclaimer: undefined,
    };
  }

  // Usuario PRO
  return {
    title: "Análisis de Precio por Zona",
    description: locationText
      ? `Precios en ${locationText} para ${propertyTypeLabel}`
      : `Precios para ${propertyTypeLabel}`,
    sampleSizeText: neighborhood
      ? `Basado en ${sampleSize} inmueble${sampleSize !== 1 ? "s" : ""} comparable${sampleSize !== 1 ? "s" : ""} en ${neighborhood}`
      : `Basado en ${sampleSize} inmueble${sampleSize !== 1 ? "s" : ""} comparable${sampleSize !== 1 ? "s" : ""} en ${city || "esta zona"}`,
    sourceBadge: "Datos RenColombia",
    sourceTooltip: "Análisis calculado con datos reales de propiedades publicadas en RenColombia",
    disclaimer: sampleSize < 10
      ? "Análisis basado en muestra limitada. Considera características específicas de tu inmueble."
      : undefined,
  };
}

/**
 * Genera texto para el badge de fuente de datos
 */
export function getSourceBadgeText(
  source?: "own" | "market",
  analysisLevel?: "city" | "neighborhood" | "area"
): string | undefined {
  if (!source || source === "own") {
    return undefined; // No mostrar badge para datos propios por defecto
  }

  if (source === "market") {
    if (analysisLevel === "neighborhood") {
      return "Estimado - Barrio";
    }
    if (analysisLevel === "area") {
      return "Estimado - Área";
    }
    return "Estimado - Ciudad";
  }

  return undefined;
}

/**
 * Genera texto para la descripción del análisis según source y analysis_level
 */
export function getAnalysisDescription(
  insights: PriceInsightResult,
  city?: string,
  neighborhood?: string,
  propertyType?: string
): string {
  const source = insights.source || "own";
  const analysisLevel = insights.analysis_level;
  const propertyTypeLabel = propertyType ? getPropertyTypeLabel(propertyType) : "inmuebles";

  if (source === "market") {
    if (analysisLevel === "neighborhood" && neighborhood) {
      return `Estimación de precios en ${neighborhood} para ${propertyTypeLabel}`;
    }
    if (analysisLevel === "area") {
      return `Estimación de precios por área específica para ${propertyTypeLabel}`;
    }
    return `Estimación de precios en ${city || "esta zona"} para ${propertyTypeLabel}`;
  }

  // source === "own"
  if (neighborhood) {
    return `Precios en ${neighborhood}${city ? `, ${city}` : ""} para ${propertyTypeLabel}`;
  }
  return `Precios en ${city || "esta zona"} para ${propertyTypeLabel}`;
}

/**
 * Genera texto para la muestra de datos según source y analysis_level
 */
export function getSampleSizeText(
  insights: PriceInsightResult,
  neighborhood?: string,
  city?: string
): string {
  const source = insights.source || "own";
  const analysisLevel = insights.analysis_level;
  const sampleSize = insights.sample_size;

  if (source === "market") {
    if (analysisLevel === "neighborhood" && neighborhood) {
      return `Basado en análisis agregado del barrio ${neighborhood} (${sampleSize} inmuebles)`;
    }
    if (analysisLevel === "area") {
      return `Basado en análisis agregado por área (${sampleSize} inmuebles)`;
    }
    return `Basado en análisis agregado de ${city || "la ciudad"} (${sampleSize} inmuebles)`;
  }

  // source === "own"
  if (neighborhood) {
    return `Basado en ${sampleSize} inmueble${sampleSize !== 1 ? "s" : ""} comparable${sampleSize !== 1 ? "s" : ""} en ${neighborhood}`;
  }
  return `Basado en ${sampleSize} inmueble${sampleSize !== 1 ? "s" : ""} comparable${sampleSize !== 1 ? "s" : ""} en ${city || "esta zona"}`;
}

/**
 * Genera texto de disclaimer según source y analysis_level
 */
export function getDisclaimerText(
  insights: PriceInsightResult,
  hasActivePlan: boolean = false
): string | undefined {
  if (!hasActivePlan) {
    return undefined; // No mostrar disclaimer para usuarios no PRO
  }

  const source = insights.source || "own";
  const analysisLevel = insights.analysis_level;
  const sampleSize = insights.sample_size;

  if (source === "market") {
    if (analysisLevel === "neighborhood") {
      return "Estimación basada en datos agregados a nivel de barrio. Considera características específicas de tu inmueble para mayor precisión.";
    }
    if (analysisLevel === "area") {
      return "Estimación basada en datos agregados por área. Considera características específicas de tu inmueble para mayor precisión.";
    }
    return "Estimación basada en datos agregados a nivel de ciudad. Para mayor precisión, considera características específicas del inmueble y barrio.";
  }

  // source === "own"
  if (sampleSize < 5) {
    return "Análisis basado en muestra pequeña. Los resultados pueden variar según características específicas del inmueble.";
  }
  if (sampleSize < 10) {
    return "Análisis basado en muestra moderada. Considera características específicas de tu inmueble.";
  }

  return undefined; // Muestra suficiente, no necesita disclaimer
}

/**
 * Convierte el tipo de inmueble a etiqueta legible
 */
function getPropertyTypeLabel(propertyType: string): string {
  const labels: Record<string, string> = {
    apartamento: "apartamentos",
    casa: "casas",
    apartaestudio: "apartaestudios",
    local: "locales",
    loft: "lofts",
    penthouse: "penthouses",
  };

  return labels[propertyType.toLowerCase()] || propertyType;
}

/**
 * Genera texto para el card de recomendación según source
 */
export function getRecommendationTexts(
  insights: PriceInsightResult,
  city?: string,
  propertyType?: string,
  hasActivePlan: boolean = false
): {
  title: string;
  description: string;
  disclaimer?: string;
} {
  const source = insights.source || "own";
  const analysisLevel = insights.analysis_level;
  const sampleSize = insights.sample_size;
  const propertyTypeLabel = propertyType ? getPropertyTypeLabel(propertyType) : "inmuebles";

  if (source === "market") {
    const levelText = analysisLevel === "neighborhood"
      ? "barrio"
      : analysisLevel === "area"
      ? "área específica"
      : "ciudad";

    return {
      title: "Recomendación de Precio",
      description: hasActivePlan
        ? `Estimación basada en análisis agregado a nivel de ${levelText} (${sampleSize} ${propertyTypeLabel})`
        : `Estimación basada en datos del mercado (${sampleSize} ${propertyTypeLabel})`,
      disclaimer: hasActivePlan
        ? `Recomendación estimada a nivel de ${levelText}. Considera características específicas de tu inmueble para ajustar el precio.`
        : undefined,
    };
  }

  // source === "own"
  return {
    title: "Recomendación de Precio",
    description: `Basado en ${sampleSize} inmueble${sampleSize !== 1 ? "s" : ""} comparable${sampleSize !== 1 ? "s" : ""} en ${city || "esta zona"}`,
    disclaimer: sampleSize < 5 && hasActivePlan
      ? "Recomendación basada en muestra pequeña. Considera características específicas de tu inmueble."
      : undefined,
  };
}
