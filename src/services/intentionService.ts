import { supabase } from "@/integrations/supabase/client";

export interface PropertyIntention {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  status: "pending" | "viewed" | "contacted" | "closed";
  created_at: string;
  updated_at: string;
}

export interface PropertyIntentionWithDetails extends PropertyIntention {
  property_title: string;
  property_city: string;
  property_neighborhood: string | null;
  property_price: number;
  property_image_url: string | null;
  tenant_name: string | null;
  tenant_email: string;
  tenant_has_insurance_approval: boolean;
}

export interface CreatePropertyIntentionParams {
  propertyId: string;
  tenantId: string;
  ownerId: string;
}

/**
 * Crea una nueva intención de arrendar un inmueble
 */
export async function createPropertyIntention(
  params: CreatePropertyIntentionParams
): Promise<PropertyIntention> {
  const { propertyId, tenantId, ownerId } = params;

  // Verificar si existe alguna intención (activa o cerrada) para este inquilino e inmueble
  // Debido al constraint unique(tenant_id, property_id), solo puede haber una intención
  const { data: existing } = await supabase
    .from("property_intentions")
    .select("id, status")
    .eq("property_id", propertyId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (existing) {
    // Si existe una intención activa, retornar la existente
    if (existing.status !== "closed") {
      const { data: intention } = await supabase
        .from("property_intentions")
        .select("*")
        .eq("id", existing.id)
        .maybeSingle();

      if (intention) {
        console.log("Intención activa existente encontrada, no se crea duplicado");
        return intention as PropertyIntention;
      }
    } else {
      // Si la intención está cerrada, reactivarla y crear notificación
      console.log("Intención cerrada encontrada, reactivándola...", { 
        intentionId: existing.id, 
        tenantId, 
        propertyId 
      });
      
      const { data: reactivatedIntention, error: updateError } = await supabase
        .from("property_intentions")
        .update({ status: "pending" })
        .eq("id", existing.id)
        .eq("tenant_id", tenantId) // Agregar esta condición para asegurar que es el inquilino correcto
        .select()
        .maybeSingle();

      if (updateError) {
        console.error("Error reactivating intention:", updateError);
        // Si el error es de permisos RLS, intentar crear una nueva intención eliminando la cerrada primero
        if (updateError.code === "42501" || updateError.message?.includes("permission") || updateError.message?.includes("policy")) {
          console.log("Error de permisos detectado, intentando eliminar y recrear la intención...");
          // Eliminar la intención cerrada
          const { error: deleteError } = await supabase
            .from("property_intentions")
            .delete()
            .eq("id", existing.id)
            .eq("tenant_id", tenantId);
          
          if (deleteError) {
            console.error("Error eliminando intención cerrada:", deleteError);
            throw new Error(`Error al reactivar la intención: ${updateError.message}`);
          }
          
          // Crear nueva intención (esto activará el trigger de notificación)
          const { data: newIntention, error: insertError } = await supabase
            .from("property_intentions")
            .insert({
              property_id: propertyId,
              tenant_id: tenantId,
              owner_id: ownerId,
              status: "pending",
            })
            .select()
            .single();
          
          if (insertError) {
            console.error("Error creando nueva intención después de eliminar cerrada:", insertError);
            throw new Error(`Error al crear la intención: ${insertError.message}`);
          }
          
          return newIntention as PropertyIntention;
        }
        throw new Error(`Error al reactivar la intención: ${updateError.message}`);
      }

      if (!reactivatedIntention) {
        console.error("No se pudo reactivar la intención - resultado null", { existing });
        throw new Error("No se pudo reactivar la intención. Por favor, intenta nuevamente.");
      }
      
      console.log("Intención reactivada exitosamente:", reactivatedIntention);

      // Crear notificación manualmente ya que el trigger solo se ejecuta en INSERT
      try {
        const { data: propertyData, error: propError } = await supabase
          .from("properties")
          .select("title")
          .eq("id", propertyId)
          .maybeSingle();

        const { data: tenantData, error: tenantError } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", tenantId)
          .maybeSingle();

        const tenantName = tenantData?.full_name || tenantData?.email || "Un inquilino";
        const propertyTitle = propertyData?.title || "Sin título";

        const { error: notifError } = await supabase.rpc("create_notification", {
          p_user_id: ownerId,
          p_type: "property_intention",
          p_title: "Nueva intención de arrendamiento",
          p_message: `El inquilino ${tenantName} quiere arrendar tu inmueble: ${propertyTitle}`,
          p_related_id: propertyId,
        });

        if (notifError) {
          console.warn("Error creando notificación manual:", notifError);
        } else {
          console.log("Notificación creada manualmente para intención reactivada");
        }
      } catch (notifError) {
        console.warn("Error creando notificación manual:", notifError);
        // No fallar si la notificación no se puede crear
      }

      return reactivatedIntention as PropertyIntention;
    }
  }

  // Crear nueva intención (esto activará el trigger de notificación)
  console.log("Creando nueva intención, esto debería activar el trigger de notificación");
  const { data, error } = await supabase
    .from("property_intentions")
    .insert({
      property_id: propertyId,
      tenant_id: tenantId,
      owner_id: ownerId,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating property intention:", error);
    throw new Error(`Error al crear la intención: ${error.message}`);
  }

  console.log("Intención creada exitosamente:", data);
  return data as PropertyIntention;
}

/**
 * Obtiene las intenciones de un propietario
 */
export async function getOwnerIntentions(
  ownerId: string
): Promise<PropertyIntentionWithDetails[]> {
  try {
    // Obtener TODAS las intenciones del propietario, incluyendo cerradas
    // Varios inquilinos pueden tener intención de arrendar el mismo inmueble
    const { data, error } = await supabase
      .from("property_intentions")
      .select(`
        *,
        properties!property_intentions_property_id_fkey (
          title,
          city,
          neighborhood,
          price,
          property_images (url, is_primary)
        ),
        profiles!property_intentions_tenant_id_fkey (
          full_name,
          email
        )
      `)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      // Si la tabla no existe aún, retornar array vacío silenciosamente
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("Property intentions table does not exist yet");
        return [];
      }
      console.error("Error fetching owner intentions:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Verificar aprobaciones de seguro para cada inquilino
    const intentionsWithDetails = await Promise.all(
      data.map(async (intention: any) => {
        let hasApproval = false;
        try {
          const { data: approvalData } = await supabase.rpc(
            "has_active_insurance_approval",
            {
              tenant_uuid: intention.tenant_id,
            }
          );
          hasApproval = approvalData === true;
        } catch (rpcError: any) {
          // Si la función RPC no existe aún, continuar sin aprobación
          if (rpcError.code !== "42883" && !rpcError.message?.includes("does not exist")) {
            console.warn("Error checking insurance approval:", rpcError);
          }
        }

        const propertyImages = Array.isArray(intention.properties?.property_images)
          ? intention.properties.property_images
          : [];
        
        const primaryImage =
          propertyImages.find((img: any) => img.is_primary) || propertyImages[0];

        return {
          id: intention.id,
          property_id: intention.property_id,
          tenant_id: intention.tenant_id,
          owner_id: intention.owner_id,
          status: intention.status,
          created_at: intention.created_at,
          updated_at: intention.updated_at,
          property_title: intention.properties?.title || "",
          property_city: intention.properties?.city || "",
          property_neighborhood: intention.properties?.neighborhood || null,
          property_price: intention.properties?.price || 0,
          property_image_url: primaryImage?.url || null,
          tenant_name: intention.profiles?.full_name || null,
          tenant_email: intention.profiles?.email || "",
          tenant_has_insurance_approval: hasApproval,
        } as PropertyIntentionWithDetails;
      })
    );

    return intentionsWithDetails;
  } catch (error) {
    console.error("Error in getOwnerIntentions:", error);
    return [];
  }
}

/**
 * Obtiene las intenciones de un inquilino
 */
export async function getTenantIntentions(
  tenantId: string
): Promise<PropertyIntention[]> {
  const { data, error } = await supabase
    .from("property_intentions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tenant intentions:", error);
    return [];
  }

  return (data || []) as PropertyIntention[];
}

/**
 * Actualiza el estado de una intención (solo propietario)
 */
export async function updateIntentionStatus(
  intentionId: string,
  ownerId: string,
  status: PropertyIntention["status"]
): Promise<void> {
  const { error } = await supabase
    .from("property_intentions")
    .update({ status })
    .eq("id", intentionId)
    .eq("owner_id", ownerId);

  if (error) {
    console.error("Error updating intention status:", error);
    throw new Error(`Error al actualizar el estado: ${error.message}`);
  }
}

/**
 * Verifica si un inquilino ya manifestó intención activa sobre un inmueble
 * Solo considera intenciones activas (pending, viewed, contacted)
 * NO considera intenciones cerradas (closed) para permitir volver a manifestar interés
 */
export async function hasIntentionForProperty(
  propertyId: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("property_intentions")
    .select("id, status")
    .eq("property_id", propertyId)
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "viewed", "contacted"]) // Solo considerar estados activos, no "closed"
    .maybeSingle(); // Usar maybeSingle para manejar mejor cuando no hay resultados

  if (error) {
    console.error("Error checking intention:", error);
    return false;
  }

  // Si existe una intención activa (no cerrada), retornar true
  return !!data && data.status !== "closed";
}
