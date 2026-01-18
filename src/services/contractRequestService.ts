import { supabase } from "@/integrations/supabase/client";
import { getUserActivePlan } from "./subscriptionService";

/**
 * Estados de solicitud de contrato
 */
export type ContractRequestStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

/**
 * Estados de verificación KYC del inquilino
 */
export type TenantKYCStatus = "pending" | "verified" | "rejected" | "expired";

/**
 * Solicitud de contrato
 */
export interface ContractRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  status: ContractRequestStatus;
  requested_at: string;
  expires_at: string | null;
  tenant_kyc_status: TenantKYCStatus;
  tenant_kyc_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Solicitud de contrato con detalles extendidos
 */
export interface ContractRequestWithDetails extends ContractRequest {
  property_title: string;
  property_city: string;
  property_neighborhood: string | null;
  property_price: number;
  property_image_url: string | null;
  tenant_name: string | null;
  tenant_email: string;
  owner_name: string | null;
  owner_email: string;
}

/**
 * Parámetros para crear una solicitud de contrato
 */
export interface CreateContractRequestParams {
  propertyId: string;
  tenantId: string;
}

/**
 * Verifica si el usuario tiene plan PRO activo
 */
async function checkProAccess(userId: string): Promise<void> {
  const activePlan = await getUserActivePlan(userId);
  
  if (!activePlan) {
    throw new Error("Debes tener un plan PRO activo para solicitar contratos");
  }
  
  // Verificar que el plan sea PRO
  const isPro = activePlan.plan_id?.includes("_pro") || 
                activePlan.plan_id === "tenant_pro";
  
  if (!isPro) {
    throw new Error("Debes tener un plan PRO activo para solicitar contratos");
  }
}

/**
 * Crea una nueva solicitud de contrato
 * Solo inquilinos PRO pueden crear solicitudes
 * Solo inmuebles published pueden recibir solicitudes
 */
export async function createContractRequest(
  params: CreateContractRequestParams
): Promise<ContractRequest> {
  const { propertyId, tenantId } = params;
  
  // Verificar acceso PRO
  await checkProAccess(tenantId);
  
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== tenantId) {
    throw new Error("No autorizado: solo puedes crear solicitudes para tu propio usuario");
  }
  
  // Verificar que el inmueble existe y está publicado
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, status, owner_id")
    .eq("id", propertyId)
    .single();
  
  if (propertyError || !property) {
    throw new Error("Inmueble no encontrado");
  }
  
  if (property.status !== "published") {
    throw new Error(`Solo puedes solicitar contratos para inmuebles publicados. Estado actual: ${property.status}`);
  }
  
  // Validar que el inquilino no sea el propietario
  if (property.owner_id === tenantId) {
    throw new Error("No puedes solicitar un contrato para tu propio inmueble");
  }
  
  // GUARD DEFENSIVO: Verificar que el usuario esté autenticado antes de llamar RPC
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.id || user.id !== tenantId) {
    throw new Error("Usuario no autenticado o no coincide con el inquilino");
  }
  
  // Llamar a la función RPC
  const { data: requestId, error } = await supabase.rpc("create_contract_request", {
    p_property_id: propertyId,
    p_tenant_id: tenantId,
  });
  
  if (error) {
    console.error("Error al crear solicitud de contrato:", error);
    throw new Error(error.message || "Error al crear solicitud de contrato");
  }
  
  // Obtener la solicitud creada
  const { data: request, error: fetchError } = await supabase
    .from("contract_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  
  if (fetchError || !request) {
    throw new Error("Error al obtener la solicitud creada");
  }
  
  return request as ContractRequest;
}

/**
 * Obtiene todas las solicitudes de contrato de un inquilino
 */
export async function getTenantContractRequests(
  tenantId: string
): Promise<ContractRequestWithDetails[]> {
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== tenantId) {
    throw new Error("No autorizado: solo puedes ver tus propias solicitudes");
  }
  
  const { data: requests, error } = await supabase
    .from("contract_requests")
    .select(`
      *,
      properties:property_id (
        title,
        city,
        neighborhood,
        price,
        property_images:property_images!inner (
          url,
          is_primary
        )
      ),
      tenant:tenant_id (
        full_name,
        email
      ),
      owner:owner_id (
        full_name,
        email,
        company_name,
        publisher_type
      )
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error al obtener solicitudes de contrato:", error);
    throw new Error("Error al obtener solicitudes de contrato");
  }
  
  // Transformar los datos
  return (requests || []).map((req: any) => ({
    ...req,
    property_title: req.properties?.title || "Sin título",
    property_city: req.properties?.city || "",
    property_neighborhood: req.properties?.neighborhood || null,
    property_price: req.properties?.price || 0,
    property_image_url: req.properties?.property_images?.[0]?.url || null,
    tenant_name: req.tenant?.full_name || null,
    tenant_email: req.tenant?.email || "",
    owner_name: req.owner?.publisher_type === "inmobiliaria" 
      ? req.owner?.company_name 
      : req.owner?.full_name || null,
    owner_email: req.owner?.email || "",
  })) as ContractRequestWithDetails[];
}

/**
 * Obtiene todas las solicitudes de contrato de un propietario
 */
export async function getOwnerContractRequests(
  ownerId: string
): Promise<ContractRequestWithDetails[]> {
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ownerId) {
    throw new Error("No autorizado: solo puedes ver tus propias solicitudes");
  }
  
  const { data: requests, error } = await supabase
    .from("contract_requests")
    .select(`
      *,
      properties:property_id (
        title,
        city,
        neighborhood,
        price,
        property_images:property_images!inner (
          url,
          is_primary
        )
      ),
      tenant:tenant_id (
        full_name,
        email
      ),
      owner:owner_id (
        full_name,
        email,
        company_name,
        publisher_type
      )
    `)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error al obtener solicitudes de contrato:", error);
    throw new Error("Error al obtener solicitudes de contrato");
  }
  
  // Transformar los datos
  return (requests || []).map((req: any) => ({
    ...req,
    property_title: req.properties?.title || "Sin título",
    property_city: req.properties?.city || "",
    property_neighborhood: req.properties?.neighborhood || null,
    property_price: req.properties?.price || 0,
    property_image_url: req.properties?.property_images?.[0]?.url || null,
    tenant_name: req.tenant?.full_name || null,
    tenant_email: req.tenant?.email || "",
    owner_name: req.owner?.publisher_type === "inmobiliaria" 
      ? req.owner?.company_name 
      : req.owner?.full_name || null,
    owner_email: req.owner?.email || "",
  })) as ContractRequestWithDetails[];
}

/**
 * Obtiene una solicitud de contrato específica por ID
 */
export async function getContractRequest(
  requestId: string
): Promise<ContractRequestWithDetails | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autorizado");
  }
  
  const { data: request, error } = await supabase
    .from("contract_requests")
    .select(`
      *,
      properties:property_id (
        title,
        city,
        neighborhood,
        price,
        property_images:property_images!inner (
          url,
          is_primary
        )
      ),
      tenant:tenant_id (
        full_name,
        email
      ),
      owner:owner_id (
        full_name,
        email,
        company_name,
        publisher_type
      )
    `)
    .eq("id", requestId)
    .single();
  
  if (error) {
    if (error.code === "PGRST116") {
      return null; // No encontrado
    }
    console.error("Error al obtener solicitud de contrato:", error);
    throw new Error("Error al obtener solicitud de contrato");
  }
  
  // Validar que el usuario sea participante
  if (request.tenant_id !== user.id && request.owner_id !== user.id) {
    throw new Error("No autorizado: solo puedes ver solicitudes en las que participas");
  }
  
  // Transformar los datos
  return {
    ...request,
    property_title: request.properties?.title || "Sin título",
    property_city: request.properties?.city || "",
    property_neighborhood: request.properties?.neighborhood || null,
    property_price: request.properties?.price || 0,
    property_image_url: request.properties?.property_images?.[0]?.url || null,
    tenant_name: request.tenant?.full_name || null,
    tenant_email: request.tenant?.email || "",
    owner_name: request.owner?.publisher_type === "inmobiliaria" 
      ? request.owner?.company_name 
      : request.owner?.full_name || null,
    owner_email: request.owner?.email || "",
  } as ContractRequestWithDetails;
}

/**
 * Verifica si un inquilino ya tiene una solicitud activa para un inmueble
 */
export async function hasActiveContractRequest(
  tenantId: string,
  propertyId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== tenantId) {
    return false;
  }
  
  const { data: request, error } = await supabase
    .from("contract_requests")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("property_id", propertyId)
    .in("status", ["pending", "approved"])
    .maybeSingle();
  
  if (error) {
    console.error("Error al verificar solicitud activa:", error);
    return false;
  }
  
  return !!request;
}
