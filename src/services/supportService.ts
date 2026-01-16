import { supabase } from "@/integrations/supabase/client";

export type SupportReportType =
  | "error_platform"
  | "problem_publication"
  | "problem_payment"
  | "suggestion"
  | "other";

export type SupportReportStatus = "open" | "in_review" | "closed";

export interface SupportReport {
  id: string;
  user_id: string | null;
  email: string;
  type: SupportReportType;
  section: string | null;
  description: string;
  status: SupportReportStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportReportParams {
  userId?: string | null;
  email: string;
  type: SupportReportType;
  section?: string | null;
  description: string;
}

/**
 * Crea un nuevo reporte de soporte
 */
export async function createSupportReport(
  params: CreateSupportReportParams
): Promise<SupportReport> {
  const { userId, email, type, section, description } = params;

  // Validar campos obligatorios
  if (!email.trim()) {
    throw new Error("El correo electrónico es obligatorio");
  }

  if (!description.trim()) {
    throw new Error("La descripción es obligatoria");
  }

  // Validar formato de email básico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new Error("El correo electrónico no es válido");
  }

  const { data, error } = await supabase
    .from("support_reports")
    .insert({
      user_id: userId || null,
      email: email.trim(),
      type,
      section: section?.trim() || null,
      description: description.trim(),
      status: "open",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating support report:", error);
    throw new Error(`Error al crear el reporte: ${error.message}`);
  }

  return data as SupportReport;
}

/**
 * Obtiene los reportes de un usuario específico
 */
export async function getUserSupportReports(
  userId: string
): Promise<SupportReport[]> {
  const { data, error } = await supabase
    .from("support_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user support reports:", error);
    return [];
  }

  return (data || []) as SupportReport[];
}

/**
 * Obtiene un reporte específico por ID
 */
export async function getSupportReport(
  reportId: string,
  userId?: string
): Promise<SupportReport | null> {
  let query = supabase
    .from("support_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  // Si se proporciona userId, asegurar que el reporte pertenece al usuario
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching support report:", error);
    return null;
  }

  return data as SupportReport;
}
