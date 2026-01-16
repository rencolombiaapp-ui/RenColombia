import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getUserActivePlan } from "@/services/subscriptionService";

/**
 * Hook para verificar si el usuario tiene plan PRO
 */
export function useIsProPlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-pro-plan", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const activePlan = await getUserActivePlan(user.id);
      if (!activePlan) return false;
      return activePlan.plan_id.includes("_pro");
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

/**
 * Hook para obtener el plan activo del usuario
 */
export function useUserPlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-plan", user?.id],
    queryFn: async () => {
      if (!user) return null;
      return getUserActivePlan(user.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

/**
 * Hook para verificar acceso a funcionalidades según el plan
 */
export function usePlanAccess() {
  const { data: isPro = false, isLoading: isLoadingPro } = useIsProPlan();
  const { data: plan, isLoading: isLoadingPlan } = useUserPlan();

  return {
    isPro: isPro || false,
    planId: plan?.plan_id || null,
    canViewInsuranceDetails: isPro || false, // Solo PRO puede ver detalles de seguros
    canViewDocuments: isPro || false, // Solo PRO puede ver documentos
    canFilterByInsurance: isPro || false, // Solo PRO puede filtrar por aprobación
    isLoading: isLoadingPro || isLoadingPlan,
  };
}
