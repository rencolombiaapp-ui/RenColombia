import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Hook para obtener el total de favoritos de un propietario
 * Se actualiza automáticamente usando Supabase Realtime
 */
export function useTotalFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query para obtener el total inicial
  const { data: totalFavorites = 0, refetch } = useQuery({
    queryKey: ["total-favorites", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      try {
        const { data, error } = await supabase.rpc("get_total_favorites_for_owner", {
          owner_uuid: user.id,
        });

        if (error) {
          console.error("Error fetching total favorites:", error);
          return 0;
        }

        return (data as number) || 0;
      } catch (error) {
        console.error("Error in get_total_favorites_for_owner:", error);
        return 0;
      }
    },
    enabled: !!user,
    staleTime: 0, // No cachear, siempre obtener datos frescos
  });

  // Suscripción Realtime para escuchar cambios en la tabla favorites
  useEffect(() => {
    if (!user) return;

    // Obtener los IDs de las propiedades del usuario para filtrar los cambios
    const getPropertyIds = async () => {
      const { data: properties } = await supabase
        .from("properties")
        .select("id")
        .eq("owner_id", user.id);

      return properties?.map((p) => p.id) || [];
    };

    let propertyIds: string[] = [];
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Función para configurar la suscripción
    const setupSubscription = async () => {
      propertyIds = await getPropertyIds();

      if (propertyIds.length === 0) return;

      // Crear canal de Realtime
      channel = supabase
        .channel(`total-favorites-${user.id}`)
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
              // Invalidar y refetch la query para actualizar el contador
              queryClient.invalidateQueries({ queryKey: ["total-favorites", user.id] });
              await refetch();
            }
          }
        )
        .subscribe();

      // Si la suscripción falla, intentar reconectar
      channel.on("error", (error) => {
        console.error("Realtime subscription error:", error);
        // Intentar reconectar después de un delay
        setTimeout(() => {
          if (channel) {
            supabase.removeChannel(channel);
            setupSubscription();
          }
        }, 5000);
      });
    };

    // Configurar la suscripción inicial
    setupSubscription();

    // Refetch periódico como fallback (cada 30 segundos)
    const intervalId = setInterval(() => {
      refetch();
    }, 30000);

    // Cleanup: remover suscripción y limpiar intervalo
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(intervalId);
    };
  }, [user, queryClient, refetch]);

  return totalFavorites;
}
