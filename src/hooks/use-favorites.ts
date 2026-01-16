import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Property, PropertyImage } from "@/integrations/supabase/types";

// Tipo para favorito con la propiedad incluida
export type FavoriteWithProperty = {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  properties: Property & {
    property_images: PropertyImage[];
  };
};

// Hook para obtener los IDs de propiedades favoritas del usuario
export function useFavoriteIds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorite-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("favorites")
        .select("property_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching favorite ids:", error);
        return [];
      }

      return data.map((f) => f.property_id);
    },
    enabled: !!user,
  });
}

// Hook para obtener favoritos completos con datos de propiedad
export function useFavorites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          user_id,
          property_id,
          created_at,
          properties (
            *,
            property_images (*)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching favorites:", error);
        return [];
      }

      return data as unknown as FavoriteWithProperty[];
    },
    enabled: !!user,
  });
}

// Hook para agregar/quitar favorito
export function useToggleFavorite() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      propertyId,
      isFavorite,
    }: {
      propertyId: string;
      isFavorite: boolean;
    }) => {
      if (!user) {
        throw new Error("Debes iniciar sesión para guardar favoritos");
      }

      if (isFavorite) {
        // Eliminar favorito
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", propertyId);

        if (error) throw error;
        return { action: "removed" };
      } else {
        // Agregar favorito
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          property_id: propertyId,
        });

        if (error) throw error;
        return { action: "added" };
      }
    },
    onSuccess: (result) => {
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });

      toast({
        title: result.action === "added" ? "Agregado a favoritos" : "Eliminado de favoritos",
        description:
          result.action === "added"
            ? "La propiedad se guardó en tus favoritos"
            : "La propiedad se eliminó de tus favoritos",
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
