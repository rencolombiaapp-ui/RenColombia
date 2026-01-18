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

      // Obtener el owner_id de la propiedad para invalidar su query después (tanto al agregar como al eliminar)
      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", propertyId)
        .single();
      const ownerId = property?.owner_id || null;

      if (isFavorite) {
        // Eliminar favorito
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", propertyId);

        if (error) throw error;
        return { action: "removed", ownerId };
      } else {
        // Agregar favorito
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          property_id: propertyId,
        });

        if (error) throw error;
        return { action: "added", ownerId };
      }
    },
    onSuccess: async (result) => {
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });
      
      // Si tenemos el owner_id, actualizar directamente el cache del propietario
      if (result.ownerId) {
        // Obtener las propiedades actuales del propietario desde el cache
        const currentData = queryClient.getQueryData<Array<any>>(["my-properties", result.ownerId]);
        
        if (currentData && currentData.length > 0) {
          // Obtener el nuevo conteo de favoritos para todas las propiedades del propietario
          const propertyIds = currentData.map((p) => p.id);
          const { data: favoritesData } = await supabase
            .from("favorites")
            .select("property_id")
            .in("property_id", propertyIds);
          
          if (favoritesData) {
            // Contar favoritos por propiedad
            const favoritesCount: Record<string, number> = {};
            favoritesData.forEach((fav) => {
              favoritesCount[fav.property_id] = (favoritesCount[fav.property_id] || 0) + 1;
            });
            
            // Actualizar el cache directamente con los nuevos conteos
            const updatedData = currentData.map((property) => ({
              ...property,
              favorites_count: favoritesCount[property.id] || 0,
            }));
            
            queryClient.setQueryData(["my-properties", result.ownerId], updatedData);
          }
        }
        
        // También invalidar y refetch para asegurar sincronización
        queryClient.invalidateQueries({ queryKey: ["my-properties", result.ownerId] });
        queryClient.refetchQueries({ 
          queryKey: ["my-properties", result.ownerId],
          type: 'active'
        });
      }
      
      // Invalidar todas las queries de my-properties
      queryClient.invalidateQueries({ queryKey: ["my-properties"] });

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
