import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  FileText,
  ImagePlus,
  Loader2,
  CheckCircle,
  X,
  Star,
  Car,
  Layers,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import colombiaData from "@/data/colombia-departments.json";

// Lista de características disponibles
const PROPERTY_FEATURES = [
  "Ascensor",
  "Balcón",
  "Barra estilo americano",
  "Baño auxiliar",
  "Circuito cerrado de TV",
  "Cocina integral",
  "Cocina tipo americano",
  "Colegios / Universidades cercanos",
  "En conjunto cerrado",
  "Estudio",
  "Gimnasio",
  "Instalación de gas",
  "Parqueadero visitantes",
  "Parques cercanos",
  "Piscina",
  "Planta eléctrica",
  "Portería / Recepción",
  "Salón comunal",
  "Sobre vía principal",
  "Supermercados / Centros comerciales",
  "Terraza",
  "Transporte público cercano",
  "Vigilancia",
  "Vista panorámica",
  "Zona de lavandería",
  "Zona infantil",
] as const;
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { useMyProperties } from "@/hooks/use-my-properties";
import { useToast } from "@/hooks/use-toast";
import { useUserReview } from "@/hooks/use-reviews";
import { supabase } from "@/integrations/supabase/client";
import { useProperty } from "@/hooks/use-properties";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ReviewModal from "@/components/reviews/ReviewModal";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UploadedImage = {
  file?: File;
  preview: string;
  isPrimary: boolean;
  url?: string; // Para imágenes existentes
  id?: string; // Para imágenes existentes
};

const Publish = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: myProperties = [] } = useMyProperties();
  const { data: userReview } = useUserReview();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;
  const { data: propertyData, isLoading: isLoadingProperty } = useProperty(editId || undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isInmobiliaria = profile?.publisher_type === "inmobiliaria";
  const publishedPropertiesCount = Array.isArray(myProperties) ? myProperties.filter((p) => p.status === "published").length : 0;
  const FREE_LIMIT = 5; // Límite suave para inmobiliarias
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    propertyType: "",
    city: "",
    neighborhood: "",
    address: "",
    price: "",
    description: "",
    bedrooms: "1",
    bathrooms: "1",
    area: "",
    departamento: "",
    municipio: "",
    tieneParqueadero: false,
    cantidadParqueaderos: "",
    estrato: "",
    incluyeAdministracion: false,
    valorAdministracion: "",
    caracteristicas: [] as string[],
  });

  // Estados para manejar municipios según departamento
  const [availableMunicipalities, setAvailableMunicipalities] = useState<string[]>([]);

  // Cargar municipios cuando cambia el departamento
  useEffect(() => {
    // No ejecutar si estamos cargando datos en modo edición
    if (isEditMode && propertyData) {
      return;
    }
    
    if (formData.departamento) {
      const department = colombiaData.departments.find(
        (d) => d.name === formData.departamento
      );
      if (department) {
        setAvailableMunicipalities(department.municipalities);
        // Si el municipio actual no está en la lista, limpiarlo (solo si no está en modo edición)
        if (formData.municipio && !department.municipalities.includes(formData.municipio) && !isEditMode) {
          setFormData((prev) => ({ ...prev, municipio: "", city: "" }));
        }
      } else {
        setAvailableMunicipalities([]);
      }
    } else {
      setAvailableMunicipalities([]);
      // Solo limpiar municipio si no está en modo edición
      if (!isEditMode) {
        setFormData((prev) => ({ ...prev, municipio: "", city: "" }));
      }
    }
  }, [formData.departamento, isEditMode, propertyData]);

  // Actualizar ciudad automáticamente cuando cambia el municipio
  useEffect(() => {
    if (formData.municipio) {
      setFormData((prev) => ({ ...prev, city: formData.municipio }));
    }
  }, [formData.municipio]);

  // Limpiar formulario cuando se sale del modo edición
  useEffect(() => {
    if (!isEditMode) {
      setFormData({
        title: "",
        propertyType: "",
        city: "",
        neighborhood: "",
        address: "",
        price: "",
        description: "",
        bedrooms: "1",
        bathrooms: "1",
        area: "",
        departamento: "",
        municipio: "",
        tieneParqueadero: false,
        cantidadParqueaderos: "",
        estrato: "",
        incluyeAdministracion: false,
        valorAdministracion: "",
        caracteristicas: [],
      });
      setAvailableMunicipalities([]);
      // Limpiar imágenes y sus previews
      setUploadedImages((prev) => {
        prev.forEach((img) => {
          if (img.file) {
            URL.revokeObjectURL(img.preview);
          }
        });
        return [];
      });
    }
  }, [editId]); // Solo cuando cambia editId

  // Cargar datos de la propiedad si está en modo edición
  useEffect(() => {
    if (isEditMode && propertyData) {
      // Usar municipio como ciudad si existe, sino usar city existente
      const cityValue = propertyData.municipio || propertyData.city || "";
      const departamentoValue = propertyData.departamento || "";
      const municipioValue = propertyData.municipio || "";
      
      // Cargar municipios disponibles si hay departamento
      if (departamentoValue) {
        const department = colombiaData.departments.find(
          (d) => d.name === departamentoValue
        );
        if (department) {
          setAvailableMunicipalities(department.municipalities);
        }
      }
      
      // Cargar datos del inmueble
      setFormData({
        title: propertyData.title || "",
        propertyType: propertyData.property_type || "",
        city: cityValue,
        neighborhood: propertyData.neighborhood || "",
        address: propertyData.address || "",
        price: propertyData.price?.toString() || "",
        description: propertyData.description || "",
        bedrooms: propertyData.bedrooms?.toString() || "1",
        bathrooms: propertyData.bathrooms?.toString() || "1",
        area: propertyData.area?.toString() || "",
        departamento: departamentoValue,
        municipio: municipioValue,
        tieneParqueadero: propertyData.tiene_parqueadero || false,
        cantidadParqueaderos: propertyData.cantidad_parqueaderos?.toString() || "",
        estrato: propertyData.estrato?.toString() || "",
        incluyeAdministracion: propertyData.incluye_administracion || false,
        valorAdministracion: propertyData.valor_administracion?.toString() || "",
        caracteristicas: propertyData.caracteristicas || [],
      });

      // Cargar imágenes existentes
      if (propertyData.property_images && propertyData.property_images.length > 0) {
        const existingImages: UploadedImage[] = propertyData.property_images.map((img) => ({
          preview: img.url,
          url: img.url,
          id: img.id,
          isPrimary: img.is_primary || false,
        }));
        setUploadedImages(existingImages);
      } else {
        setUploadedImages([]);
      }
    }
  }, [isEditMode, propertyData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: UploadedImage[] = [];
    
    Array.from(files).forEach((file) => {
      // Validar que sea imagen
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Archivo no válido",
          description: `${file.name} no es una imagen válida.`,
        });
        return;
      }

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Archivo muy grande",
          description: `${file.name} supera el límite de 5MB.`,
        });
        return;
      }

      const preview = URL.createObjectURL(file);
      newImages.push({
        file,
        preview,
        isPrimary: uploadedImages.length === 0 && newImages.length === 0, // Primera imagen es principal por defecto
      });
    });

    setUploadedImages((prev) => [...prev, ...newImages]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index);
      // Si se elimina la principal, hacer la primera la nueva principal
      if (prev[index].isPrimary && newImages.length > 0) {
        newImages[0].isPrimary = true;
      }
      // Liberar URL del preview solo si es un archivo nuevo
      if (prev[index].file) {
        URL.revokeObjectURL(prev[index].preview);
      }
      return newImages;
    });
  };

  const setPrimaryImage = (index: number) => {
    setUploadedImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  };

  const uploadImagesToStorage = async (propertyId: string): Promise<string[]> => {
    const uploadedUrls: { url: string; isPrimary: boolean }[] = [];

    // Solo procesar imágenes nuevas (que tienen file)
    const newImages = uploadedImages.filter(img => img.file);

    for (const image of newImages) {
      if (!image.file) continue;

      const fileExt = image.file.name.split(".").pop();
      const fileName = `${user!.id}/${propertyId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, image.file);

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from("property-images")
        .getPublicUrl(fileName);

      uploadedUrls.push({
        url: publicUrl.publicUrl,
        isPrimary: image.isPrimary,
      });
    }

    // Insertar en property_images solo las nuevas
    if (uploadedUrls.length > 0) {
      const { error } = await supabase.from("property_images").insert(
        uploadedUrls.map((img) => ({
          property_id: propertyId,
          url: img.url,
          is_primary: img.isPrimary,
        }))
      );

      if (error) {
        console.error("Error saving image records:", error);
      }
    }

    return uploadedUrls.map((u) => u.url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para publicar una propiedad.",
      });
      navigate("/auth");
      return;
    }

    // Validaciones
    if (!formData.departamento || !formData.municipio) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Debes seleccionar el departamento y municipio.",
      });
      return;
    }

    if (!formData.estrato) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Debes seleccionar el estrato del inmueble.",
      });
      return;
    }

    if (formData.tieneParqueadero && !formData.cantidadParqueaderos) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Si el inmueble tiene parqueadero, debes indicar la cantidad.",
      });
      return;
    }

    if (!formData.incluyeAdministracion && !formData.valorAdministracion) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Si la administración no está incluida, debes indicar su valor.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const propertyId = isEditMode ? editId : undefined;

      if (isEditMode && propertyId) {
        // Actualizar la propiedad existente
        // Usar municipio como ciudad si está disponible
        const cityValue = formData.municipio || formData.city || "";
        
        const { error: propertyError } = await supabase
          .from("properties")
          .update({
            title: formData.title,
            property_type: formData.propertyType as "apartamento" | "casa" | "apartaestudio" | "local" | "loft" | "penthouse",
            city: cityValue,
            neighborhood: formData.neighborhood || null,
            address: formData.address || null,
            price: parseFloat(formData.price),
            description: formData.description || null,
            bedrooms: parseInt(formData.bedrooms),
            bathrooms: parseInt(formData.bathrooms),
            area: formData.area ? parseInt(formData.area) : null,
            departamento: formData.departamento,
            municipio: formData.municipio,
            tiene_parqueadero: formData.tieneParqueadero,
            cantidad_parqueaderos: formData.tieneParqueadero && formData.cantidadParqueaderos ? parseInt(formData.cantidadParqueaderos) : null,
            estrato: parseInt(formData.estrato),
            incluye_administracion: formData.incluyeAdministracion,
            valor_administracion: !formData.incluyeAdministracion && formData.valorAdministracion ? parseFloat(formData.valorAdministracion) : null,
            caracteristicas: formData.caracteristicas.length > 0 ? formData.caracteristicas : null,
          })
          .eq("id", propertyId);

        if (propertyError) throw propertyError;

        // Manejar imágenes: eliminar las que se quitaron y agregar las nuevas
        const existingImageIds = uploadedImages.filter(img => img.id).map(img => img.id!);
        const newImages = uploadedImages.filter(img => img.file);

        // Eliminar imágenes que ya no están en la lista
        if (propertyData?.property_images) {
          const imagesToDelete = propertyData.property_images
            .filter(img => !existingImageIds.includes(img.id))
            .map(img => img.id);

          if (imagesToDelete.length > 0) {
            await supabase
              .from("property_images")
              .delete()
              .in("id", imagesToDelete);
          }
        }

        // Actualizar estado de imágenes existentes (principal)
        for (const img of uploadedImages.filter(img => img.id)) {
          await supabase
            .from("property_images")
            .update({ is_primary: img.isPrimary })
            .eq("id", img.id);
        }

        // Subir nuevas imágenes
        if (newImages.length > 0) {
          setIsUploading(true);
          await uploadImagesToStorage(propertyId);
          setIsUploading(false);
        }

        setIsSuccess(true);
        // Invalidar queries para actualizar UI
        queryClient.invalidateQueries({ queryKey: ["my-properties"] });
        queryClient.invalidateQueries({ queryKey: ["properties"] });
        queryClient.invalidateQueries({ queryKey: ["is-landlord"] }); // Actualizar estado de arrendador
        
        toast({
          title: "¡Propiedad actualizada!",
          description: "Los cambios se han guardado correctamente.",
        });

        setTimeout(() => {
          navigate("/mis-inmuebles");
        }, 2000);
      } else {
        // Crear nueva propiedad
        // Usar municipio como ciudad
        const cityValue = formData.municipio || formData.city || "";
        
        const { data: property, error: propertyError } = await supabase
          .from("properties")
          .insert({
            owner_id: user.id,
            title: formData.title,
            property_type: formData.propertyType as "apartamento" | "casa" | "apartaestudio" | "local" | "loft" | "penthouse",
            city: cityValue,
            neighborhood: formData.neighborhood || null,
            address: formData.address || null,
            price: parseFloat(formData.price),
            description: formData.description || null,
            bedrooms: parseInt(formData.bedrooms),
            bathrooms: parseInt(formData.bathrooms),
            area: formData.area ? parseInt(formData.area) : null,
            departamento: formData.departamento,
            municipio: formData.municipio,
            tiene_parqueadero: formData.tieneParqueadero,
            cantidad_parqueaderos: formData.tieneParqueadero && formData.cantidadParqueaderos ? parseInt(formData.cantidadParqueaderos) : null,
            estrato: parseInt(formData.estrato),
            incluye_administracion: formData.incluyeAdministracion,
            valor_administracion: !formData.incluyeAdministracion && formData.valorAdministracion ? parseFloat(formData.valorAdministracion) : null,
            caracteristicas: formData.caracteristicas.length > 0 ? formData.caracteristicas : null,
            status: "published",
          })
          .select()
          .single();

        if (propertyError) throw propertyError;

        // Subir imágenes si hay
        if (uploadedImages.length > 0 && property) {
          setIsUploading(true);
          await uploadImagesToStorage(property.id);
          setIsUploading(false);
        }

        setIsSuccess(true);
        // Invalidar queries para actualizar UI (incluyendo estado de arrendador)
        queryClient.invalidateQueries({ queryKey: ["my-properties"] });
        queryClient.invalidateQueries({ queryKey: ["properties"] });
        queryClient.invalidateQueries({ queryKey: ["properties-count"] });
        queryClient.invalidateQueries({ queryKey: ["is-landlord"] }); // Actualizar estado de arrendador
        
        toast({
          title: "¡Propiedad publicada!",
          description: "Tu inmueble ya está visible para todos los usuarios.",
        });

        // Limpiar previews
        uploadedImages.forEach((img) => {
          if (img.file) {
            URL.revokeObjectURL(img.preview);
          }
        });

        // Mostrar modal de review si el usuario no tiene una review previa
        if (user && !userReview) {
          setTimeout(() => {
            setShowReviewModal(true);
          }, 1000); // Pequeño delay para que el usuario vea el toast primero
        }

        // Redirigir después de 2 segundos
        setTimeout(() => {
          navigate("/buscar");
        }, 2000);
      }

    } catch (error: any) {
      console.error("Error al guardar:", error);
      toast({
        variant: "destructive",
        title: isEditMode ? "Error al actualizar" : "Error al publicar",
        description: error.message || "Ocurrió un error inesperado. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-4">
                {isEditMode ? "¡Propiedad Actualizada!" : "¡Propiedad Publicada!"}
              </h1>
              <p className="text-muted-foreground mb-8">
                {isEditMode 
                  ? "Los cambios se han guardado correctamente. Serás redirigido a tus inmuebles."
                  : "Tu inmueble ya está disponible para todos los usuarios. Serás redirigido a la página de búsqueda."}
              </p>
              <Link to={isEditMode ? "/mis-inmuebles" : "/buscar"}>
                <Button>{isEditMode ? "Ver mis inmuebles" : "Ver propiedades"}</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Mostrar loading mientras se cargan los datos en modo edición
  if (isEditMode && isLoadingProperty) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-16">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Cargando datos del inmueble...</p>
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
            to={isEditMode ? "/mis-inmuebles" : "/"}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isEditMode ? "Volver a mis inmuebles" : "Volver al inicio"}</span>
          </Link>

          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
                  <Building2 className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground">
                    {isEditMode ? "Modificar Inmueble" : "Publicar Inmueble"}
                  </h1>
                  <p className="text-muted-foreground">
                    {isEditMode ? "Actualiza la información de tu propiedad" : "Completa la información de tu propiedad"}
                  </p>
                </div>
              </div>
            </div>

            {/* Mensaje informativo para inmobiliarias */}
            {isInmobiliaria && !isEditMode && publishedPropertiesCount >= FREE_LIMIT && (
              <Alert className="mb-6 border-primary/20 bg-primary/5">
                <Building2 className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <span className="font-medium text-foreground">
                    Has alcanzado el límite de publicaciones gratuitas.
                  </span>{" "}
                  Próximamente tendremos planes para inmobiliarias con más beneficios.{" "}
                  <Link to="/planes" className="text-primary hover:underline font-medium">
                    Conocer planes
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título del anuncio *</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="title"
                    type="text"
                    placeholder="Ej: Apartamento moderno en Chapinero"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              {/* Tipo de inmueble */}
              <div className="space-y-2">
                <Label htmlFor="propertyType">Tipo de inmueble *</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
                  required
                >
                  <SelectTrigger className="h-12">
                    <Home className="w-5 h-5 text-muted-foreground mr-2" />
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="apartaestudio">Apartaestudio</SelectItem>
                    <SelectItem value="local">Local comercial</SelectItem>
                    <SelectItem value="loft">Loft</SelectItem>
                    <SelectItem value="penthouse">Penthouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Departamento y Municipio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento *</Label>
                  <Select
                    value={formData.departamento}
                    onValueChange={(value) => setFormData({ ...formData, departamento: value, municipio: "" })}
                    required
                  >
                    <SelectTrigger className="h-12">
                      <MapPin className="w-5 h-5 text-muted-foreground mr-2" />
                      <SelectValue placeholder="Selecciona el departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {colombiaData.departments.map((dept) => (
                        <SelectItem key={dept.name} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="municipio">Municipio *</Label>
                  <Select
                    value={formData.municipio}
                    onValueChange={(value) => setFormData({ ...formData, municipio: value })}
                    disabled={!formData.departamento || availableMunicipalities.length === 0}
                    required
                  >
                    <SelectTrigger className="h-12">
                      <MapPin className="w-5 h-5 text-muted-foreground mr-2" />
                      <SelectValue placeholder={formData.departamento ? "Selecciona el municipio" : "Primero selecciona el departamento"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMunicipalities.map((municipio) => (
                        <SelectItem key={municipio} value={municipio}>
                          {municipio}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Barrio */}
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Barrio</Label>
                <Input
                  id="neighborhood"
                  type="text"
                  placeholder="Ej: Chapinero"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="h-12"
                />
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Ej: Calle 123 #45-67"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="h-12"
                />
              </div>

              {/* Precio */}
              <div className="space-y-2">
                <Label htmlFor="price">Precio mensual (COP) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    placeholder="Ej: 2500000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="pl-10 h-12"
                    required
                    min="0"
                  />
                </div>
              </div>

              {/* Habitaciones, Baños, Área */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Habitaciones</Label>
                  <Select
                    value={formData.bedrooms}
                    onValueChange={(value) => setFormData({ ...formData, bedrooms: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Baños</Label>
                  <Select
                    value={formData.bathrooms}
                    onValueChange={(value) => setFormData({ ...formData, bathrooms: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Área (m²)</Label>
                  <Input
                    id="area"
                    type="number"
                    placeholder="Ej: 80"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="h-12"
                    min="0"
                  />
                </div>
              </div>

              {/* Estrato */}
              <div className="space-y-2">
                <Label htmlFor="estrato">Estrato *</Label>
                <Select
                  value={formData.estrato}
                  onValueChange={(value) => setFormData({ ...formData, estrato: value })}
                  required
                >
                  <SelectTrigger className="h-12">
                    <Layers className="w-5 h-5 text-muted-foreground mr-2" />
                    <SelectValue placeholder="Selecciona el estrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        Estrato {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parqueadero */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="parqueadero">¿Tiene parqueadero?</Label>
                    <p className="text-sm text-muted-foreground">Indica si el inmueble cuenta con parqueadero</p>
                  </div>
                  <Switch
                    id="parqueadero"
                    checked={formData.tieneParqueadero}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        tieneParqueadero: checked,
                        cantidadParqueaderos: checked ? formData.cantidadParqueaderos : "",
                      });
                    }}
                  />
                </div>
                {formData.tieneParqueadero && (
                  <div className="space-y-2">
                    <Label htmlFor="cantidadParqueaderos">Cantidad de parqueaderos *</Label>
                    <div className="relative">
                      <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Select
                        value={formData.cantidadParqueaderos}
                        onValueChange={(value) => setFormData({ ...formData, cantidadParqueaderos: value })}
                        required
                      >
                        <SelectTrigger className="h-12 pl-10">
                          <SelectValue placeholder="Selecciona la cantidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n} {n === 1 ? "parqueadero" : "parqueaderos"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Administración */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="administracion">¿Incluye administración?</Label>
                    <p className="text-sm text-muted-foreground">Indica si el precio incluye el valor de administración</p>
                  </div>
                  <Switch
                    id="administracion"
                    checked={formData.incluyeAdministracion}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        incluyeAdministracion: checked,
                        valorAdministracion: checked ? "" : formData.valorAdministracion,
                      });
                    }}
                  />
                </div>
                {!formData.incluyeAdministracion && (
                  <div className="space-y-2">
                    <Label htmlFor="valorAdministracion">Valor administración mensual (COP) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="valorAdministracion"
                        type="number"
                        placeholder="Ej: 150000"
                        value={formData.valorAdministracion}
                        onChange={(e) => setFormData({ ...formData, valorAdministracion: e.target.value })}
                        className="pl-10 h-12"
                        required
                        min="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe las características de tu inmueble..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[120px] resize-none"
                />
              </div>

              {/* Características del inmueble */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Características del inmueble</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecciona las características que aplican a tu propiedad.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PROPERTY_FEATURES.map((feature) => {
                    const isChecked = formData.caracteristicas.includes(feature);
                    return (
                      <div
                        key={feature}
                        className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`feature-${feature}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setFormData((prev) => {
                              if (checked) {
                                // Si ya está en la lista, no hacer nada
                                if (prev.caracteristicas.includes(feature)) {
                                  return prev;
                                }
                                return {
                                  ...prev,
                                  caracteristicas: [...prev.caracteristicas, feature],
                                };
                              } else {
                                return {
                                  ...prev,
                                  caracteristicas: prev.caracteristicas.filter((f) => f !== feature),
                                };
                              }
                            });
                          }}
                        />
                        <label
                          htmlFor={`feature-${feature}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {feature}
                        </label>
                      </div>
                    );
                  })}
                </div>
                {formData.caracteristicas.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.caracteristicas.length} {formData.caracteristicas.length === 1 ? "característica seleccionada" : "características seleccionadas"}
                  </p>
                )}
              </div>

              {/* Imágenes */}
              <div className="space-y-4">
                <Label>Fotos del inmueble</Label>
                
                {/* Uploaded Images Grid */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedImages.map((image, index) => (
                      <div
                        key={index}
                        className={cn(
                          "relative aspect-[4/3] rounded-xl overflow-hidden border-2 group",
                          image.isPrimary ? "border-primary" : "border-border"
                        )}
                      >
                        <img
                          src={image.preview}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Overlay con acciones */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {/* Botón para hacer principal */}
                          {!image.isPrimary && (
                            <button
                              type="button"
                              onClick={() => setPrimaryImage(index)}
                              className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                              title="Hacer imagen principal"
                            >
                              <Star className="w-5 h-5 text-amber-500" />
                            </button>
                          )}
                          
                          {/* Botón para eliminar */}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                            title="Eliminar imagen"
                          >
                            <X className="w-5 h-5 text-destructive" />
                          </button>
                        </div>
                        
                        {/* Badge de principal */}
                        {image.isPrimary && (
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Principal
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <ImagePlus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Haz clic para subir imágenes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG hasta 5MB. La primera imagen será la principal.
                  </p>
                </div>
                
                {uploadedImages.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {uploadedImages.length} {uploadedImages.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}. 
                    Haz clic en la estrella para cambiar la imagen principal.
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full"
                disabled={
                  isLoading ||
                  !formData.title ||
                  !formData.propertyType ||
                  !formData.price ||
                  !formData.departamento ||
                  !formData.municipio ||
                  !formData.estrato ||
                  (formData.tieneParqueadero && !formData.cantidadParqueaderos) ||
                  (!formData.incluyeAdministracion && !formData.valorAdministracion)
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isUploading ? "Subiendo imágenes..." : isEditMode ? "Actualizando..." : "Publicando..."}
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 mr-2" />
                    {isEditMode ? "Actualizar Inmueble" : "Publicar Inmueble"}
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>

      {/* Modal de Review */}
      {user && <ReviewModal open={showReviewModal} onOpenChange={setShowReviewModal} />}

      <Footer />
    </div>
  );
};

export default Publish;
