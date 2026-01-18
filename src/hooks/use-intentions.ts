import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  createPropertyIntention,
  getOwnerIntentions,
  getTenantIntentions,
  hasIntentionForProperty,
  type PropertyIntention,
  type PropertyIntentionWithDetails,
} from "@/services/intentionService";

/**
 * Hook para crear una intención de arrendar un inmueble
 */
export function useCreateIntention() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      propertyId,
      ownerId,
    }: {
      propertyId: string;
      ownerId: string;
    }) => {
      if (!user) throw new Error("Usuario no autenticado");
      return createPropertyIntention({
        propertyId,
        tenantId: user.id,
        ownerId,
      });
    },
    onSuccess: async (data, variables) => {
      // Invalidar todas las queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["intentions"] });
      // Invalidar específicamente la query de has-intention para esta propiedad
      queryClient.invalidateQueries({ queryKey: ["has-intention", variables.propertyId] });
      queryClient.invalidateQueries({ queryKey: ["has-intention"] }); // También invalidar todas las verificaciones
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // Forzar refetch inmediato para actualizar la UI
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["intentions", "owner"] }),
        queryClient.refetchQueries({ queryKey: ["has-intention", variables.propertyId] }),
        queryClient.refetchQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}

/**
 * Hook para obtener las intenciones de un propietario
 */
export function useOwnerIntentions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["intentions", "owner", user?.id],
    queryFn: () => getOwnerIntentions(user!.id),
    enabled: !!user,
    refetchInterval: 10000, // Refrescar cada 10 segundos para ver nuevas intenciones más rápido
    staleTime: 0, // No cachear, siempre obtener datos frescos
  });
}

/**
 * Hook para obtener las intenciones de un inquilino
 */
export function useTenantIntentions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["intentions", "tenant", user?.id],
    queryFn: () => getTenantIntentions(user!.id),
    enabled: !!user,
  });
}

/**
 * Hook para verificar si un inquilino ya manifestó intención sobre un inmueble
 */
export function useHasIntention(propertyId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-intention", propertyId, user?.id],
    queryFn: () => hasIntentionForProperty(propertyId!, user!.id),
    enabled: !!propertyId && !!user,
  });
}
