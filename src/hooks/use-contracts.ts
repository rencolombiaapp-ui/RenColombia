import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { 
  getTenantContracts, 
  getOwnerContracts, 
  getContract,
  tenantApproveContract,
  RentalContractWithDetails 
} from "@/services/rentalContractService";
import { 
  getTenantContractRequests, 
  getOwnerContractRequests,
  createContractRequest,
  ContractRequestWithDetails 
} from "@/services/contractRequestService";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook para obtener contratos del usuario actual
 */
export function useContracts() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["contracts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const isTenant = profile?.role === "tenant" || 
                      (!profile?.publisher_type || profile.publisher_type === "select");
      
      if (isTenant) {
        return await getTenantContracts(user.id);
      } else {
        return await getOwnerContracts(user.id);
      }
    },
    enabled: !!user && !!profile,
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para obtener un contrato específico
 */
export function useContract(contractId: string | undefined) {
  return useQuery({
    queryKey: ["contract", contractId],
    queryFn: async () => {
      if (!contractId) return null;
      return await getContract(contractId);
    },
    enabled: !!contractId,
  });
}

/**
 * Hook para obtener solicitudes de contrato del usuario actual
 */
export function useContractRequests() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["contract-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const isTenant = profile?.role === "tenant" || 
                      (!profile?.publisher_type || profile.publisher_type === "select");
      
      if (isTenant) {
        return await getTenantContractRequests(user.id);
      } else {
        return await getOwnerContractRequests(user.id);
      }
    },
    enabled: !!user && !!profile,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook para crear una solicitud de contrato
 */
export function useCreateContractRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { propertyId: string; tenantId: string }) => {
      return await createContractRequest(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-requests"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de contratación ha sido enviada al propietario.",
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

/**
 * Hook para aprobar contrato como inquilino
 */
export function useTenantApproveContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { contractId: string; disclaimerAccepted: boolean }) => {
      return await tenantApproveContract(params.contractId, params.disclaimerAccepted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract"] });
      toast({
        title: "Contrato aprobado",
        description: "Has aprobado el contrato exitosamente.",
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
