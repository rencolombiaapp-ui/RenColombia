import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowLeft, HelpCircle, Building2, MessageCircle, DollarSign, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Help = () => {
  const faqs = [
    {
      question: "¿Qué es RenColombia?",
      answer: "RenColombia es una plataforma digital que conecta propietarios e inquilinos en Colombia. Facilitamos la publicación y búsqueda de inmuebles para arrendamiento, permitiendo que propietarios publiquen sus propiedades de forma gratuita y que inquilinos encuentren su próximo hogar.",
    },
    {
      question: "¿Cómo publicar un inmueble?",
      answer: "Para publicar un inmueble, primero debes crear una cuenta en RenColombia. Luego, ve a 'Publicar' en el menú, completa la información del inmueble (título, tipo, ciudad, precio, descripción), sube fotos y haz clic en 'Publicar Inmueble'. Tu inmueble estará visible inmediatamente para todos los usuarios.",
    },
    {
      question: "¿Tiene costo publicar un inmueble?",
      answer: "No, publicar inmuebles en RenColombia es completamente gratuito. No cobramos por publicar, ni por gestionar tus propiedades. Próximamente ofreceremos opciones opcionales de visibilidad y planes para inmobiliarias, pero la publicación básica siempre será gratuita.",
    },
    {
      question: "¿Cómo contactar a un propietario?",
      answer: "Cuando encuentres un inmueble que te interese, puedes hacer clic en 'Estoy interesado' en la página de detalle del inmueble. Esto te permitirá enviar un mensaje de interés o ver la información de contacto del propietario (si está disponible). El propietario se pondrá en contacto contigo directamente.",
    },
    {
      question: "¿Cómo buscar inmuebles?",
      answer: "Puedes buscar inmuebles desde la página principal usando el buscador, o ir directamente a 'Buscar' en el menú. Puedes filtrar por tipo de inmueble, ciudad, precio, número de habitaciones y baños. También puedes buscar por texto libre (ciudad, barrio o dirección).",
    },
    {
      question: "¿Puedo guardar inmuebles en favoritos?",
      answer: "Sí, puedes guardar inmuebles en favoritos haciendo clic en el ícono de corazón en cualquier tarjeta de inmueble o en la página de detalle. Debes tener una cuenta para usar esta función. Puedes acceder a tus favoritos desde el menú 'Favoritos'.",
    },
    {
      question: "¿Cómo gestiono mis inmuebles publicados?",
      answer: "Si eres propietario y has publicado al menos un inmueble, verás la opción 'Mis Inmuebles' en el menú. Desde allí puedes ver todas tus propiedades, sus estadísticas (vistas, favoritos), pausar o reactivar publicaciones, modificar información y eliminar inmuebles.",
    },
    {
      question: "¿Qué es el modo inmobiliaria?",
      answer: "El modo inmobiliaria permite que las agencias inmobiliarias publiquen sus inmuebles bajo su marca comercial. Puedes activar este modo desde 'Configuración' en tu perfil. Esto te permite mostrar tu logo y nombre comercial en tus publicaciones.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio</span>
          </Link>

          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
                  <HelpCircle className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    Centro de Ayuda
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Encuentra respuestas a las preguntas más frecuentes sobre RenColombia
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Link
                to="/buscar"
                className="bg-card rounded-xl border border-border p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Buscar Inmuebles</p>
                    <p className="text-sm text-muted-foreground">Encuentra tu próximo hogar</p>
                  </div>
                </div>
              </Link>
              <Link
                to="/publicar"
                className="bg-card rounded-xl border border-border p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Publicar Inmueble</p>
                    <p className="text-sm text-muted-foreground">Gratis y rápido</p>
                  </div>
                </div>
              </Link>
              <Link
                to="/precios"
                className="bg-card rounded-xl border border-border p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Ver Precios</p>
                    <p className="text-sm text-muted-foreground">Información sobre costos</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* FAQ */}
            <div className="bg-card rounded-xl border border-border p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Preguntas Frecuentes</h2>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left font-semibold">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Contact Section */}
            <div className="bg-muted/50 rounded-xl border border-border p-6 md:p-8 mt-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    ¿No encuentras lo que buscas?
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Si tienes más preguntas o necesitas ayuda adicional, puedes contactarnos:
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Email:</strong>{" "}
                      <a href="mailto:info@rencolombia.com" className="text-primary hover:underline">
                        info@rencolombia.com
                      </a>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Teléfono:</strong>{" "}
                      <a href="tel:+573001234567" className="text-primary hover:underline">
                        +57 300 123 4567
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-8">
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Help;
