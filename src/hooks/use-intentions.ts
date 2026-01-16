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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intentions"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
    refetchInterval: 30000, // Refrescar cada 30 segundos
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
