import { supabase } from "@/integrations/supabase/client";
import { createWompiCheckout, copToCents, WompiCheckoutRequest } from "./wompiService";

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_currency: string;
  user_type: "tenant" | "landlord" | "inmobiliaria";
  features: string[];
  max_properties: number | null;
  includes_price_insights: boolean;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "canceled" | "expired" | "pending_payment";
  wompi_transaction_id: string | null;
  wompi_subscription_id: string | null;
  started_at: string;
  expires_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivePlan {
  plan_id: string;
  plan_name: string;
  includes_price_insights: boolean;
  max_properties: number | null;
  expires_at: string | null;
}

/**
 * Obtiene todos los planes disponibles para un tipo de usuario
 */
export async function getPlansForUserType(
  userType: "tenant" | "landlord" | "inmobiliaria"
): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("user_type", userType)
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) {
    console.error("Error fetching plans:", error);
    return [];
  }

  // Convertir features de jsonb a array de strings
  return (data || []).map((plan: any) => ({
    ...plan,
    features: Array.isArray(plan.features) ? plan.features : [],
  })) as Plan[];
}

/**
 * Obtiene el plan activo del usuario actual
 */
export async function getUserActivePlan(userId: string): Promise<ActivePlan | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_active_plan", {
      user_uuid: userId,
    });

    if (error) {
      // Si la función RPC no existe aún, retornar null silenciosamente
      if (error.code === "42883" || error.message?.includes("does not exist")) {
        console.warn("RPC function get_user_active_plan not found, returning null");
        return null;
      }
      console.error("Error fetching active plan:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as ActivePlan;
  } catch (error) {
    console.error("Error in getUserActivePlan:", error);
    return null;
  }
}

/**
 * Verifica si el usuario tiene acceso a price insights
 */
export async function userHasPriceInsightsAccess(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("user_has_price_insights_access", {
      user_uuid: userId,
    });

    if (error) {
      // Si la función RPC no existe aún, retornar false silenciosamente
      if (error.code === "42883" || error.message?.includes("does not exist")) {
        console.warn("RPC function user_has_price_insights_access not found, returning false");
        return false;
      }
      console.error("Error checking price insights access:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Error in userHasPriceInsightsAccess:", error);
    return false;
  }
}

/**
 * Crea una suscripción y checkout en Wompi
 */
export async function createSubscriptionCheckout(
  userId: string,
  planId: string,
  userEmail: string,
  userName: string
): Promise<{ checkoutUrl: string; subscriptionId: string }> {
  try {
    // 1. Obtener información del plan
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError) {
      console.error("Error fetching plan:", planError);
      throw new Error(`Plan no encontrado: ${planError.message}`);
    }

    if (!plan) {
      throw new Error(`Plan con ID "${planId}" no existe en la base de datos`);
    }

    // Validar que el plan tenga precio válido
    if (!plan.price_monthly || plan.price_monthly <= 0) {
      throw new Error("El plan seleccionado no tiene un precio válido");
    }

    // 2. Verificar si ya existe una suscripción activa o pendiente
    const { data: existingSubs, error: checkError } = await supabase
      .from("subscriptions")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .in("status", ["active", "pending_payment"])
      .order("created_at", { ascending: false });
    
    const activeSub = existingSubs?.find(sub => sub.status === "active");
    const pendingSubs = existingSubs?.filter(sub => sub.status === "pending_payment") || [];

    // Si hay una suscripción activa, no permitir crear otra
    if (activeSub) {
      throw new Error(
        "Ya tienes una suscripción activa. Cancela la actual antes de contratar una nueva."
      );
    }

    // Cancelar automáticamente todas las suscripciones pendientes
    // Esto permite reintentar el checkout si falló anteriormente
    if (pendingSubs.length > 0) {
      console.log(`Cancelando ${pendingSubs.length} suscripción(es) pendiente(s) para permitir nuevo checkout`);
      await supabase
        .from("subscriptions")
        .update({ 
          status: "expired",
          canceled_at: new Date().toISOString()
        })
        .in("id", pendingSubs.map(sub => sub.id));
    }

    // 3. Crear suscripción en estado pending_payment
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: "pending_payment",
      })
      .select()
      .single();

    if (subError) {
      console.error("Error creating subscription:", subError);
      // Manejar error de índice único (ya existe suscripción activa)
      if (subError.code === "23505") {
        throw new Error("Ya tienes una suscripción activa. Cancela la actual antes de contratar una nueva.");
      }
      throw new Error(`Error al crear suscripción: ${subError.message}`);
    }

    if (!subscription) {
      throw new Error("No se pudo crear la suscripción");
    }

    // 4. Verificar variables de entorno de Wompi
    const wompiPrivateKey = import.meta.env.VITE_WOMPI_PRIVATE_KEY;
    if (!wompiPrivateKey) {
      throw new Error(
        "Las credenciales de Wompi no están configuradas. Por favor configura VITE_WOMPI_PRIVATE_KEY en las variables de entorno."
      );
    }

    // 5. Validar datos antes de crear checkout
    if (!userEmail || !userEmail.includes("@")) {
      throw new Error("El email del usuario no es válido");
    }

    if (!userName || userName.trim() === "" || userName === "Usuario") {
      throw new Error("El nombre del usuario es requerido");
    }

    if (!plan.price_monthly || plan.price_monthly <= 0) {
      throw new Error(`El plan seleccionado no tiene un precio válido: ${plan.price_monthly}`);
    }

    // 5. Crear checkout en Wompi
    const reference = `sub_${subscription.id}_${Date.now()}`;
    const amountInCents = copToCents(plan.price_monthly);
    
    console.log("Creating Wompi checkout with:", {
      amount_in_cents: amountInCents,
      amount_cop: plan.price_monthly,
      currency: plan.price_currency || "COP",
      customer_email: userEmail,
      customer_name: userName,
      reference,
    });

    // Intentar crear un Link de Pago primero (no requiere token)
    // Si falla, intentaremos con el endpoint de transactions
    let wompiResponse;
    let checkoutUrl: string;
    
    try {
      // Intentar crear un payment link (más simple, no requiere token)
      try {
        const { createWompiPaymentLink } = await import("./wompiService");
        const paymentLink = await createWompiPaymentLink(
          amountInCents,
          plan.price_currency || "COP",
          userEmail.trim(),
          reference,
          `${window.location.origin}/checkout/confirm?subscription_id=${subscription.id}`,
          userName.trim()
        );
        checkoutUrl = paymentLink.checkoutUrl;
        wompiResponse = { data: { id: paymentLink.linkId, checkout_url: checkoutUrl } };
      } catch (paymentLinkError) {
        console.warn("Payment link creation failed, trying transactions endpoint:", paymentLinkError);
        
        // Si falla el payment link, intentar con transactions (requiere estructura diferente)
        // Crear checkout con payment_method usando installments mínimo
        const checkoutRequest: WompiCheckoutRequest = {
          amount_in_cents: amountInCents,
          currency: plan.price_currency || "COP",
          customer_email: userEmail.trim(),
          payment_method: {
            type: "CARD",
            installments: 1,
          },
          reference,
          redirect_url: `${window.location.origin}/checkout/confirm?subscription_id=${subscription.id}`,
          customer_data: {
            full_name: userName.trim(),
          },
        };

        wompiResponse = await createWompiCheckout(checkoutRequest);
        checkoutUrl = wompiResponse.data.checkout_url;
      }
    } catch (wompiError) {
      // Si falla Wompi, eliminar la suscripción creada
      await supabase.from("subscriptions").delete().eq("id", subscription.id);
      
      if (wompiError instanceof Error) {
        throw new Error(`Error al crear checkout en Wompi: ${wompiError.message}`);
      }
      throw new Error("Error al crear checkout en Wompi. Verifica tus credenciales.");
    }

    if (!checkoutUrl) {
      // Si no hay checkout_url, eliminar la suscripción
      await supabase.from("subscriptions").delete().eq("id", subscription.id);
      throw new Error("Wompi no retornó una URL de checkout válida");
    }

    // 6. Actualizar suscripción con el transaction_id o link_id de Wompi
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        wompi_transaction_id: wompiResponse.data.id,
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.warn("Error updating subscription with transaction_id:", updateError);
      // No lanzar error aquí, el checkout ya fue creado
    }

    return {
      checkoutUrl: checkoutUrl,
      subscriptionId: subscription.id,
    };
  } catch (error) {
    console.error("Error in createSubscriptionCheckout:", error);
    throw error;
  }
}

/**
 * Confirma una suscripción después de pago exitoso
 */
export async function confirmSubscription(
  subscriptionId: string,
  wompiTransactionId: string
): Promise<void> {
  // 1. Verificar estado en Wompi (esto debería hacerse desde el webhook, pero por seguridad lo verificamos)
  // Por ahora asumimos que el webhook ya validó el pago

  // 2. Actualizar suscripción a activa
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
      // Para planes mensuales, expira en 30 días
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) {
    throw new Error("Error al confirmar suscripción");
  }

  // 3. Registrar transacción de pago
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id, user_id")
    .eq("id", subscriptionId)
    .single();

  if (subscription) {
    const { data: plan } = await supabase
      .from("plans")
      .select("price_monthly, price_currency")
      .eq("id", subscription.plan_id)
      .single();

    if (plan) {
      await supabase.from("payment_transactions").insert({
        user_id: subscription.user_id,
        subscription_id: subscriptionId,
        plan_id: subscription.plan_id,
        wompi_transaction_id: wompiTransactionId,
        amount: plan.price_monthly,
        currency: plan.price_currency || "COP",
        status: "approved",
      });
    }
  }
}
