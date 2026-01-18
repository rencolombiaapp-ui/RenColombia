import { supabase } from "@/integrations/supabase/client";
import { getUserActivePlan } from "./subscriptionService";

/**
 * Tipos de verificación KYC soportados
 */
export type KYCVerificationType = "person" | "company" | "property";

/**
 * Estados de verificación KYC
 */
export type KYCStatus = "pending" | "verified" | "rejected" | "expired";

/**
 * Tipos de documento para persona natural
 */
export type DocumentType = "cc" | "ce" | "passport" | "nit";

/**
 * Tipos de documento para inmueble
 */
export type PropertyDocumentType = "escritura" | "certificado" | "otro";

/**
 * Registro de verificación KYC
 */
export interface KYCVerification {
  id: string;
  user_id: string;
  verification_type: KYCVerificationType;
  status: KYCStatus;
  document_type: DocumentType | null;
  document_number: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  company_name: string | null;
  company_nit: string | null;
  company_document_url: string | null;
  property_id: string | null;
  property_document_type: PropertyDocumentType | null;
  property_document_url: string | null;
  verified_at: string | null;
  verified_by: "system" | "manual" | "third_party" | null;
  rejection_reason: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Parámetros para iniciar verificación de persona natural
 */
export interface StartPersonVerificationParams {
  userId: string;
  documentType: DocumentType;
  documentNumber: string;
  documentFrontUrl: string;
  documentBackUrl?: string;
  selfieUrl: string;
}

/**
 * Parámetros para iniciar verificación de empresa
 */
export interface StartCompanyVerificationParams {
  userId: string;
  companyName: string;
  companyNit: string;
  companyDocumentUrl: string;
}

/**
 * Parámetros para iniciar verificación de inmueble
 */
export interface StartPropertyVerificationParams {
  userId: string;
  propertyId: string;
  propertyDocumentType: PropertyDocumentType;
  propertyDocumentUrl: string;
}

/**
 * Resultado de completar verificación
 */
export interface CompleteVerificationResult {
  id: string;
  user_id: string;
  verification_type: KYCVerificationType;
  status: KYCStatus;
  verified_at: string;
  verified_by: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Verifica si el usuario tiene plan PRO activo
 */
async function checkProAccess(userId: string): Promise<void> {
  const activePlan = await getUserActivePlan(userId);
  
  if (!activePlan) {
    throw new Error("Debes tener un plan PRO activo para realizar verificaciones KYC");
  }
  
  // Verificar que el plan sea PRO
  const isPro = activePlan.plan_id?.includes("_pro") || 
                activePlan.plan_id === "tenant_pro" ||
                activePlan.plan_id === "landlord_pro" ||
                activePlan.plan_id === "inmobiliaria_pro";
  
  if (!isPro) {
    throw new Error("Debes tener un plan PRO activo para realizar verificaciones KYC");
  }
}

/**
 * Inicia una verificación KYC para persona natural
 * Solo usuarios PRO pueden iniciar verificaciones
 */
export async function startPersonVerification(
  params: StartPersonVerificationParams
): Promise<KYCVerification> {
  const { userId, documentType, documentNumber, documentFrontUrl, documentBackUrl, selfieUrl } = params;
  
  // Verificar acceso PRO
  await checkProAccess(userId);
  
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error("No autorizado: solo puedes iniciar verificaciones para tu propio usuario");
  }
  
  // Llamar a la función RPC
  const { data: verificationId, error } = await supabase.rpc("start_verification", {
    p_user_id: userId,
    p_verification_type: "person",
    p_document_type: documentType,
    p_document_number: documentNumber,
    p_document_front_url: documentFrontUrl,
    p_document_back_url: documentBackUrl || null,
    p_selfie_url: selfieUrl,
  });
  
  if (error) {
    console.error("Error al iniciar verificación de persona:", error);
    throw new Error(error.message || "Error al iniciar verificación de persona");
  }
  
  // Obtener la verificación creada
  const { data: verification, error: fetchError } = await supabase
    .from("kyc_verifications")
    .select("*")
    .eq("id", verificationId)
    .single();
  
  if (fetchError || !verification) {
    throw new Error("Error al obtener la verificación creada");
  }
  
  return verification as KYCVerification;
}

/**
 * Inicia una verificación KYC para empresa/inmobiliaria
 * Solo usuarios PRO pueden iniciar verificaciones
 */
export async function startCompanyVerification(
  params: StartCompanyVerificationParams
): Promise<KYCVerification> {
  const { userId, companyName, companyNit, companyDocumentUrl } = params;
  
  // Verificar acceso PRO
  await checkProAccess(userId);
  
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error("No autorizado: solo puedes iniciar verificaciones para tu propio usuario");
  }
  
  // Llamar a la función RPC
  const { data: verificationId, error } = await supabase.rpc("start_verification", {
    p_user_id: userId,
    p_verification_type: "company",
    p_company_name: companyName,
    p_company_nit: companyNit,
    p_company_document_url: companyDocumentUrl,
  });
  
  if (error) {
    console.error("Error al iniciar verificación de empresa:", error);
    throw new Error(error.message || "Error al iniciar verificación de empresa");
  }
  
  // Obtener la verificación creada
  const { data: verification, error: fetchError } = await supabase
    .from("kyc_verifications")
    .select("*")
    .eq("id", verificationId)
    .single();
  
  if (fetchError || !verification) {
    throw new Error("Error al obtener la verificación creada");
  }
  
  return verification as KYCVerification;
}

/**
 * Inicia una verificación KYC para inmueble
 * Solo usuarios PRO pueden iniciar verificaciones
 */
export async function startPropertyVerification(
  params: StartPropertyVerificationParams
): Promise<KYCVerification> {
  const { userId, propertyId, propertyDocumentType, propertyDocumentUrl } = params;
  
  // Verificar acceso PRO
  await checkProAccess(userId);
  
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error("No autorizado: solo puedes iniciar verificaciones para tu propio usuario");
  }
  
  // Verificar que el usuario sea propietario del inmueble
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("owner_id")
    .eq("id", propertyId)
    .single();
  
  if (propertyError || !property) {
    throw new Error("Inmueble no encontrado");
  }
  
  if (property.owner_id !== userId) {
    throw new Error("No autorizado: solo puedes verificar tus propios inmuebles");
  }
  
  // Llamar a la función RPC
  const { data: verificationId, error } = await supabase.rpc("start_verification", {
    p_user_id: userId,
    p_verification_type: "property",
    p_property_id: propertyId,
    p_property_document_type: propertyDocumentType,
    p_property_document_url: propertyDocumentUrl,
  });
  
  if (error) {
    console.error("Error al iniciar verificación de inmueble:", error);
    throw new Error(error.message || "Error al iniciar verificación de inmueble");
  }
  
  // Obtener la verificación creada
  const { data: verification, error: fetchError } = await supabase
    .from("kyc_verifications")
    .select("*")
    .eq("id", verificationId)
    .single();
  
  if (fetchError || !verification) {
    throw new Error("Error al obtener la verificación creada");
  }
  
  return verification as KYCVerification;
}

/**
 * Completa una verificación KYC (mock - siempre aprueba si hay documentos)
 * Solo usuarios PRO pueden completar verificaciones
 */
export async function completeVerification(
  verificationId: string
): Promise<CompleteVerificationResult> {
  // Obtener la verificación para validar permisos
  const { data: verification, error: fetchError } = await supabase
    .from("kyc_verifications")
    .select("user_id, status")
    .eq("id", verificationId)
    .single();
  
  if (fetchError || !verification) {
    throw new Error("Verificación no encontrada");
  }
  
  // Verificar acceso PRO
  await checkProAccess(verification.user_id);
  
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== verification.user_id) {
    throw new Error("No autorizado: solo puedes completar tus propias verificaciones");
  }
  
  // Validar que la verificación esté en estado pending
  if (verification.status !== "pending") {
    throw new Error(`La verificación debe estar en estado pending para ser completada. Estado actual: ${verification.status}`);
  }
  
  // Llamar a la función RPC (mock - siempre aprueba)
  const { data: result, error } = await supabase.rpc("complete_verification", {
    p_verification_id: verificationId,
  });
  
  if (error) {
    console.error("Error al completar verificación:", error);
    throw new Error(error.message || "Error al completar verificación");
  }
  
  return result as CompleteVerificationResult;
}

/**
 * Obtiene todas las verificaciones KYC de un usuario
 */
export async function getUserKYCVerifications(
  userId: string
): Promise<KYCVerification[]> {
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error("No autorizado: solo puedes ver tus propias verificaciones");
  }
  
  const { data: verifications, error } = await supabase
    .from("kyc_verifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error al obtener verificaciones:", error);
    throw new Error("Error al obtener verificaciones");
  }
  
  return (verifications || []) as KYCVerification[];
}

/**
 * Obtiene el estado de verificación KYC de un usuario por tipo
 */
export async function getUserKYCStatus(
  userId: string,
  verificationType: KYCVerificationType
): Promise<KYCVerification | null> {
  // Validar que el usuario autenticado sea el mismo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error("No autorizado: solo puedes ver tus propias verificaciones");
  }
  
  const { data: status, error } = await supabase.rpc("get_user_kyc_status", {
    p_user_id: userId,
    p_verification_type: verificationType,
  });
  
  if (error) {
    console.error("Error al obtener estado de verificación:", error);
    return null;
  }
  
  if (!status || status === "null") {
    return null;
  }
  
  // Obtener la verificación completa
  const { data: verification, error: fetchError } = await supabase
    .from("kyc_verifications")
    .select("*")
    .eq("id", (status as any).id)
    .single();
  
  if (fetchError || !verification) {
    return null;
  }
  
  return verification as KYCVerification;
}

/**
 * Verifica si un usuario tiene una verificación activa (verified y no expirada) por tipo
 */
export async function hasActiveKYCVerification(
  userId: string,
  verificationType: KYCVerificationType
): Promise<boolean> {
  const verification = await getUserKYCStatus(userId, verificationType);
  
  if (!verification) {
    return false;
  }
  
  if (verification.status !== "verified") {
    return false;
  }
  
  // Verificar si está expirada
  if (verification.expires_at) {
    const expiresAt = new Date(verification.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      return false;
    }
  }
  
  return true;
}
