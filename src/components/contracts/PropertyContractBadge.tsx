import { ContractStatusBadge } from "./ContractStatusBadge";
import { usePropertyContractStatus } from "@/hooks/use-contracts";

interface PropertyContractBadgeProps {
  propertyId: string;
}

/**
 * Componente que muestra el badge de estado del contrato para una propiedad
 * Solo se muestra si la propiedad tiene un contrato con estado relevante
 */
export function PropertyContractBadge({ propertyId }: PropertyContractBadgeProps) {
  const { data: contractStatus } = usePropertyContractStatus(propertyId);
  
  if (!contractStatus) return null;
  
  // Solo mostrar badge si el estado del contrato es relevante
  const relevantStatuses = [
    "draft", 
    "pending_tenant", 
    "pending_owner", 
    "approved", 
    "signed", 
    "active", 
    "cancelled", 
    "rejected", 
    "expired"
  ];
  
  if (!relevantStatuses.includes(contractStatus)) return null;
  
  return <ContractStatusBadge status={contractStatus} />;
}
