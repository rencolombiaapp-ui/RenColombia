import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SESSION_STORAGE_KEY = "rencolombia_visit_counted";

/**
 * Hook para manejar el contador de visitas del sitio
 * - Incrementa el contador solo una vez por sesión usando sessionStorage
 * - Lee el valor actual desde Supabase para mostrarlo
 */
export function useSiteVisits() {
  const queryClient = useQueryClient();

  // Query para obtener el total de visitas
  const { data: totalVisits = 0, isLoading } = useQuery({
    queryKey: ["site-visits"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("site_visits")
          .select("total_visits")
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error("Error fetching site visits:", error);
          return 0;
        }

        return data?.total_visits || 0;
      } catch (error) {
        console.error("Error fetching site visits:", error);
        return 0;
      }
    },
    // Refrescar cada 30 segundos para mantener el contador actualizado
    refetchInterval: 30000,
    // Mantener los datos en cache mientras la app está activa
    staleTime: 10000,
  });

  // Efecto para incrementar el contador solo una vez por sesión
  useEffect(() => {
    // Verificar si ya se contó la visita en esta sesión
    const visitCounted = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!visitCounted) {
      // Incrementar el contador en Supabase
      const incrementVisit = async () => {
        try {
          // Obtener el registro actual
          const { data: currentData, error: fetchError } = await supabase
            .from("site_visits")
            .select("id, total_visits")
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();

          if (fetchError) {
            // Si no existe registro, crear uno inicializado en 1
            const { error: insertError } = await supabase
              .from("site_visits")
              .insert({ total_visits: 1 });

            if (insertError) {
              console.error("Error creating site visit record:", insertError);
              return;
            }
          } else {
            // Incrementar el contador existente
            const { error: updateError } = await supabase
              .from("site_visits")
              .update({
                total_visits: (currentData?.total_visits || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", currentData?.id);

            if (updateError) {
              console.error("Error incrementing site visits:", updateError);
              return;
            }
          }

          // Marcar como contado en esta sesión
          sessionStorage.setItem(SESSION_STORAGE_KEY, "true");

          // Invalidar la query para refrescar el contador
          queryClient.invalidateQueries({ queryKey: ["site-visits"] });
        } catch (error) {
          // Manejar errores silenciosamente para no romper la UI
          console.error("Error in site visit counter:", error);
        }
      };

      incrementVisit();
    }
  }, [queryClient]);

  return {
    totalVisits,
    isLoading,
  };
}
