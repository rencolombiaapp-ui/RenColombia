import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useContracts, useContractRequests } from "@/hooks/use-contracts";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Calendar, MapPin, User, Building2, AlertCircle } from "lucide-react";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { cn } from "@/lib/utils";
import type { RentalContractWithDetails, ContractRequestWithDetails } from "@/services/rentalContractService";

const Contracts = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: contracts = [], isLoading: isLoadingContracts } = useContracts();
  const { data: requests = [], isLoading: isLoadingRequests } = useContractRequests();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<"contracts" | "requests">("contracts");

  const isTenant = profile?.role === "tenant" || 
                   (!profile?.publisher_type || profile.publisher_type === "select");

  // Función para formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Contratos de Arrendamiento</h1>
          <p className="text-muted-foreground">
            {isTenant 
              ? "Gestiona tus solicitudes y contratos de arrendamiento"
              : "Gestiona las solicitudes y contratos de tus inmuebles"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("contracts")}
            className={cn(
              "px-4 py-2 font-medium border-b-2 transition-colors",
              activeTab === "contracts"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Contratos ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={cn(
              "px-4 py-2 font-medium border-b-2 transition-colors",
              activeTab === "requests"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Solicitudes ({requests.length})
          </button>
        </div>

        {/* Contratos */}
        {activeTab === "contracts" && (
          <div>
            {isLoadingContracts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : contracts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tienes contratos</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {isTenant
                      ? "Aún no has iniciado ningún contrato de arrendamiento."
                      : "Aún no has creado ningún contrato de arrendamiento."}
                  </p>
                  {isTenant && (
                    <Button onClick={() => navigate("/buscar")}>
                      Buscar Inmuebles
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {contracts.map((contract: RentalContractWithDetails) => (
                  <Card 
                    key={contract.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/contratos/${contract.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-lg line-clamp-1">
                          {contract.property_title}
                        </CardTitle>
                        <ContractStatusBadge status={contract.status} />
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {contract.property_city}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Renta Mensual:</span>
                          <span className="font-semibold">
                            ${contract.monthly_rent.toLocaleString("es-CO")}
                          </span>
                        </div>
                        {contract.deposit_amount && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Depósito:</span>
                            <span className="font-semibold">
                              ${contract.deposit_amount.toLocaleString("es-CO")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span className="truncate">
                            {isTenant ? contract.owner_name : contract.tenant_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(contract.created_at)}</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/contratos/${contract.id}`);
                        }}
                      >
                        Ver Detalles
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Solicitudes */}
        {activeTab === "requests" && (
          <div>
            {isLoadingRequests ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tienes solicitudes</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {isTenant
                      ? "Aún no has solicitado ningún contrato de arrendamiento."
                      : "Aún no has recibido solicitudes de contratación."}
                  </p>
                  {isTenant && (
                    <Button onClick={() => navigate("/buscar")}>
                      Buscar Inmuebles
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {requests.map((request: ContractRequestWithDetails) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-lg line-clamp-1">
                          {request.property_title}
                        </CardTitle>
                        <ContractStatusBadge status={request.status} />
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {request.property_city}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Precio:</span>
                          <span className="font-semibold">
                            ${request.property_price.toLocaleString("es-CO")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span className="truncate">
                            {isTenant ? request.owner_name : request.tenant_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(request.requested_at)}</span>
                        </div>
                        {request.tenant_kyc_status && (
                          <div className="flex items-center gap-2 text-sm">
                            <Badge 
                              variant={request.tenant_kyc_status === "verified" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              KYC: {request.tenant_kyc_status === "verified" ? "Verificado" : "Pendiente"}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {!isTenant && request.status === "pending" && (
                        <Button 
                          variant="default" 
                          className="w-full mt-4"
                          onClick={() => navigate(`/inmueble/${request.property_id}`)}
                        >
                          Ver Solicitud
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Contracts;
