/**
 * Cliente HTTP para consumir el servicio externo de estadísticas de mercado
 * 
 * Este servicio debe usarse SOLO como fallback cuando los datos locales
 * no están disponibles o son insuficientes.
 * 
 * Endpoint: GET /api/v1/market-stats
 * 
 * Variables de entorno requeridas:
 * - VITE_MARKET_STATS_BASE_URL: URL base del servicio (ej: http://localhost:8001)
 * - VITE_MARKET_STATS_ENABLED: "true" para habilitar, cualquier otro valor lo deshabilita
 */

// Configuración desde variables de entorno (Vite usa import.meta.env)
const MARKET_STATS_BASE_URL = import.meta.env.VITE_MARKET_STATS_BASE_URL;
const MARKET_STATS_ENABLED = import.meta.env.VITE_MARKET_STATS_ENABLED === "true";

// Timeout por defecto: 5 segundos
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Verifica si el servicio de market-stats está configurado y habilitado
 */
function isMarketStatsAvailable(): boolean {
  if (!MARKET_STATS_ENABLED) {
    return false;
  }
  const baseUrl = MARKET_STATS_BASE_URL;
  return !!baseUrl && typeof baseUrl === "string" && baseUrl.trim() !== "";
}

/**
 * Obtiene la URL base del servicio de market-stats (función interna)
 * Retorna null si no está configurado o deshabilitado
 * Normaliza la URL eliminando trailing slashes
 */
function getMarketStatsBaseUrlInternal(): string | null {
  if (!isMarketStatsAvailable()) {
    return null;
  }
  const baseUrl = MARKET_STATS_BASE_URL;
  if (typeof baseUrl !== "string") {
    return null;
  }
  
  // Normalizar: eliminar espacios y trailing slashes
  const normalized = baseUrl.trim();
  if (normalized === "") {
    return null;
  }
  
  // Eliminar trailing slash para evitar problemas al construir URLs
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

/**
 * Parámetros para obtener estadísticas de mercado
 */
export interface MarketStatsParams {
  city: string;
  propertyType: string;
  neighborhood?: string;
  area?: number;
}

/**
 * Respuesta del servicio de estadísticas de mercado
 */
export interface MarketStatsResponse {
  recommended_range: {
    min: number;
    max: number;
  };
  analysis_level: "city" | "neighborhood" | "area";
  sample_size: number;
  p25: number; // Percentil 25
  p75: number; // Percentil 75
  average?: number; // Opcional: promedio
  median?: number; // Opcional: mediana
}

/**
 * Crea un AbortController con timeout
 */
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // Limpiar timeout si la petición se completa antes
  // Nota: Esto se maneja automáticamente cuando se aborta la petición
  return controller;
}

/**
 * Construye la URL completa con query parameters usando URL y URLSearchParams
 * para manejar correctamente caracteres especiales (tildes, UTF-8)
 * Retorna null si el servicio no está disponible
 */
function buildMarketStatsUrl(params: MarketStatsParams): string | null {
  const baseUrl = getMarketStatsBaseUrlInternal();
  if (!baseUrl) {
    return null;
  }

  try {
    // La URL base ya está normalizada (sin trailing slash) por getMarketStatsBaseUrlInternal()
    // Construir URL usando el constructor URL con path relativo y base absoluta
    // Esto asegura el encoding correcto de caracteres especiales (UTF-8)
    // El constructor URL maneja automáticamente el encoding UTF-8
    const url = new URL("/api/v1/market-stats", baseUrl);
    
    // Usar searchParams.set() en lugar de append() para evitar duplicados
    // URLSearchParams maneja automáticamente el encoding UTF-8 de caracteres especiales
    // IMPORTANTE: Los nombres de los query params deben coincidir EXACTAMENTE con el contrato del backend (snake_case)
    url.searchParams.set("city", params.city);
    url.searchParams.set("property_type", params.propertyType); // Backend espera property_type (snake_case)
    
    // Parámetros opcionales: solo agregar si existen
    if (params.neighborhood && params.neighborhood.trim() !== "") {
      url.searchParams.set("neighborhood", params.neighborhood);
    }
    
    if (params.area !== undefined && params.area !== null && !isNaN(params.area)) {
      url.searchParams.set("area", params.area.toString());
    }
    
    // URL.toString() ya incluye el encoding correcto de todos los parámetros
    return url.toString();
  } catch (error) {
    console.warn("[marketStatsClient] Error al construir URL:", {
      baseUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Valida que la respuesta tenga la estructura esperada
 */
function validateMarketStatsResponse(data: any): data is MarketStatsResponse {
  if (!data || typeof data !== "object") {
    return false;
  }
  
  // Validar campos obligatorios
  if (
    !data.recommended_range ||
    typeof data.recommended_range.min !== "number" ||
    typeof data.recommended_range.max !== "number" ||
    !data.analysis_level ||
    typeof data.sample_size !== "number" ||
    typeof data.p25 !== "number" ||
    typeof data.p75 !== "number"
  ) {
    return false;
  }
  
  // Validar que analysis_level sea uno de los valores permitidos
  if (!["city", "neighborhood", "area"].includes(data.analysis_level)) {
    return false;
  }
  
  // Validar que los valores numéricos sean válidos
  if (
    !isFinite(data.recommended_range.min) ||
    !isFinite(data.recommended_range.max) ||
    !isFinite(data.sample_size) ||
    !isFinite(data.p25) ||
    !isFinite(data.p75) ||
    data.sample_size < 0 ||
    data.recommended_range.min < 0 ||
    data.recommended_range.max < data.recommended_range.min
  ) {
    return false;
  }
  
  return true;
}

/**
 * Obtiene estadísticas de mercado desde el servicio externo
 * 
 * @param params - Parámetros de búsqueda
 * @param timeoutMs - Timeout en milisegundos (default: 5000)
 * @returns Estadísticas de mercado o null si hay error o timeout
 * 
 * @example
 * ```typescript
 * const stats = await getMarketStats({
 *   city: "Bogotá",
 *   propertyType: "apartamento",
 *   neighborhood: "Chapinero",
 *   area: 60
 * });
 * 
 * if (stats) {
 *   console.log(`Rango recomendado: ${stats.recommended_range.min} - ${stats.recommended_range.max}`);
 * }
 * ```
 */
export async function getMarketStats(
  params: MarketStatsParams,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<MarketStatsResponse | null> {
  // Verificar si el servicio está habilitado y configurado
  if (!isMarketStatsAvailable()) {
    // No loguear en producción para evitar spam, solo retornar null silenciosamente
    return null;
  }

  // Validar parámetros obligatorios
  if (!params.city || !params.propertyType) {
    console.warn("[marketStatsClient] Parámetros obligatorios faltantes:", {
      hasCity: !!params.city,
      hasPropertyType: !!params.propertyType,
    });
    return null;
  }

  // Construir URL (retorna null si hay error)
  const url = buildMarketStatsUrl(params);
  if (!url) {
    return null;
  }

  const controller = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Agregar headers adicionales si es necesario (ej: autenticación)
        // "Authorization": `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    // Si la respuesta no es exitosa, retornar null
    if (!response.ok) {
      console.warn(
        `[marketStatsClient] Error HTTP ${response.status}: ${response.statusText}`,
        {
          url,
          status: response.status,
          statusText: response.statusText,
        }
      );
      return null;
    }

    // Intentar parsear la respuesta como JSON
    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      console.warn("[marketStatsClient] Error al parsear respuesta JSON:", {
        url,
        error: parseError,
      });
      return null;
    }

    // Validar estructura de la respuesta
    if (!validateMarketStatsResponse(data)) {
      console.warn("[marketStatsClient] Respuesta inválida o estructura incorrecta:", {
        url,
        receivedData: data,
      });
      return null;
    }

    // Retornar datos validados
    return data as MarketStatsResponse;
  } catch (error) {
    // Manejar diferentes tipos de errores
    if (error instanceof Error) {
      // Timeout o aborto
      if (error.name === "AbortError") {
        console.warn("[marketStatsClient] Timeout al obtener estadísticas:", {
          url,
          timeoutMs,
        });
        return null;
      }

      // Error de red
      if (error.message.includes("fetch") || error.message.includes("network")) {
        console.warn("[marketStatsClient] Error de red:", {
          url,
          error: error.message,
        });
        return null;
      }

      // Otros errores
      console.warn("[marketStatsClient] Error inesperado:", {
        url,
        error: error.message,
        errorName: error.name,
      });
      return null;
    }

    // Error desconocido
    console.warn("[marketStatsClient] Error desconocido:", {
      url,
      error,
    });
    return null;
  }
}

/**
 * Verifica si el servicio de estadísticas está disponible
 * 
 * @param timeoutMs - Timeout en milisegundos (default: 3000)
 * @returns true si el servicio responde, false en caso contrario
 */
export async function checkMarketStatsAvailability(
  timeoutMs: number = 3000
): Promise<boolean> {
  // Primero verificar si está habilitado y configurado
  if (!isMarketStatsAvailable()) {
    return false;
  }

  try {
    // Intentar obtener estadísticas con parámetros mínimos
    const result = await getMarketStats(
      {
        city: "Bogotá", // Ciudad de prueba
        propertyType: "apartamento",
      },
      timeoutMs
    );

    // Si retorna null, el servicio no está disponible o hay error
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Obtiene la URL base configurada del servicio
 * Retorna null si no está configurado o deshabilitado
 * 
 * @returns URL base del servicio o null si no está disponible
 */
export function getMarketStatsBaseUrl(): string | null {
  return getMarketStatsBaseUrlInternal();
}
