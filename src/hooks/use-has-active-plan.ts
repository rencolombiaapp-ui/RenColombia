import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getUserActivePlan, userHasPriceInsightsAccess } from "@/services/subscriptionService";

/**
 * Hook para verificar si el usuario tiene un plan activo
 */
export function useHasActivePlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-active-plan", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const activePlan = await getUserActivePlan(user.id);
      return activePlan !== null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

/**
 * Hook para obtener el plan activo del usuario
 */
export function useActivePlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["active-plan", user?.id],
    queryFn: async () => {
      if (!user) return null;

      try {
        return await getUserActivePlan(user.id);
      } catch (error) {
        console.error("Error fetching active plan:", error);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });
}

/**
 * Hook para verificar si el usuario tiene acceso a price insights
 */
export function useHasPriceInsightsAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-price-insights-access", user?.id],
    queryFn: async () => {
      if (!user) return false;

      return await userHasPriceInsightsAccess(user.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
