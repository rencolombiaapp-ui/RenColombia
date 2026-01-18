/**
 * Servicio para captura de interés en planes PRO
 * 
 * Objetivo MVP: Medir intención real de pago antes de activar monetización
 * 
 * Este servicio permite:
 * - Registrar interés de usuarios en planes PRO
 * - Verificar si un usuario ya registró interés
 * - Obtener estadísticas de interés (para admins)
 * 
 * Preparado para:
 * - Envío de correos masivos
 * - Notificaciones in-app
 * - Activación de conversión en v2
 */

import { supabase } from "@/integrations/supabase/client";

export type ProPlanRole = "tenant" | "landlord" | "inmobiliaria";
export type ProPlanType = "tenant_pro" | "landlord_pro" | "inmobiliaria_pro";

export interface ProPlanInterest {
  id: string;
  user_id: string;
  email: string;
  role: ProPlanRole;
  plan_type: ProPlanType;
  source?: string;
  created_at: string;
}

export interface ProPlanInterestStats {
  plan_type: ProPlanType;
  role: ProPlanRole;
  total_count: number;
  latest_interest: string;
}

/**
 * Registra interés de un usuario en un plan PRO
 * 
 * @param planType - Tipo de plan PRO (tenant_pro, landlord_pro, inmobiliaria_pro)
 * @param role - Rol del usuario (tenant, landlord, inmobiliaria)
 * @param source - Fuente del interés (pricing_page, landing, property_detail, etc.)
 * @returns El interés registrado o null si ya existe
 */
export async function registerProPlanInterest(
  planType: ProPlanType,
  role: ProPlanRole,
  source: string = "pricing_page"
): Promise<ProPlanInterest | null> {
  try {
    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener email del usuario
    const email = user.email;
    if (!email) {
      throw new Error("El usuario no tiene email registrado");
    }

    // Verificar si ya existe interés para este usuario y plan
    const { data: existingInterest } = await supabase
      .from("pro_plan_interest")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_type", planType)
      .maybeSingle();

    if (existingInterest) {
      // Ya existe interés registrado
      return null;
    }

    // Insertar nuevo interés
    const { data, error } = await supabase
      .from("pro_plan_interest")
      .insert({
        user_id: user.id,
        email: email,
        role: role,
        plan_type: planType,
        source: source,
      })
      .select()
      .single();

    if (error) {
      console.error("Error registrando interés en plan PRO:", error);
      throw error;
    }

    return data as ProPlanInterest;
  } catch (error: any) {
    console.error("Error en registerProPlanInterest:", error);
    throw error;
  }
}

/**
 * Verifica si un usuario ya registró interés en un plan PRO específico
 * 
 * @param planType - Tipo de plan PRO a verificar
 * @returns true si ya existe interés, false si no
 */
export async function hasProPlanInterest(
  planType: ProPlanType
): Promise<boolean> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }

    const { data, error } = await supabase
      .from("pro_plan_interest")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_type", planType)
      .maybeSingle();

    if (error) {
      console.error("Error verificando interés en plan PRO:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error en hasProPlanInterest:", error);
    return false;
  }
}

/**
 * Obtiene todos los intereses registrados por el usuario actual
 * 
 * @returns Array de intereses del usuario
 */
export async function getUserProPlanInterests(): Promise<ProPlanInterest[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from("pro_plan_interest")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error obteniendo intereses del usuario:", error);
      return [];
    }

    return (data || []) as ProPlanInterest[];
  } catch (error) {
    console.error("Error en getUserProPlanInterests:", error);
    return [];
  }
}

/**
 * Obtiene estadísticas de interés en planes PRO (solo para admins)
 * 
 * @returns Estadísticas agrupadas por plan_type y role
 */
export async function getProPlanInterestStats(): Promise<ProPlanInterestStats[]> {
  try {
    // GUARD DEFENSIVO: Verificar que el usuario esté autenticado antes de llamar RPC
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user?.id) {
      throw new Error("Usuario no autenticado");
    }
    
    const { data, error } = await supabase.rpc("get_pro_plan_interest_stats");

    if (error) {
      console.error("Error obteniendo estadísticas de interés:", error);
      throw error;
    }

    return (data || []) as ProPlanInterestStats[];
  } catch (error: any) {
    console.error("Error en getProPlanInterestStats:", error);
    throw error;
  }
}

/**
 * Determina el rol del usuario basado en su perfil
 * 
 * @param publisherType - Tipo de publicador (inmobiliaria, individual, null)
 * @param userRole - Rol del usuario (tenant, landlord, null)
 * @returns Rol determinado: tenant, landlord o inmobiliaria
 */
export function determineUserRole(
  publisherType: string | null | undefined,
  userRole: string | null | undefined
): ProPlanRole {
  if (publisherType === "inmobiliaria") {
    return "inmobiliaria";
  }
  if (userRole === "landlord") {
    return "landlord";
  }
  return "tenant";
}

/**
 * Determina el tipo de plan PRO basado en el rol
 * 
 * @param role - Rol del usuario
 * @returns Tipo de plan PRO correspondiente
 */
export function getPlanTypeFromRole(role: ProPlanRole): ProPlanType {
  switch (role) {
    case "tenant":
      return "tenant_pro";
    case "landlord":
      return "landlord_pro";
    case "inmobiliaria":
      return "inmobiliaria_pro";
    default:
      return "tenant_pro";
  }
}
