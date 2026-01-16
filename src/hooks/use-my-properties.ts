import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { PropertyWithImages } from "@/integrations/supabase/types";

// Tipo extendido con conteo de favoritos
export type PropertyWithStats = PropertyWithImages & {
  favorites_count: number;
};

// Hook para obtener las propiedades del usuario actual con estadísticas
export function useMyProperties() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-properties", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Obtener propiedades del usuario
      const { data: properties, error } = await supabase
        .from("properties")
        .select(`
          *,
          property_images (*)
        `)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching my properties:", error);
        throw error;
      }

      if (!properties || properties.length === 0) {
        return [];
      }

      // Obtener conteo de favoritos para cada propiedad
      const propertyIds = properties.map((p) => p.id);
      const { data: favoritesData, error: favError } = await supabase
        .from("favorites")
        .select("property_id")
        .in("property_id", propertyIds);

      if (favError) {
        console.error("Error fetching favorites count:", favError);
      }

      // Contar favoritos por propiedad
      const favoritesCount: Record<string, number> = {};
      favoritesData?.forEach((fav) => {
        favoritesCount[fav.property_id] = (favoritesCount[fav.property_id] || 0) + 1;
      });

      // Combinar datos
      const propertiesWithStats: PropertyWithStats[] = properties.map((property) => ({
        ...property,
        property_images: property.property_images || [],
        favorites_count: favoritesCount[property.id] || 0,
      }));

      return propertiesWithStats;
    },
    enabled: !!user,
  });
}

// Hook para pausar/reactivar una propiedad
export function useTogglePropertyStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      propertyId,
      currentStatus,
    }: {
      propertyId: string;
      currentStatus: string;
    }) => {
      const newStatus = currentStatus === "published" ? "paused" : "published";

      const { error } = await supabase
        .from("properties")
        .update({ status: newStatus })
        .eq("id", propertyId);

      if (error) throw error;

      return { newStatus };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["my-properties"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["is-landlord"] }); // Invalidar estado de arrendador

      toast({
        title: result.newStatus === "published" ? "Propiedad reactivada" : "Propiedad pausada",
        description:
          result.newStatus === "published"
            ? "Tu propiedad ahora es visible para todos"
            : "Tu propiedad ya no aparece en búsquedas",
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

// Hook para verificar si el usuario es arrendador (tiene al menos 1 propiedad)
export function useIsLandlord() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-landlord", user?.id],
    queryFn: async () => {
      if (!user) return false;

      try {
        // Solo contar propiedades, no traerlas todas (más eficiente)
        const { count, error } = await supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id);

        if (error) {
          // Si la tabla no existe aún, retornar false silenciosamente
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            return false;
          }
          console.error("Error checking landlord status:", error);
          return false;
        }

        return (count || 0) > 0;
      } catch (error) {
        // Silenciar errores para no romper la UI
        return false;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos para evitar llamadas innecesarias
    retry: false,
    throwOnError: false, // No lanzar errores, solo retornar false
  });
}

// Hook para incrementar vistas (llamar desde PropertyDetail)
export function useIncrementViews() {
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase.rpc("increment_property_views", {
        property_id: propertyId,
      });

      if (error) {
        console.error("Error incrementing views:", error);
        // No lanzar error para no interrumpir la experiencia del usuario
      }
    },
  });
}

// Hook para eliminar una propiedad
export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId);

      if (error) throw error;

      return { propertyId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-properties"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["properties-count"] });
      queryClient.invalidateQueries({ queryKey: ["is-landlord"] }); // Invalidar estado de arrendador

      toast({
        title: "Propiedad eliminada",
        description: "Tu inmueble ha sido retirado permanentemente.",
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
