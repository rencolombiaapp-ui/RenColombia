import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { PropertyWithImages } from "@/integrations/supabase/types";
import { useEffect } from "react";

// Tipo extendido con conteo de favoritos
export type PropertyWithStats = PropertyWithImages & {
  favorites_count: number;
};

// Hook para obtener las propiedades del usuario actual con estadísticas
export function useMyProperties() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
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
      
      // Crear un mapa de property_id -> favorites_count (inicializar en 0 para todas las propiedades)
      const favoritesCount: Record<string, number> = {};
      propertyIds.forEach((id) => {
        favoritesCount[id] = 0;
      });
      
      // Intentar usar función RPC primero (más eficiente)
      try {
        const { data: favoritesCountData, error: favError } = await supabase.rpc(
          "get_favorites_count_by_properties",
          {
            property_ids: propertyIds,
          }
        );

        if (!favError && favoritesCountData && Array.isArray(favoritesCountData)) {
          // Usar los datos de la función RPC
          favoritesCountData.forEach((item: { property_id: string; favorites_count: number }) => {
            if (item.property_id && item.favorites_count !== undefined) {
              favoritesCount[item.property_id] = item.favorites_count;
            }
          });
          console.log("Favorites count from RPC:", favoritesCount);
        } else {
          // Fallback: usar query directa si la función RPC no está disponible o falla
          throw new Error(favError?.message || "RPC function not available");
        }
      } catch (error) {
        // Fallback: usar query directa para contar favoritos
        console.warn("Using direct query for favorites count:", error);
        const { data: favoritesData, error: favError } = await supabase
          .from("favorites")
          .select("property_id")
          .in("property_id", propertyIds);

        if (favError) {
          console.error("Error fetching favorites count:", favError);
        } else if (favoritesData && favoritesData.length > 0) {
          // Contar favoritos por propiedad manualmente
          favoritesData.forEach((fav) => {
            if (fav.property_id) {
              favoritesCount[fav.property_id] = (favoritesCount[fav.property_id] || 0) + 1;
            }
          });
          console.log("Favorites count from direct query:", favoritesCount);
        }
      }

      // Combinar datos - asegurar que todas las propiedades tengan favorites_count (0 si no hay favoritos)
      const propertiesWithStats: PropertyWithStats[] = properties.map((property) => ({
        ...property,
        property_images: property.property_images || [],
        favorites_count: favoritesCount[property.id] || 0, // 0 si no hay favoritos
      }));

      return propertiesWithStats;
    },
    enabled: !!user,
    staleTime: 0, // No cachear, siempre obtener datos frescos
    refetchOnWindowFocus: true, // Refetch cuando la ventana recupera el foco
  });

  // Escuchar cambios en la tabla favorites usando Supabase Realtime
  useEffect(() => {
    if (!user || !query.data) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Obtener los IDs de las propiedades del usuario desde los datos de la query
    const propertyIds = query.data.map((p) => p.id);
    if (propertyIds.length === 0) return;

    // Suscribirse a cambios en la tabla favorites
    channel = supabase
      .channel(`favorites-changes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "favorites",
        },
        async (payload) => {
          // Verificar si el cambio afecta alguna de nuestras propiedades
          const changedPropertyId =
            (payload.new as any)?.property_id || (payload.old as any)?.property_id;

          if (changedPropertyId && propertyIds.includes(changedPropertyId)) {
            // Invalidar y refetch la query para actualizar los contadores individuales
            queryClient.invalidateQueries({ queryKey: ["my-properties", user.id] });
            await queryClient.refetchQueries({ queryKey: ["my-properties", user.id] });
          }
        }
      )
      .subscribe();

    // Manejar errores de suscripción
    channel.on("error", (error) => {
      console.error("Realtime subscription error:", error);
    });

    // Cleanup: remover suscripción al desmontar o cuando cambien las propiedades
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, queryClient, query.data]); // Agregar query.data como dependencia para re-suscribirse cuando cambien las propiedades

  return query;
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
