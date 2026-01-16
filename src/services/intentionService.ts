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

  // Verificar que no exista ya una intención para este inquilino e inmueble
  const { data: existing } = await supabase
    .from("property_intentions")
    .select("id")
    .eq("property_id", propertyId)
    .eq("tenant_id", tenantId)
    .single();

  if (existing) {
    // Si ya existe, retornar la existente
    const { data: intention } = await supabase
      .from("property_intentions")
      .select("*")
      .eq("id", existing.id)
      .single();

    return intention as PropertyIntention;
  }

  // Crear nueva intención
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

  return data as PropertyIntention;
}

/**
 * Obtiene las intenciones de un propietario
 */
export async function getOwnerIntentions(
  ownerId: string
): Promise<PropertyIntentionWithDetails[]> {
  try {
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
 * Verifica si un inquilino ya manifestó intención sobre un inmueble
 */
export async function hasIntentionForProperty(
  propertyId: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("property_intentions")
    .select("id")
    .eq("property_id", propertyId)
    .eq("tenant_id", tenantId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    console.error("Error checking intention:", error);
    return false;
  }

  return !!data;
}
