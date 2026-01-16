import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HandHeart,
  Loader2,
  ArrowLeft,
  Shield,
  CheckCircle,
  X,
  Eye,
  MessageCircle,
  Calendar,
  MapPin,
  DollarSign,
  Lock,
  Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { useOwnerIntentions } from "@/hooks/use-intentions";
import { usePlanAccess } from "@/hooks/use-plan-access";
import { updateIntentionStatus } from "@/services/intentionService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PropertyIntentions = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: intentions = [], isLoading } = useOwnerIntentions();
  const planAccess = usePlanAccess();
  const isPro = planAccess.isPro || false;
  const canViewInsuranceDetails = planAccess.canViewInsuranceDetails || false;
  const canViewDocuments = planAccess.canViewDocuments || false;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({
      intentionId,
      status,
    }: {
      intentionId: string;
      status: "viewed" | "contacted" | "closed";
    }) => {
      if (!user) throw new Error("Usuario no autenticado");
      return updateIntentionStatus(intentionId, user.id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intentions"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la intención ha sido actualizado.",
      });
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: es,
      });
    } catch {
      return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pendiente</Badge>;
      case "viewed":
        return <Badge variant="secondary">Vista</Badge>;
      case "contacted":
        return <Badge className="bg-primary">Contactado</Badge>;
      case "closed":
        return <Badge variant="outline">Cerrada</Badge>;
      default:
        return null;
    }
  };

  const isPublisher =
    profile?.role === "landlord" ||
    profile?.publisher_type === "inmobiliaria" ||
    profile?.publisher_type === "individual";

  if (!isPublisher) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto text-center">
              <HandHeart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-display font-bold text-foreground mb-4">
                Acceso restringido
              </h1>
              <p className="text-muted-foreground mb-8">
                Esta sección está disponible solo para propietarios e inmobiliarias.
              </p>
              <Link to="/buscar">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a buscar
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            to="/mis-inmuebles"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a mis inmuebles</span>
          </Link>

          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                    Intenciones de Arrendamiento
                  </h1>
                  <p className="text-muted-foreground">
                    Inquilinos interesados en tus propiedades
                  </p>
                </div>
                {!isPro && (
                  <Link to="/planes">
                    <Button variant="outline" size="sm">
                      <Lock className="w-4 h-4 mr-2" />
                      Mejorar a PRO
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : intentions.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <HandHeart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No hay intenciones aún
                </h2>
                <p className="text-muted-foreground">
                  Cuando los inquilinos manifiesten interés en tus propiedades, aparecerán aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {intentions.map((intention) => (
                  <div
                    key={intention.id}
                    className="bg-card rounded-xl border border-border p-6"
                  >
                    <div className="flex items-start gap-4">
                      {/* Property Image */}
                      <Link
                        to={`/inmueble/${intention.property_id}`}
                        className="flex-shrink-0"
                      >
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted">
                          {intention.property_image_url ? (
                            <img
                              src={intention.property_image_url}
                              alt={intention.property_title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/inmueble/${intention.property_id}`}
                              className="hover:underline"
                            >
                              <h3 className="font-semibold text-foreground mb-1 truncate">
                                {intention.property_title}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {intention.property_city}
                                {intention.property_neighborhood &&
                                  `, ${intention.property_neighborhood}`}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {formatPrice(intention.property_price)}
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(intention.status)}
                        </div>

                        {/* Tenant Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {intention.tenant_name || "Usuario"}
                            </p>
                            {canViewInsuranceDetails &&
                              intention.tenant_has_insurance_approval && (
                                <Badge variant="default" className="text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Cliente con aprobación
                                </Badge>
                              )}
                            {!canViewInsuranceDetails && (
                              <Badge variant="outline" className="text-xs">
                                <Lock className="w-3 h-3 mr-1" />
                                PRO para ver detalles
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {intention.tenant_email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Interés manifestado {formatDate(intention.created_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-4">
                          <Link to={`/mensajes`}>
                            <Button variant="outline" size="sm">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Enviar mensaje
                            </Button>
                          </Link>
                          {intention.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateStatus.mutate({
                                    intentionId: intention.id,
                                    status: "viewed",
                                  })
                                }
                                disabled={updateStatus.isPending}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Marcar como vista
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateStatus.mutate({
                                    intentionId: intention.id,
                                    status: "contacted",
                                  })
                                }
                                disabled={updateStatus.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marcar como contactado
                              </Button>
                            </>
                          )}
                          {intention.status !== "closed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateStatus.mutate({
                                  intentionId: intention.id,
                                  status: "closed",
                                })
                              }
                              disabled={updateStatus.isPending}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cerrar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PropertyIntentions;
