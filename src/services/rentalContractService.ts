import { supabase } from "@/integrations/supabase/client";
import { getUserActivePlan } from "./subscriptionService";
import { hasActiveKYCVerification } from "./kycService";

/**
 * Estados de contrato de arrendamiento
 */
export type RentalContractStatus = 
  | "draft" 
  | "pending_tenant" 
  | "pending_owner" 
  | "approved" 
  | "signed" 
  | "active" 
  | "cancelled" 
  | "expired";

/**
 * Contrato de arrendamiento
 */
export interface RentalContract {
  id: string;
  contract_request_id: string | null;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  status: RentalContractStatus;
  contract_template_id: string | null;
  contract_content: string;
  contract_pdf_url: string | null;
  monthly_rent: number;
  deposit_amount: number | null;
  contract_duration_months: number | null;
  start_date: string | null;
  end_date: string | null;
  owner_approved_at: string | null;
  tenant_approved_at: string | null;
  owner_signed_at: string | null;
  tenant_signed_at: string | null;
  version: number;
  parent_contract_id: string | null;
  legal_disclaimer_accepted_at: string | null;
  tenant_disclaimer_accepted_at: string | null;
  clauses: any; // JSONB array de cláusulas
  created_at: string;
  updated_at: string;
  signed_at: string | null;
  activated_at: string | null;
}

/**
 * Contrato con detalles extendidos
 */
export interface RentalContractWithDetails extends RentalContract {
  property_title: string;
  property_city: string;
  property_address: string | null;
  property_image_url: string | null;
  tenant_name: string | null;
  tenant_email: string;
  owner_name: string | null;
  owner_email: string;
}

/**
 * Parámetros para iniciar un contrato
 */
export interface StartContractParams {
  propertyId: string;
  tenantId: string;
  contractRequestId?: string;
  monthlyRent?: number;
  depositAmount?: number;
  contractDurationMonths?: number;
  startDate?: string; // ISO date string
}

/**
 * Verifica si el usuario tiene plan PRO activo (propietario/inmobiliaria)
 */
async function checkOwnerProAccess(userId: string): Promise<void> {
  const activePlan = await getUserActivePlan(userId);
  
  if (!activePlan) {
    throw new Error("Debes tener un plan PRO activo para iniciar contratos");
  }
  
  // Verificar que el plan sea PRO para propietarios/inmobiliarias
  const isPro = activePlan.plan_id?.includes("_pro") || 
                activePlan.plan_id === "landlord_pro" ||
                activePlan.plan_id === "inmobiliaria_pro";
  
  if (!isPro) {
    throw new Error("Debes tener un plan PRO activo para iniciar contratos");
  }
}

/**
 * Inicia un nuevo contrato de arrendamiento
 * Solo propietarios/inmobiliarias PRO pueden iniciar contratos
 * Ambos (propietario e inquilino) deben estar verificados KYC
 */
export async function startContract(
  params: StartContractParams
): Promise<RentalContract> {
  const { propertyId, tenantId, contractRequestId, monthlyRent, depositAmount, contractDurationMonths, startDate } = params;
  
  // Validar que el usuario autenticado sea el propietario
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autorizado");
  }
  
  // Obtener información del inmueble
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, owner_id, status, price")
    .eq("id", propertyId)
    .single();
  
  if (propertyError || !property) {
    throw new Error("Inmueble no encontrado");
  }
  
  if (property.owner_id !== user.id) {
    throw new Error("No autorizado: solo puedes iniciar contratos para tus propios inmuebles");
  }
  
  // Verificar acceso PRO del propietario
  await checkOwnerProAccess(user.id);
  
  // Validar verificación KYC del propietario
  const ownerKYCVerified = await hasActiveKYCVerification(user.id, "person") || 
                            await hasActiveKYCVerification(user.id, "company");
  
  if (!ownerKYCVerified) {
    throw new Error("Debes tener una verificación KYC activa (persona o empresa) para iniciar contratos");
  }
  
  // Validar verificación KYC del inquilino
  const tenantKYCVerified = await hasActiveKYCVerification(tenantId, "person");
  
  if (!tenantKYCVerified) {
    throw new Error("El inquilino debe tener una verificación KYC activa para iniciar contratos");
  }
  
  // Validar que el inmueble esté disponible
  if (property.status !== "published" && property.status !== "paused") {
    throw new Error(`Solo puedes iniciar contratos para inmuebles publicados o pausados. Estado actual: ${property.status}`);
  }
  
  // Verificar que no exista un contrato activo
  const { data: existingContract } = await supabase
    .from("rental_contracts")
    .select("id")
    .eq("property_id", propertyId)
    .in("status", ["draft", "pending_tenant", "pending_owner", "approved", "active"])
    .maybeSingle();
  
  if (existingContract) {
    throw new Error("Ya existe un contrato activo para este inmueble");
  }
  
  // Preparar parámetros para la función RPC
  const rpcParams: any = {
    p_property_id: propertyId,
    p_tenant_id: tenantId,
  };
  
  if (contractRequestId) {
    rpcParams.p_contract_request_id = contractRequestId;
  }
  
  if (monthlyRent !== undefined) {
    rpcParams.p_monthly_rent = monthlyRent;
  }
  
  if (depositAmount !== undefined) {
    rpcParams.p_deposit_amount = depositAmount;
  }
  
  if (contractDurationMonths !== undefined) {
    rpcParams.p_contract_duration_months = contractDurationMonths;
  }
  
  if (startDate) {
    rpcParams.p_start_date = startDate;
  }
  
  // Llamar a la función RPC
  const { data: contractId, error } = await supabase.rpc("start_contract", rpcParams);
  
  if (error) {
    console.error("Error al iniciar contrato:", error);
    throw new Error(error.message || "Error al iniciar contrato");
  }
  
  // Obtener el contrato creado
  const { data: contract, error: fetchError } = await supabase
    .from("rental_contracts")
    .select("*")
    .eq("id", contractId)
    .single();
  
  if (fetchError || !contract) {
    throw new Error("Error al obtener el contrato creado");
  }
  
  return contract as RentalContract;
}

/**
 * Obtiene todos los contratos de un propietario
 */
export async function getOwnerContracts(
  ownerId: string
): Promise<RentalContractWithDetails[]> {
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ownerId) {
    throw new Error("No autorizado: solo puedes ver tus propios contratos");
  }
  
  const { data: contracts, error } = await supabase
    .from("rental_contracts")
    .select(`
      *,
      properties:property_id (
        title,
        city,
        address,
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
    console.error("Error al obtener contratos:", error);
    throw new Error("Error al obtener contratos");
  }
  
  // Transformar los datos
  return (contracts || []).map((contract: any) => ({
    ...contract,
    property_title: contract.properties?.title || "Sin título",
    property_city: contract.properties?.city || "",
    property_address: contract.properties?.address || null,
    property_image_url: contract.properties?.property_images?.[0]?.url || null,
    tenant_name: contract.tenant?.full_name || null,
    tenant_email: contract.tenant?.email || "",
    owner_name: contract.owner?.publisher_type === "inmobiliaria" 
      ? contract.owner?.company_name 
      : contract.owner?.full_name || null,
    owner_email: contract.owner?.email || "",
  })) as RentalContractWithDetails[];
}

/**
 * Obtiene todos los contratos de un inquilino
 */
export async function getTenantContracts(
  tenantId: string
): Promise<RentalContractWithDetails[]> {
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== tenantId) {
    throw new Error("No autorizado: solo puedes ver tus propios contratos");
  }
  
  const { data: contracts, error } = await supabase
    .from("rental_contracts")
    .select(`
      *,
      properties:property_id (
        title,
        city,
        address,
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
    console.error("Error al obtener contratos:", error);
    throw new Error("Error al obtener contratos");
  }
  
  // Transformar los datos
  return (contracts || []).map((contract: any) => ({
    ...contract,
    property_title: contract.properties?.title || "Sin título",
    property_city: contract.properties?.city || "",
    property_address: contract.properties?.address || null,
    property_image_url: contract.properties?.property_images?.[0]?.url || null,
    tenant_name: contract.tenant?.full_name || null,
    tenant_email: contract.tenant?.email || "",
    owner_name: contract.owner?.publisher_type === "inmobiliaria" 
      ? contract.owner?.company_name 
      : contract.owner?.full_name || null,
    owner_email: contract.owner?.email || "",
  })) as RentalContractWithDetails[];
}

/**
 * Obtiene un contrato específico por ID
 */
export async function getContract(
  contractId: string
): Promise<RentalContractWithDetails | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autorizado");
  }
  
  const { data: contract, error } = await supabase
    .from("rental_contracts")
    .select(`
      *,
      properties:property_id (
        title,
        city,
        address,
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
    .eq("id", contractId)
    .single();
  
  if (error) {
    if (error.code === "PGRST116") {
      return null; // No encontrado
    }
    console.error("Error al obtener contrato:", error);
    throw new Error("Error al obtener contrato");
  }
  
  // Validar que el usuario sea participante
  if (contract.tenant_id !== user.id && contract.owner_id !== user.id) {
    throw new Error("No autorizado: solo puedes ver contratos en los que participas");
  }
  
  // Transformar los datos
  return {
    ...contract,
    property_title: contract.properties?.title || "Sin título",
    property_city: contract.properties?.city || "",
    property_address: contract.properties?.address || null,
    property_image_url: contract.properties?.property_images?.[0]?.url || null,
    tenant_name: contract.tenant?.full_name || null,
    tenant_email: contract.tenant?.email || "",
    owner_name: contract.owner?.publisher_type === "inmobiliaria" 
      ? contract.owner?.company_name 
      : contract.owner?.full_name || null,
    owner_email: contract.owner?.email || "",
  } as RentalContractWithDetails;
}

/**
 * Verifica si un inmueble tiene un contrato activo
 */
export async function hasActiveContract(
  propertyId: string
): Promise<boolean> {
  const { data: contract, error } = await supabase
    .from("rental_contracts")
    .select("id")
    .eq("property_id", propertyId)
    .in("status", ["draft", "pending_tenant", "pending_owner", "approved", "active"])
    .maybeSingle();
  
  if (error) {
    console.error("Error al verificar contrato activo:", error);
    return false;
  }
  
  return !!contract;
}

/**
 * Resultado de aprobar y enviar contrato
 */
export interface ApproveAndSendContractResult {
  id: string;
  status: RentalContractStatus;
  legal_disclaimer_accepted_at: string;
  updated_at: string;
  notification_sent: boolean;
}

/**
 * Aprobar y enviar contrato al inquilino
 * Solo propietarios pueden aprobar y enviar contratos
 * Requiere aceptación del disclaimer legal
 */
export async function approveAndSendContract(
  contractId: string,
  disclaimerAccepted: boolean
): Promise<ApproveAndSendContractResult> {
  // Validar que el usuario autenticado sea el propietario
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autorizado");
  }
  
  // Obtener el contrato para validar permisos
  const { data: contract, error: fetchError } = await supabase
    .from("rental_contracts")
    .select("id, owner_id, status")
    .eq("id", contractId)
    .single();
  
  if (fetchError || !contract) {
    throw new Error("Contrato no encontrado");
  }
  
  if (contract.owner_id !== user.id) {
    throw new Error("No autorizado: solo puedes aprobar y enviar tus propios contratos");
  }
  
  // Validar que el contrato esté en estado draft
  if (contract.status !== "draft") {
    throw new Error(`Solo puedes enviar contratos en estado draft. Estado actual: ${contract.status}`);
  }
  
  // Validar que el disclaimer haya sido aceptado
  if (!disclaimerAccepted) {
    throw new Error("Debes aceptar el disclaimer legal antes de enviar el contrato al inquilino");
  }
  
  // Llamar a la función RPC
  const { data: result, error } = await supabase.rpc("approve_and_send_contract", {
    p_contract_id: contractId,
    p_disclaimer_accepted: disclaimerAccepted,
  });
  
  if (error) {
    console.error("Error al aprobar y enviar contrato:", error);
    throw new Error(error.message || "Error al aprobar y enviar contrato");
  }
  
  return result as ApproveAndSendContractResult;
}

/**
 * Resultado de aprobar contrato por inquilino
 */
export interface TenantApproveContractResult {
  id: string;
  status: RentalContractStatus;
  tenant_approved_at: string;
  tenant_disclaimer_accepted_at: string;
  updated_at: string;
  notification_sent: boolean;
}

/**
 * Permite al inquilino aprobar el contrato
 * Requiere aceptación del disclaimer legal
 */
export async function tenantApproveContract(
  contractId: string,
  disclaimerAccepted: boolean
): Promise<TenantApproveContractResult> {
  // Validar que el usuario autenticado sea el inquilino
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autorizado");
  }
  
  // Obtener el contrato para validar permisos
  const { data: contract, error: fetchError } = await supabase
    .from("rental_contracts")
    .select("id, tenant_id, status")
    .eq("id", contractId)
    .single();
  
  if (fetchError || !contract) {
    throw new Error("Contrato no encontrado");
  }
  
  if (contract.tenant_id !== user.id) {
    throw new Error("No autorizado: solo puedes aprobar tus propios contratos");
  }
  
  // Validar que el contrato esté en estado pending_tenant
  if (contract.status !== "pending_tenant") {
    throw new Error(`Solo puedes aprobar contratos en estado pending_tenant. Estado actual: ${contract.status}`);
  }
  
  // Validar que el disclaimer haya sido aceptado
  if (!disclaimerAccepted) {
    throw new Error("Debes aceptar el disclaimer legal antes de aprobar el contrato");
  }
  
  // Llamar a la función RPC
  const { data: result, error } = await supabase.rpc("tenant_approve_contract", {
    p_contract_id: contractId,
    p_disclaimer_accepted: disclaimerAccepted,
  });
  
  if (error) {
    console.error("Error al aprobar contrato:", error);
    throw new Error(error.message || "Error al aprobar contrato");
  }
  
  return result as TenantApproveContractResult;
}

/**
 * Resultado de cancelar contrato y reactivar inmueble
 */
export interface CancelContractResult {
  contract_id: string;
  contract_status: RentalContractStatus;
  property_id: string;
  property_status: string;
  updated_at: string;
}

/**
 * Cancela el contrato y reactiva el inmueble
 * Solo propietarios pueden cancelar contratos
 */
export async function cancelContractAndReactivateProperty(
  contractId: string
): Promise<CancelContractResult> {
  // Validar que el usuario autenticado sea el propietario
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autorizado");
  }
  
  // Obtener el contrato para validar permisos
  const { data: contract, error: fetchError } = await supabase
    .from("rental_contracts")
    .select("id, owner_id, status")
    .eq("id", contractId)
    .single();
  
  if (fetchError || !contract) {
    throw new Error("Contrato no encontrado");
  }
  
  if (contract.owner_id !== user.id) {
    throw new Error("No autorizado: solo puedes cancelar tus propios contratos");
  }
  
  // Validar que el contrato esté en un estado cancelable
  if (["cancelled", "expired", "signed", "active"].includes(contract.status)) {
    throw new Error(
      `No se puede cancelar un contrato en estado: ${contract.status}. Solo se pueden cancelar contratos en estados: draft, pending_tenant, pending_owner, approved`
    );
  }
  
  // Llamar a la función RPC
  const { data: result, error } = await supabase.rpc("cancel_contract_and_reactivate_property", {
    p_contract_id: contractId,
  });
  
  if (error) {
    console.error("Error al cancelar contrato y reactivar inmueble:", error);
    throw new Error(error.message || "Error al cancelar contrato y reactivar inmueble");
  }
  
  return result as CancelContractResult;
}
