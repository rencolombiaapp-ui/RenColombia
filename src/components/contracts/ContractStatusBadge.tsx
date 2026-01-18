import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ContractStatus = 
  | "draft" 
  | "pending_tenant" 
  | "pending_owner" 
  | "approved" 
  | "signed" 
  | "active" 
  | "cancelled" 
  | "expired"
  | "pending"
  | "rejected";

interface ContractStatusBadgeProps {
  status: ContractStatus | string;
  className?: string;
}

/**
 * Componente reutilizable para mostrar badges de estado de contrato
 * Estados:
 * - En proceso de contrato: draft, pending_tenant, pending_owner, pending
 * - Contrato aprobado: approved, signed, active
 * - Contrato cancelado: cancelled, rejected, expired
 */
export function ContractStatusBadge({ status, className }: ContractStatusBadgeProps) {
  const getBadgeConfig = (status: string) => {
    switch (status) {
      // En proceso de contrato
      case "draft":
        return {
          label: "En proceso",
          variant: "secondary" as const,
          className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
        };
      case "pending_tenant":
        return {
          label: "Pendiente de Inquilino",
          variant: "secondary" as const,
          className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
        };
      case "pending_owner":
        return {
          label: "Pendiente de Propietario",
          variant: "secondary" as const,
          className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
        };
      case "pending":
        return {
          label: "En proceso",
          variant: "secondary" as const,
          className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
        };
      
      // Contrato aprobado
      case "approved":
        return {
          label: "Contrato Aprobado",
          variant: "default" as const,
          className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
        };
      case "signed":
        return {
          label: "Contrato Firmado",
          variant: "default" as const,
          className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
        };
      case "active":
        return {
          label: "Contrato Activo",
          variant: "default" as const,
          className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
        };
      
      // Contrato cancelado
      case "cancelled":
        return {
          label: "Contrato Cancelado",
          variant: "destructive" as const,
          className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
        };
      case "rejected":
        return {
          label: "Rechazado",
          variant: "destructive" as const,
          className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
        };
      case "expired":
        return {
          label: "Expirado",
          variant: "destructive" as const,
          className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
        };
      
      default:
        return {
          label: status,
          variant: "outline" as const,
          className: "",
        };
    }
  };

  const config = getBadgeConfig(status);

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
