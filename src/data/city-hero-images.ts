// Mapeo de ciudades principales de Colombia a sus imágenes de fondo del hero
// Las imágenes deben estar en: public/images/hero/
// Formato: JPG, alta resolución (mínimo 1920x1080), estilo profesional y representativas de cada ciudad

export interface CityHeroImage {
  city: string;
  imageUrl: string;
  alt: string;
}

// Mapa de ciudades a rutas locales de imágenes
// Las imágenes deben estar en la carpeta public/images/hero/ con los siguientes nombres:
// - bogota.jpg
// - medellin.jpg
// - cali.jpg
// - bucaramanga.jpg
// - pasto.jpg
// - cucuta.jpg
// - barranquilla.jpg
// - cartagena.jpg
export const cityHeroImages: CityHeroImage[] = [
  {
    city: "Bogotá",
    imageUrl: "/images/hero/bogota.jpg",
    alt: "Vista aérea de Bogotá, Colombia",
  },
  {
    city: "Medellín",
    imageUrl: "/images/hero/medellin.jpg",
    alt: "Vista aérea de Medellín, Colombia",
  },
  {
    city: "Cali",
    imageUrl: "/images/hero/cali.jpg",
    alt: "Vista aérea de Cali, Colombia",
  },
  {
    city: "Bucaramanga",
    imageUrl: "/images/hero/bucaramanga.jpg",
    alt: "Vista aérea de Bucaramanga, Colombia",
  },
  {
    city: "Pasto",
    imageUrl: "/images/hero/pasto.jpg",
    alt: "Vista aérea de Pasto, Colombia",
  },
  {
    city: "Cúcuta",
    imageUrl: "/images/hero/cucuta.jpg",
    alt: "Vista aérea de Cúcuta, Colombia",
  },
  {
    city: "Barranquilla",
    imageUrl: "/images/hero/barranquilla.jpg",
    alt: "Vista aérea de Barranquilla, Colombia",
  },
  {
    city: "Cartagena",
    imageUrl: "/images/hero/cartagena.jpg",
    alt: "Vista aérea de Cartagena, Colombia",
  },
];

// Función para obtener la imagen de una ciudad específica
export const getCityHeroImage = (cityName: string): CityHeroImage | null => {
  if (!cityName) return null;
  
  // Normalizar el nombre de la ciudad (sin tildes, minúsculas)
  const normalizedCity = cityName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  
  return (
    cityHeroImages.find(
      (item) =>
        item.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedCity
    ) || null
  );
};

// Función para detectar si un texto contiene el nombre de una ciudad
export const detectCityInText = (text: string): CityHeroImage | null => {
  if (!text) return null;
  
  const normalizedText = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  
  // Buscar coincidencias exactas o parciales
  for (const cityImage of cityHeroImages) {
    const normalizedCity = cityImage.city
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    if (normalizedText.includes(normalizedCity) || normalizedCity.includes(normalizedText)) {
      return cityImage;
    }
  }
  
  return null;
};

// Imagen por defecto (usar la primera ciudad o una imagen genérica)
export const defaultHeroImage: CityHeroImage = cityHeroImages[0];
