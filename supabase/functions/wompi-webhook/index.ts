// Edge Function para procesar webhooks de Wompi
// Deploy: supabase functions deploy wompi-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Crear cliente de Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obtener el webhook signature del header
    const signature = req.headers.get("x-wompi-signature");
    const event = req.headers.get("x-wompi-event");

    // Leer el body del webhook
    const payload = await req.text();

    // TODO: Validar la firma del webhook usando la secret key de Wompi
    // Por ahora procesamos el webhook sin validación (NO recomendado para producción)
    // const isValid = validateWompiWebhookSignature(payload, signature, event);
    // if (!isValid) {
    //   return new Response(
    //     JSON.stringify({ error: "Invalid signature" }),
    //     { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //   );
    // }

    const webhookData = JSON.parse(payload);

    // Procesar según el tipo de evento
    if (event === "transaction.updated" || webhookData.event === "transaction.updated") {
      const transaction = webhookData.data || webhookData;

      // Buscar suscripción por transaction_id
      const { data: subscription, error: subError } = await supabaseClient
        .from("subscriptions")
        .select("*")
        .eq("wompi_transaction_id", transaction.id)
        .single();

      if (subError || !subscription) {
        console.error("Subscription not found for transaction:", transaction.id);
        return new Response(
          JSON.stringify({ error: "Subscription not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Actualizar estado según el estado de la transacción
      if (transaction.status === "APPROVED") {
        // Activar suscripción
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 mes desde ahora

        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update({
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq("id", subscription.id);

        if (updateError) {
          console.error("Error updating subscription:", updateError);
          throw updateError;
        }

        // Registrar transacción de pago
        const { data: plan } = await supabaseClient
          .from("plans")
          .select("price_monthly, price_currency")
          .eq("id", subscription.plan_id)
          .single();

        if (plan) {
          await supabaseClient.from("payment_transactions").insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            plan_id: subscription.plan_id,
            wompi_transaction_id: transaction.id,
            amount: plan.price_monthly,
            currency: plan.price_currency || "COP",
            status: "approved",
            payment_method: transaction.payment_method_type?.toLowerCase() || "card",
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Subscription activated" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (transaction.status === "DECLINED" || transaction.status === "VOIDED") {
        // Cancelar suscripción
        await supabaseClient
          .from("subscriptions")
          .update({
            status: "expired",
          })
          .eq("id", subscription.id);

        // Registrar transacción fallida
        const { data: plan } = await supabaseClient
          .from("plans")
          .select("price_monthly, price_currency")
          .eq("id", subscription.plan_id)
          .single();

        if (plan) {
          await supabaseClient.from("payment_transactions").insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            plan_id: subscription.plan_id,
            wompi_transaction_id: transaction.id,
            amount: plan.price_monthly,
            currency: plan.price_currency || "COP",
            status: transaction.status === "DECLINED" ? "declined" : "voided",
            payment_method: transaction.payment_method_type?.toLowerCase() || "card",
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Subscription canceled" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
