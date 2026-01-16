import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Profile } from "@/integrations/supabase/types";

// Hook para obtener el perfil del usuario actual
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          // Si la tabla no existe aún, retornar null silenciosamente
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            return null;
          }
          // Silenciar otros errores también
          return null;
        }

        return data as Profile;
      } catch (error) {
        // Silenciar errores para no romper la UI
        return null;
      }
    },
    enabled: !!user,
    retry: false,
    throwOnError: false, // No lanzar errores, solo retornar null
  });
}

// Hook para actualizar el perfil del usuario
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: {
      role?: "tenant" | "landlord";
      publisher_type?: "individual" | "inmobiliaria" | null;
      company_name?: string | null;
      company_logo?: File | string | null; // Puede ser File (nuevo) o string (URL existente)
      phone?: string | null;
      address?: string | null;
      full_name?: string | null;
      avatar_url?: File | string | null; // Puede ser File (nuevo) o string (URL existente)
    }) => {
      if (!user) throw new Error("Usuario no autenticado");

      let logoUrl: string | null = null;
      let avatarUrl: string | null = null;

      // Manejar avatar
      if (updates.avatar_url instanceof File) {
        const fileExt = updates.avatar_url.name.split(".").pop();
        const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

        // Eliminar avatar anterior si existe
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (currentProfile?.avatar_url) {
          // Extraer el path del avatar anterior
          const oldAvatarPath = currentProfile.avatar_url.split("/").slice(-2).join("/");
          await supabase.storage.from("avatars").remove([oldAvatarPath]);
        }

        // Subir nuevo avatar
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, updates.avatar_url);

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: publicUrl } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        avatarUrl = publicUrl.publicUrl;
      } else if (updates.avatar_url === null) {
        // Si se elimina el avatar, borrar del storage
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (currentProfile?.avatar_url) {
          const oldAvatarPath = currentProfile.avatar_url.split("/").slice(-2).join("/");
          await supabase.storage.from("avatars").remove([oldAvatarPath]);
        }
        avatarUrl = null;
      } else if (updates.avatar_url !== undefined) {
        // Mantener URL existente
        avatarUrl = updates.avatar_url as string | null;
      }

      // Si hay un archivo de logo, subirlo primero
      if (updates.company_logo instanceof File) {
        const fileExt = updates.company_logo.name.split(".").pop();
        const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;

        // Eliminar logo anterior si existe
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("company_logo")
          .eq("id", user.id)
          .single();

        if (currentProfile?.company_logo) {
          // Extraer el path del logo anterior
          const oldLogoPath = currentProfile.company_logo.split("/").slice(-2).join("/");
          await supabase.storage.from("property-images").remove([oldLogoPath]);
        }

        // Subir nuevo logo
        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(fileName, updates.company_logo);

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: publicUrl } = supabase.storage
          .from("property-images")
          .getPublicUrl(fileName);

        logoUrl = publicUrl.publicUrl;
      } else if (updates.company_logo === null) {
        // Si se elimina el logo, borrar del storage
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("company_logo")
          .eq("id", user.id)
          .single();

        if (currentProfile?.company_logo) {
          const oldLogoPath = currentProfile.company_logo.split("/").slice(-2).join("/");
          await supabase.storage.from("property-images").remove([oldLogoPath]);
        }
        logoUrl = null;
      } else {
        // Mantener URL existente
        logoUrl = updates.company_logo as string | null;
      }

      // Preparar actualización
      const updateData: {
        role?: "tenant" | "landlord";
        publisher_type?: "individual" | "inmobiliaria" | null;
        company_name?: string | null;
        company_logo?: string | null;
        phone?: string | null;
        address?: string | null;
        full_name?: string | null;
        avatar_url?: string | null;
      } = {
        ...updates,
        company_logo: logoUrl,
      };

      // Solo incluir avatar_url si fue modificado
      if ("avatar_url" in updates) {
        updateData.avatar_url = avatarUrl;
      }

      // Eliminar company_logo del objeto si no está definido
      if (!("company_logo" in updates)) {
        delete updateData.company_logo;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] }); // Invalidar para actualizar datos del propietario
      
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para obtener el perfil de un usuario por ID (para páginas públicas)
export function usePublisherProfile(publisherId: string | undefined) {
  return useQuery({
    queryKey: ["publisher-profile", publisherId],
    queryFn: async () => {
      if (!publisherId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", publisherId)
        .single();

      if (error) {
        console.error("Error fetching publisher profile:", error);
        return null;
      }

      return data as Profile;
    },
    enabled: !!publisherId,
  });
}
