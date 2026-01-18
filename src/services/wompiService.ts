/**
 * Servicio de integración con Wompi
 * Documentación: https://docs.wompi.co/
 */

const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY;
const WOMPI_PRIVATE_KEY = import.meta.env.VITE_WOMPI_PRIVATE_KEY;
const WOMPI_ENVIRONMENT = import.meta.env.VITE_WOMPI_ENVIRONMENT || "sandbox"; // sandbox | production
// URLs de Wompi para Colombia
const WOMPI_BASE_URL =
  WOMPI_ENVIRONMENT === "production"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";

export interface WompiCheckoutRequest {
  amount_in_cents: number;
  currency: string;
  customer_email: string;
  payment_method?: {
    type: "CARD" | "NEQUI" | "PSE" | "BANCOLOMBIA_TRANSFER";
    installments?: number;
    token?: string; // Token de tarjeta (opcional, solo si ya tienes el token)
  };
  payment_source?: {
    type: "CARD" | "NEQUI" | "PSE" | "BANCOLOMBIA_TRANSFER";
  };
  reference: string; // Referencia única de la transacción
  redirect_url?: string; // URL de redirección después del pago
  customer_data?: {
    full_name: string;
    phone_number?: string;
  };
  acceptance_token?: string; // Token de aceptación de términos (opcional)
}

export interface WompiCheckoutResponse {
  data: {
    id: string; // Transaction ID
    checkout_url: string; // URL para redirigir al usuario
  };
}

export interface WompiTransactionStatus {
  data: {
    id: string;
    status: "APPROVED" | "DECLINED" | "VOIDED" | "PENDING" | "ERROR";
    amount_in_cents: number;
    currency: string;
    reference: string;
    created_at: string;
    finalized_at?: string;
    payment_method_type: string;
  };
}

/**
 * Crea un Link de Pago en Wompi (no requiere token)
 * Este método crea un link donde el usuario puede ingresar sus datos
 */
export async function createWompiPaymentLink(
  amountInCents: number,
  currency: string,
  customerEmail: string,
  reference: string,
  redirectUrl: string,
  customerName: string
): Promise<{ checkoutUrl: string; linkId: string }> {
  if (!WOMPI_PRIVATE_KEY) {
    throw new Error(
      "VITE_WOMPI_PRIVATE_KEY no está configurada. Por favor configura las variables de entorno de Wompi."
    );
  }

  // Intentar crear un link de pago usando el endpoint de payment-links
  // Si este endpoint no existe, usaremos una alternativa
  const linkRequest = {
    name: `Suscripción ${reference}`,
    description: `Pago de suscripción - ${reference}`,
    single_use: true,
    collect_shipping: false,
    amount_in_cents: amountInCents,
    currency: currency,
    customer_data: {
      email: customerEmail,
      full_name: customerName,
    },
    redirect_url: redirectUrl,
  };

  console.log("Creating Wompi Payment Link:", {
    url: `${WOMPI_BASE_URL}/payment_links`,
    request: linkRequest,
  });

  try {
    const response = await fetch(`${WOMPI_BASE_URL}/payment_links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
      },
      body: JSON.stringify(linkRequest),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data?.checkout_url || data.data?.url) {
        return {
          checkoutUrl: data.data.checkout_url || data.data.url,
          linkId: data.data.id || reference,
        };
      }
    }
  } catch (error) {
    console.warn("Payment links endpoint not available, trying alternative:", error);
  }

  // Si el endpoint de payment_links no funciona, lanzar error
  throw new Error(
    "No se pudo crear el link de pago. El endpoint de payment_links puede no estar disponible."
  );
}

/**
 * Crea una transacción de pago en Wompi
 * NOTA: Este endpoint requiere token cuando se especifica payment_method
 */
export async function createWompiCheckout(
  request: WompiCheckoutRequest
): Promise<WompiCheckoutResponse> {
  // Validar que las keys estén configuradas
  if (!WOMPI_PRIVATE_KEY) {
    throw new Error(
      "VITE_WOMPI_PRIVATE_KEY no está configurada. Por favor configura las variables de entorno de Wompi."
    );
  }

  if (!WOMPI_PUBLIC_KEY) {
    console.warn("VITE_WOMPI_PUBLIC_KEY no está configurada");
  }

  console.log("Wompi Checkout Request:", {
    url: `${WOMPI_BASE_URL}/transactions`,
    environment: WOMPI_ENVIRONMENT,
    hasPublicKey: !!WOMPI_PUBLIC_KEY,
    hasPrivateKey: !!WOMPI_PRIVATE_KEY,
    requestBody: {
      ...request,
      amount_in_cents: request.amount_in_cents,
    },
  });

  // Intentar primero con el endpoint /transactions
  // Si falla, podríamos necesitar usar otro endpoint o enfoque
  const response = await fetch(`${WOMPI_BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = `Error ${response.status}: ${response.statusText}`;
    let errorDetails: any = null;
    
    try {
      const errorData = await response.json();
      errorDetails = errorData;
      console.error("Wompi API Error Response:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        requestBody: request,
      });
      
      // Mensajes de error más específicos
      if (errorData.error?.type === "AUTHENTICATION_ERROR") {
        errorMessage = "Error de autenticación con Wompi. Verifica tus credenciales y que estén configuradas correctamente.";
      } else if (errorData.error?.type === "VALIDATION_ERROR") {
        const validationErrors = errorData.error.messages || [];
        const errorMsg = errorData.error.message || "";
        errorMessage = `Error de validación: ${validationErrors.length > 0 ? validationErrors.join(", ") : errorMsg || "Datos inválidos"}`;
        
        // Agregar detalles adicionales si están disponibles
        if (errorData.error?.data) {
          errorMessage += ` | Detalles: ${JSON.stringify(errorData.error.data)}`;
        }
      } else if (errorData.error?.message) {
        errorMessage = `${errorData.error.message}${errorData.error.data ? ` | ${JSON.stringify(errorData.error.data)}` : ""}`;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else {
        // Si no hay mensaje específico, mostrar toda la estructura del error
        errorMessage = `Error ${response.status}: ${JSON.stringify(errorData)}`;
      }
    } catch (e) {
      // Si no se puede parsear el error, usar el mensaje por defecto
      const text = await response.text().catch(() => "");
      console.error("Error response text (no JSON):", text);
      errorMessage = `Error ${response.status}: No se pudo procesar la respuesta del servidor. ${text ? `Detalles: ${text.substring(0, 500)}` : ""}`;
    }

    // Lanzar error con más contexto
    const fullError = new Error(errorMessage);
    (fullError as any).details = errorDetails;
    (fullError as any).status = response.status;
    throw fullError;
  }

  const data = await response.json();
  console.log("Wompi API Success Response:", {
    hasData: !!data.data,
    transactionId: data.data?.id,
    hasCheckoutUrl: !!data.data?.checkout_url,
  });
  
  if (!data.data?.checkout_url) {
    console.error("Wompi Response Structure:", data);
    throw new Error("Wompi no retornó una URL de checkout válida. La respuesta no contiene 'data.checkout_url'");
  }

  return data;
}

/**
 * Obtiene el estado de una transacción en Wompi
 */
export async function getWompiTransactionStatus(
  transactionId: string
): Promise<WompiTransactionStatus> {
  if (!WOMPI_PRIVATE_KEY) {
    throw new Error(
      "VITE_WOMPI_PRIVATE_KEY no está configurada. No se puede verificar el estado de la transacción."
    );
  }

  console.log("Verificando estado de transacción Wompi:", {
    transactionId,
    url: `${WOMPI_BASE_URL}/transactions/${transactionId}`,
  });

  const response = await fetch(`${WOMPI_BASE_URL}/transactions/${transactionId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Error al obtener estado de transacción:", {
      status: response.status,
      error,
    });
    throw new Error(
      error.error?.message || `Error al obtener estado: ${response.statusText}`
    );
  }

  const data = await response.json();
  console.log("Estado de transacción obtenido:", {
    transactionId: data.data?.id,
    status: data.data?.status,
  });

  return data;
}

/**
 * Valida la firma de un webhook de Wompi
 */
export function validateWompiWebhookSignature(
  payload: string,
  signature: string,
  event: string
): boolean {
  // Wompi usa HMAC SHA256 para firmar webhooks
  // La firma se calcula como: HMAC_SHA256(event + payload, secret_key)
  // Por ahora retornamos true, pero deberías implementar la validación real
  // usando la secret key de Wompi
  return true; // TODO: Implementar validación real
}

/**
 * Convierte pesos colombianos a centavos (Wompi usa centavos)
 */
export function copToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convierte centavos a pesos colombianos
 */
export function centsToCop(amount: number): number {
  return amount / 100;
}

/**
 * Diagnóstico de configuración de Wompi
 * Útil para verificar que todo esté configurado correctamente
 */
export function getWompiDiagnostics() {
  const hasPublicKey = !!WOMPI_PUBLIC_KEY;
  const hasPrivateKey = !!WOMPI_PRIVATE_KEY;
  const environment = WOMPI_ENVIRONMENT;
  const baseUrl = WOMPI_BASE_URL;
  
  const publicKeyPrefix = WOMPI_PUBLIC_KEY?.substring(0, 8) || "N/A";
  const privateKeyPrefix = WOMPI_PRIVATE_KEY?.substring(0, 8) || "N/A";
  
  const isValidSandboxConfig = 
    environment === "sandbox" && 
    publicKeyPrefix.startsWith("pub_test") && 
    privateKeyPrefix.startsWith("prv_test");
  
  const isValidProductionConfig = 
    environment === "production" && 
    publicKeyPrefix.startsWith("pub_prod") && 
    privateKeyPrefix.startsWith("prv_prod");
  
  const isConfigured = hasPublicKey && hasPrivateKey;
  const isValidConfig = isValidSandboxConfig || isValidProductionConfig;
  
  return {
    isConfigured,
    isValidConfig,
    environment,
    baseUrl,
    hasPublicKey,
    hasPrivateKey,
    publicKeyPrefix,
    privateKeyPrefix,
    issues: [
      !hasPublicKey && "VITE_WOMPI_PUBLIC_KEY no está configurada",
      !hasPrivateKey && "VITE_WOMPI_PRIVATE_KEY no está configurada",
      hasPublicKey && !publicKeyPrefix.startsWith("pub_") && "La clave pública no tiene el formato correcto",
      hasPrivateKey && !privateKeyPrefix.startsWith("prv_") && "La clave privada no tiene el formato correcto",
      environment === "sandbox" && hasPublicKey && !publicKeyPrefix.startsWith("pub_test") && "La clave pública no es de sandbox",
      environment === "sandbox" && hasPrivateKey && !privateKeyPrefix.startsWith("prv_test") && "La clave privada no es de sandbox",
      environment === "production" && hasPublicKey && !publicKeyPrefix.startsWith("pub_prod") && "La clave pública no es de producción",
      environment === "production" && hasPrivateKey && !privateKeyPrefix.startsWith("prv_prod") && "La clave privada no es de producción",
    ].filter(Boolean) as string[],
  };
}
