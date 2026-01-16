import { supabase } from "@/integrations/supabase/client";

export interface RentalRequirements {
  id: string;
  property_id: string;
  documents_required: string[];
  deposit_required: boolean;
  deposit_value: string | null;
  advance_payment: boolean;
  admin_included: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRentalRequirementsInput {
  property_id: string;
  documents_required: string[];
  deposit_required: boolean;
  deposit_value?: string | null;
  advance_payment: boolean;
  admin_included: boolean;
  notes?: string | null;
}

/**
 * Obtener requisitos de arrendamiento de un inmueble
 */
export async function getRentalRequirements(propertyId: string): Promise<RentalRequirements | null> {
  try {
    const { data, error } = await supabase
      .from("rental_requirements")
      .select("*")
      .eq("property_id", propertyId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No se encontró ningún registro
        return null;
      }
      console.error("Error fetching rental requirements:", error);
      return null;
    }

    return data as RentalRequirements;
  } catch (error) {
    console.error("Error in getRentalRequirements:", error);
    return null;
  }
}

/**
 * Crear o actualizar requisitos de arrendamiento
 */
export async function upsertRentalRequirements(
  input: CreateRentalRequirementsInput
): Promise<RentalRequirements | null> {
  try {
    const { data, error } = await supabase
      .from("rental_requirements")
      .upsert(
        {
          property_id: input.property_id,
          documents_required: input.documents_required,
          deposit_required: input.deposit_required,
          deposit_value: input.deposit_value || null,
          advance_payment: input.advance_payment,
          admin_included: input.admin_included,
          notes: input.notes || null,
        },
        {
          onConflict: "property_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error upserting rental requirements:", error);
      return null;
    }

    return data as RentalRequirements;
  } catch (error) {
    console.error("Error in upsertRentalRequirements:", error);
    return null;
  }
}

/**
 * Eliminar requisitos de arrendamiento
 */
export async function deleteRentalRequirements(propertyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("rental_requirements")
      .delete()
      .eq("property_id", propertyId);

    if (error) {
      console.error("Error deleting rental requirements:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteRentalRequirements:", error);
    return false;
  }
}

/**
 * Documentos disponibles para seleccionar
 */
export const AVAILABLE_DOCUMENTS = [
  "Cédula",
  "Certificación laboral",
  "Comprobantes de ingresos",
  "Extractos bancarios",
  "Referencias personales",
  "Referencias laborales",
  "Codeudor",
  "Carta de aprobación de aseguradora",
] as const;
