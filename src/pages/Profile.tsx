import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  User,
  Building2,
  Loader2,
  Save,
  Image as ImageIcon,
  Phone,
  MapPin,
  X,
  Upload,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useActivePlan } from "@/hooks/use-has-active-plan";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { hasActiveInsuranceApproval } from "@/services/insuranceService";
import { useQuery } from "@tanstack/react-query";
import { Shield, CheckCircle, Calendar, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const Profile = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: activePlan, error: planError } = useActivePlan();

  // Verificar si el usuario es inquilino y tiene aprobación de seguro
  const isTenant = profile?.role === "tenant" || (!profile?.publisher_type || profile.publisher_type === "select");
  const { data: hasInsuranceApproval = false } = useQuery({
    queryKey: ["has-insurance-approval", user?.id],
    queryFn: () => hasActiveInsuranceApproval(user!.id),
    enabled: !!user && isTenant,
  });

  // Función para obtener el nombre del plan de forma legible
  const getPlanDisplayName = () => {
    // Si hay error o no hay plan activo, usar plan por defecto
    if (planError || !activePlan) {
      // Determinar plan por defecto según el tipo de usuario
      if (profile?.publisher_type === "inmobiliaria") {
        return "Plan Inmobiliaria Free";
      } else if (profile?.publisher_type === "individual" || profile?.role === "landlord") {
        return "Plan Gratis";
      } else {
        return "Plan Gratis";
      }
    }

    const planId = activePlan.plan_id;
    if (planId === "tenant_free") return "Plan Gratis";
    if (planId === "landlord_free") return "Plan Gratis";
    if (planId === "landlord_pro") return "Plan PRO";
    if (planId === "inmobiliaria_free") return "Plan Inmobiliaria Free";
    if (planId === "inmobiliaria_pro") return "Plan PRO";
    
    return activePlan.plan_name || "Plan Gratis";
  };

  const isProPlan = (!planError && activePlan?.plan_id?.includes("_pro")) || false;

  const [publisherType, setPublisherType] = useState<"select" | "individual" | "inmobiliaria">("select");
  const [companyName, setCompanyName] = useState("");
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos del perfil cuando estén disponibles
  useEffect(() => {
    if (profile) {
      // Si no tiene publisher_type o es null, mostrar "select" (inquilino)
      setPublisherType(profile.publisher_type || "select");
      setCompanyName(profile.company_name || "");
      setCompanyLogoPreview(profile.company_logo || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setAvatarPreview(profile.avatar_url || "");
    }
  }, [profile]);

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setCompanyLogoFile(file);
    const preview = URL.createObjectURL(file);
    setCompanyLogoPreview(preview);
  };

  // Eliminar logo seleccionado
  const removeLogo = () => {
    setCompanyLogoFile(null);
    setCompanyLogoPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Manejar selección de avatar
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setAvatarFile(file);
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
  };

  // Eliminar avatar seleccionado
  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
    // Si hay avatar_url en el perfil, eliminarlo inmediatamente
    if (profile?.avatar_url) {
      updateProfile.mutate({ avatar_url: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (publisherType === "inmobiliaria" && !companyName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre de la inmobiliaria es obligatorio",
      });
      return;
    }

    // Determinar avatar_url: si hay archivo nuevo, usarlo; si hay preview (URL existente), mantenerlo
    // Si avatarPreview está vacío pero había avatar_url, significa que se eliminó (se maneja en removeAvatar)
    const finalAvatarUrl = avatarFile || (avatarPreview || null);

    // Si está en "select", es inquilino (tenant), de lo contrario es propietario (landlord)
    const userRole = publisherType === "select" ? "tenant" : "landlord";
    const finalPublisherType = publisherType === "select" ? null : publisherType;

    updateProfile.mutate({
      role: userRole,
      publisher_type: finalPublisherType === "select" ? null : finalPublisherType,
      company_name: publisherType === "inmobiliaria" ? companyName.trim() : null,
      company_logo: publisherType === "inmobiliaria" 
        ? (companyLogoFile || (companyLogoPreview || null))
        : null,
      phone: phone.trim() || null,
      address: publisherType === "inmobiliaria" ? (address.trim() || null) : null,
      avatar_url: finalAvatarUrl,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-16">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Cargando perfil...</p>
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
      
      <main className="pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            to="/mis-inmuebles"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a mis inmuebles</span>
          </Link>

          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
                  <User className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground">
                    Configuración de Perfil
                  </h1>
                  <p className="text-muted-foreground">
                    Configura cómo quieres que aparezcan tus inmuebles
                  </p>
                </div>
              </div>

              {/* Plan Info */}
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isProPlan ? (
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-primary" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Star className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Plan actual</p>
                      <p className="font-semibold text-foreground">
                        {getPlanDisplayName()}
                      </p>
                    </div>
                  </div>
                  <Link to="/planes">
                    <Button variant="outline" size="sm">
                      {isProPlan ? "Gestionar plan" : "Ver planes"}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Avatar Section */}
            <div className="mb-6 bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-6">
                {/* Avatar Display */}
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={avatarPreview || profile?.avatar_url || undefined} alt="Avatar" />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="w-10 h-10" />
                    </AvatarFallback>
                  </Avatar>
                  {/* Badge de aprobación de seguro para inquilinos */}
                  {isTenant && hasInsuranceApproval && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                      <Shield className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Avatar Actions */}
                <div className="flex-grow space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Foto de perfil</Label>
                    {isTenant && hasInsuranceApproval && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Cliente con aprobación
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {avatarPreview || profile?.avatar_url ? "Cambiar foto" : "Subir foto"}
                    </Button>
                    {(avatarPreview || profile?.avatar_url) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeAvatar}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG hasta 5MB. La foto aparecerá en tu perfil y en tus reviews.
                  </p>
                  {isTenant && (
                    <div className="pt-2">
                      <Link to="/seguros">
                        <Button type="button" variant="outline" size="sm" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          {hasInsuranceApproval ? "Gestionar seguros" : "Agregar aprobación de seguro"}
                        </Button>
                      </Link>
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 bg-card rounded-xl border border-border p-6">
              {/* Tipo de publicador */}
              <div className="space-y-2">
                <Label htmlFor="publisherType">Tipo de publicador *</Label>
                <Select
                  value={publisherType}
                  onValueChange={(value) => {
                    setPublisherType(value as "select" | "individual" | "inmobiliaria");
                    if (value === "individual") {
                      setCompanyName("");
                      setCompanyLogoFile(null);
                      setCompanyLogoPreview("");
                    }
                  }}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select">Seleccionar</SelectItem>
                    <SelectItem value="individual">Particular</SelectItem>
                    <SelectItem value="inmobiliaria">Inmobiliaria</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {publisherType === "select"
                    ? "Si no seleccionas nada, se guardará como Inquilino por defecto"
                    : publisherType === "individual"
                    ? "Tus inmuebles aparecerán publicados por ti como particular."
                    : "Tus inmuebles aparecerán bajo el nombre de tu inmobiliaria."}
                </p>
              </div>

              {/* Campos de inmobiliaria */}
              {publisherType === "inmobiliaria" && (
                <>
                  {/* Nombre comercial */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName">
                      Nombre comercial de la inmobiliaria *
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="Ej: Inmobiliaria XYZ"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  {/* Logo */}
                  <div className="space-y-2">
                    <Label htmlFor="companyLogo">Logo</Label>
                    
                    {/* Preview del logo */}
                    {companyLogoPreview && (
                      <div className="relative border border-border rounded-lg p-4 bg-muted/50">
                        <img
                          src={companyLogoPreview}
                          alt="Logo preview"
                          className="max-h-32 max-w-full object-contain mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Upload Button */}
                    {!companyLogoPreview && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-medium text-foreground mb-1">
                          Haz clic para subir logo
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG hasta 5MB
                        </p>
                      </div>
                    )}

                    {/* Cambiar logo si ya hay uno */}
                    {companyLogoPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Cambiar logo
                      </Button>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">
                      Logo de tu inmobiliaria (opcional)
                    </p>
                  </div>

                  {/* Dirección */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="address"
                        type="text"
                        placeholder="Ej: Calle 123 #45-67, Bogotá"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="pl-10 h-12"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dirección de la inmobiliaria (opcional)
                    </p>
                  </div>
                </>
              )}

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono de contacto</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Ej: +57 300 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Teléfono de contacto (opcional)
                </p>
              </div>

              {/* Preview del logo si existe */}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full"
                disabled={updateProfile.isPending || (publisherType === "inmobiliaria" && !companyName.trim())}
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
