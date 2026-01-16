import { supabase } from "@/integrations/supabase/client";

export interface InsuranceApproval {
  id: string;
  user_id: string;
  insurer_name: string;
  document_url: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInsuranceApprovalParams {
  userId: string;
  insurerName: string;
  documentUrl: string;
  validUntil: string; // formato YYYY-MM-DD
}

/**
 * Lista de aseguradoras disponibles (referencial para MVP)
 */
export const AVAILABLE_INSURERS = [
  "Seguros del Estado",
  "Seguros Bolívar",
  "Seguros Sura",
  "Seguros Generales Suramericana",
  "Seguros Alfa",
  "Allianz Seguros",
  "Seguros Mundial",
  "Otro",
];

/**
 * Crea una nueva aprobación de seguro
 */
export async function createInsuranceApproval(
  params: CreateInsuranceApprovalParams
): Promise<InsuranceApproval> {
  const { userId, insurerName, documentUrl, validUntil } = params;

  // Validar fecha
  const validUntilDate = new Date(validUntil);
  if (validUntilDate < new Date()) {
    throw new Error("La fecha de vigencia no puede ser anterior a hoy");
  }

  const { data, error } = await supabase
    .from("tenant_insurance_approvals")
    .insert({
      user_id: userId,
      insurer_name: insurerName,
      document_url: documentUrl,
      valid_until: validUntil,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating insurance approval:", error);
    throw new Error(`Error al crear la aprobación: ${error.message}`);
  }

  return data as InsuranceApproval;
}

/**
 * Obtiene las aprobaciones activas de un usuario
 */
export async function getUserInsuranceApprovals(
  userId: string
): Promise<InsuranceApproval[]> {
  try {
    const { data, error } = await supabase
      .from("tenant_insurance_approvals")
      .select("*")
      .eq("user_id", userId)
      .gte("valid_until", new Date().toISOString().split("T")[0])
      .order("valid_until", { ascending: false });

    if (error) {
      // Si la tabla no existe aún, retornar array vacío silenciosamente
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("Insurance approvals table does not exist yet");
        return [];
      }
      console.error("Error fetching insurance approvals:", error);
      return [];
    }

    return (data || []) as InsuranceApproval[];
  } catch (error) {
    console.error("Error in getUserInsuranceApprovals:", error);
    return [];
  }
}

/**
 * Verifica si un usuario tiene al menos una aprobación activa
 */
export async function hasActiveInsuranceApproval(
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("has_active_insurance_approval", {
      tenant_uuid: userId,
    });

    if (error) {
      // Si la función RPC no existe aún, retornar false silenciosamente
      if (error.code === "42883" || error.message?.includes("does not exist")) {
        console.warn("has_active_insurance_approval RPC function does not exist yet");
        return false;
      }
      console.error("Error checking insurance approval:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Error in hasActiveInsuranceApproval:", error);
    return false;
  }
}

/**
 * Obtiene una aprobación específica por ID
 */
export async function getInsuranceApproval(
  approvalId: string,
  userId: string
): Promise<InsuranceApproval | null> {
  const { data, error } = await supabase
    .from("tenant_insurance_approvals")
    .select("*")
    .eq("id", approvalId)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching insurance approval:", error);
    return null;
  }

  return data as InsuranceApproval;
}

/**
 * Elimina una aprobación
 */
export async function deleteInsuranceApproval(
  approvalId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("tenant_insurance_approvals")
    .delete()
    .eq("id", approvalId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting insurance approval:", error);
    throw new Error(`Error al eliminar la aprobación: ${error.message}`);
  }
}

/**
 * Sube un documento de aprobación a Supabase Storage
 */
export async function uploadInsuranceDocument(
  userId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = `insurance-approvals/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading document:", uploadError);
    throw new Error(`Error al subir el documento: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("documents").getPublicUrl(filePath);

  return publicUrl;
}
