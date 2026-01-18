import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useContract, useTenantApproveContract } from "@/hooks/use-contracts";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import ContractMessagesPanel from "@/components/contracts/ContractMessagesPanel";
import ContractMessageInput from "@/components/contracts/ContractMessageInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  FileText, 
  Calendar, 
  MapPin, 
  User, 
  Building2, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Home,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: contract, isLoading } = useContract(id);
  const navigate = useNavigate();
  const approveContract = useTenantApproveContract();
  
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimerDialog, setShowDisclaimerDialog] = useState(false);

  const isTenant = profile?.role === "tenant" || 
                   (!profile?.publisher_type || profile.publisher_type === "select");
  const isOwner = contract?.owner_id === user?.id;
  const isContractTenant = contract?.tenant_id === user?.id;

  // Función para obtener el color del badge según el estado
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
      case "approved":
      case "signed":
        return "default";
      case "pending_tenant":
      case "pending_owner":
        return "secondary";
      case "draft":
        return "outline";
      case "cancelled":
      case "expired":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Función para obtener el texto del estado
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: "Borrador",
      pending_tenant: "Pendiente de Inquilino",
      pending_owner: "Pendiente de Propietario",
      approved: "Aprobado",
      signed: "Firmado",
      active: "Activo",
      cancelled: "Cancelado",
      expired: "Expirado",
    };
    return statusMap[status] || status;
  };

  // Función para formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Manejar aprobación de contrato
  const handleApprove = () => {
    if (!disclaimerAccepted) {
      setShowDisclaimerDialog(true);
      return;
    }
    
    if (!id) return;
    
    approveContract.mutate({
      contractId: id,
      disclaimerAccepted: true,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Contrato no encontrado</h3>
              <p className="text-muted-foreground mb-4">
                El contrato que buscas no existe o no tienes permiso para verlo.
              </p>
              <Button onClick={() => navigate("/contratos")}>
                Volver a Contratos
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Validar que el usuario sea participante
  if (!isOwner && !isContractTenant) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No autorizado</h3>
              <p className="text-muted-foreground mb-4">
                Solo puedes ver contratos en los que participas.
              </p>
              <Button onClick={() => navigate("/contratos")}>
                Volver a Contratos
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/contratos")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Contratos
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Contrato de Arrendamiento</h1>
              <p className="text-muted-foreground">{contract.property_title}</p>
            </div>
            <Badge variant={getStatusBadgeVariant(contract.status)} className="text-sm">
              {getStatusText(contract.status)}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Información Principal */}
          <div className="md:col-span-2 space-y-6">
            {/* Información del Inmueble */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Información del Inmueble
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Link 
                      to={`/inmueble/${contract.property_id}`}
                      className="text-lg font-semibold hover:text-primary transition-colors"
                    >
                      {contract.property_title}
                    </Link>
                    <p className="text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {contract.property_city}
                      {contract.property_address && ` - ${contract.property_address}`}
                    </p>
                  </div>
                  {contract.property_image_url && (
                    <img 
                      src={contract.property_image_url} 
                      alt={contract.property_title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contenido del Contrato */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Contenido del Contrato
                </CardTitle>
                <CardDescription>
                  Versión {contract.version} - Creado el {formatDate(contract.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contract.contract_content || "<p>No hay contenido disponible.</p>" }}
                />
              </CardContent>
            </Card>

            {/* Mensajes del Contrato */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Mensajes del Contrato
                </CardTitle>
                <CardDescription>
                  Conversación entre las partes del contrato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ContractMessagesPanel contractId={contract.id} />
                <div className="border-t border-border pt-4">
                  <ContractMessageInput
                    contractId={contract.id}
                    contractStatus={contract.status}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Información Financiera */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Información Financiera
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Renta Mensual:</span>
                  <span className="font-semibold">
                    ${contract.monthly_rent.toLocaleString("es-CO")}
                  </span>
                </div>
                {contract.deposit_amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Depósito:</span>
                    <span className="font-semibold">
                      ${contract.deposit_amount.toLocaleString("es-CO")}
                    </span>
                  </div>
                )}
                {contract.contract_duration_months && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duración:</span>
                    <span className="font-semibold">
                      {contract.contract_duration_months} meses
                    </span>
                  </div>
                )}
                {contract.start_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha Inicio:</span>
                    <span className="font-semibold">
                      {formatDate(contract.start_date)}
                    </span>
                  </div>
                )}
                {contract.end_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha Fin:</span>
                    <span className="font-semibold">
                      {formatDate(contract.end_date)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participantes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Participantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Propietario:</p>
                  <p className="font-semibold">{contract.owner_name || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">{contract.owner_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Inquilino:</p>
                  <p className="font-semibold">{contract.tenant_name || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">{contract.tenant_email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Acciones */}
            {isContractTenant && contract.status === "pending_tenant" && (
              <Card>
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="disclaimer"
                      checked={disclaimerAccepted}
                      onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
                    />
                    <Label 
                      htmlFor="disclaimer" 
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Acepto el disclaimer legal y los términos del contrato
                    </Label>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={handleApprove}
                    disabled={!disclaimerAccepted || approveContract.isPending}
                  >
                    {approveContract.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprobar Contrato
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Disclaimer Dialog */}
      <Dialog open={showDisclaimerDialog} onOpenChange={setShowDisclaimerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disclaimer Legal</DialogTitle>
            <DialogDescription>
              Por favor, lee y acepta el disclaimer legal antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Al aprobar este contrato, confirmas que has leído y entendido todos los términos y condiciones.
              Este es un documento legalmente vinculante.
            </p>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="dialog-disclaimer"
                checked={disclaimerAccepted}
                onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
              />
              <Label htmlFor="dialog-disclaimer" className="text-sm">
                Acepto el disclaimer legal
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisclaimerDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (disclaimerAccepted && id) {
                  setShowDisclaimerDialog(false);
                  approveContract.mutate({
                    contractId: id,
                    disclaimerAccepted: true,
                  });
                }
              }}
              disabled={!disclaimerAccepted}
            >
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default ContractDetail;
