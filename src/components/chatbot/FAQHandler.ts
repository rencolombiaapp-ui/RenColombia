// Respuestas predefinidas para preguntas frecuentes

export interface FAQAnswer {
  question: string;
  answer: string;
  links?: Array<{ text: string; url: string }>;
}

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  links?: Array<{ text: string; url: string }>;
}

// Lista ordenada de preguntas frecuentes
export const faqList: FAQItem[] = [
  {
    id: 1,
    question: "¿Cómo publico un inmueble?",
    answer: "Para publicar un inmueble:\n\n1. Inicia sesión en tu cuenta\n2. Haz clic en 'Publicar' en el menú\n3. Completa el formulario con la información de tu inmueble\n4. Sube las fotografías\n5. Publica tu inmueble\n\n¡Es completamente gratis!",
    links: [
      { text: "Publicar inmueble", url: "/publicar" }
    ]
  },
  {
    id: 2,
    question: "¿Publicar es gratis?",
    answer: "Sí, publicar inmuebles en RenColombia es completamente gratis. No cobramos por publicar tu propiedad en esta etapa inicial.",
    links: [
      { text: "Ver precios", url: "/precios" }
    ]
  },
  {
    id: 3,
    question: "¿Cómo funcionan los favoritos?",
    answer: "Los favoritos te permiten guardar inmuebles que te interesan:\n\n1. Haz clic en el corazón ❤️ en cualquier inmueble\n2. Accede a tus favoritos desde el menú\n3. Compara y revisa tus inmuebles guardados\n\nNecesitas iniciar sesión para usar esta función.",
    links: [
      { text: "Ver favoritos", url: "/favoritos" }
    ]
  },
  {
    id: 4,
    question: "¿Quién publica los inmuebles?",
    answer: "En RenColombia pueden publicar:\n\n• Propietarios directos\n• Inmobiliarias\n\nAmbos pueden publicar sus inmuebles de forma gratuita. Las inmobiliarias pueden mostrar su marca y logo en sus publicaciones.",
  },
  {
    id: 5,
    question: "¿Cómo contacto al propietario?",
    answer: "Para contactar al propietario:\n\n1. Ve al detalle del inmueble\n2. Haz clic en 'Estoy interesado'\n3. Elige enviar un mensaje o ver información de contacto\n\nEl propietario recibirá tu mensaje y podrá responderte.",
  },
  {
    id: 6,
    question: "¿Qué información necesito para publicar?",
    answer: "Para publicar un inmueble necesitas:\n\n• Título y descripción\n• Ubicación (departamento, municipio, barrio, dirección)\n• Precio mensual\n• Tipo de inmueble\n• Área, habitaciones, baños\n• Estrato\n• Información de parqueadero y administración\n• Fotografías del inmueble\n\nEl proceso es rápido y sencillo.",
    links: [
      { text: "Publicar ahora", url: "/publicar" }
    ]
  },
];

const faqDatabase: Record<string, FAQAnswer> = {
  "como publico": {
    question: "¿Cómo publico un inmueble?",
    answer: "Para publicar un inmueble:\n\n1. Inicia sesión en tu cuenta\n2. Haz clic en 'Publicar' en el menú\n3. Completa el formulario con la información de tu inmueble\n4. Sube las fotografías\n5. Publica tu inmueble\n\n¡Es completamente gratis!",
    links: [
      { text: "Publicar inmueble", url: "/publicar" }
    ]
  },
  "publicar es gratis": {
    question: "¿Publicar es gratis?",
    answer: "Sí, publicar inmuebles en RenColombia es completamente gratis. No cobramos por publicar tu propiedad en esta etapa inicial.",
    links: [
      { text: "Ver precios", url: "/precios" }
    ]
  },
  "como funcionan los favoritos": {
    question: "¿Cómo funcionan los favoritos?",
    answer: "Los favoritos te permiten guardar inmuebles que te interesan:\n\n1. Haz clic en el corazón ❤️ en cualquier inmueble\n2. Accede a tus favoritos desde el menú\n3. Compara y revisa tus inmuebles guardados\n\nNecesitas iniciar sesión para usar esta función.",
    links: [
      { text: "Ver favoritos", url: "/favoritos" }
    ]
  },
  "quien publica": {
    question: "¿Quién publica los inmuebles?",
    answer: "En RenColombia pueden publicar:\n\n• Propietarios directos\n• Inmobiliarias\n\nAmbos pueden publicar sus inmuebles de forma gratuita. Las inmobiliarias pueden mostrar su marca y logo en sus publicaciones.",
  },
  "como contacto": {
    question: "¿Cómo contacto al propietario?",
    answer: "Para contactar al propietario:\n\n1. Ve al detalle del inmueble\n2. Haz clic en 'Estoy interesado'\n3. Elige enviar un mensaje o ver información de contacto\n\nEl propietario recibirá tu mensaje y podrá responderte.",
  },
  "que informacion necesito": {
    question: "¿Qué información necesito para publicar?",
    answer: "Para publicar un inmueble necesitas:\n\n• Título y descripción\n• Ubicación (departamento, municipio, barrio, dirección)\n• Precio mensual\n• Tipo de inmueble\n• Área, habitaciones, baños\n• Estrato\n• Información de parqueadero y administración\n• Fotografías del inmueble\n\nEl proceso es rápido y sencillo.",
    links: [
      { text: "Publicar ahora", url: "/publicar" }
    ]
  },
  "precio": {
    question: "¿Cuál es el precio?",
    answer: "Publicar inmuebles en RenColombia es completamente gratis. No cobramos comisiones ni tarifas por publicar.",
    links: [
      { text: "Ver más información", url: "/precios" }
    ]
  },
  "costo": {
    question: "¿Tiene algún costo?",
    answer: "RenColombia es gratuito para publicar inmuebles. No hay costos ocultos ni comisiones.",
  },
};

// Función para buscar respuesta en el FAQ
export const findFAQAnswer = (question: string): FAQAnswer | null => {
  const normalizedQuestion = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Buscar coincidencias en las claves
  for (const [key, answer] of Object.entries(faqDatabase)) {
    if (normalizedQuestion.includes(key)) {
      return answer;
    }
  }
  
  return null;
};

// Obtener FAQ por número
export const getFAQByNumber = (number: number): FAQItem | null => {
  return faqList.find((faq) => faq.id === number) || null;
};

// Obtener todas las preguntas frecuentes disponibles
export const getAvailableFAQs = (): FAQItem[] => {
  return faqList;
};
