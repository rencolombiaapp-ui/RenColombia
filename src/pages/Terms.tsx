import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
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
                  <FileText className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    Términos y Condiciones
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Última actualización: {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-card rounded-xl border border-border p-6 md:p-8 space-y-6">
              {/* Introducción */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Introducción</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Bienvenido a RenColombia. Al acceder y utilizar nuestra plataforma, aceptas estos términos y condiciones.
                  Si no estás de acuerdo con alguna parte de estos términos, no debes usar nuestros servicios.
                </p>
              </section>

              {/* Uso de la plataforma */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Uso de la Plataforma</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  RenColombia es una plataforma que conecta propietarios e inquilinos para facilitar el arrendamiento de inmuebles.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Debes ser mayor de edad para usar nuestros servicios</li>
                  <li>Eres responsable de la veracidad de la información que publicas</li>
                  <li>No puedes usar la plataforma para actividades ilegales</li>
                  <li>Debes mantener la confidencialidad de tu cuenta</li>
                </ul>
              </section>

              {/* Publicación de inmuebles */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Publicación de Inmuebles</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Al publicar un inmueble en RenColombia, aceptas que:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Tienes derecho legal sobre el inmueble que publicas</li>
                  <li>La información proporcionada es precisa y actualizada</li>
                  <li>Las imágenes corresponden al inmueble publicado</li>
                  <li>Eres responsable de las negociaciones y acuerdos con los inquilinos</li>
                  <li>RenColombia no es parte de ningún contrato de arrendamiento</li>
                </ul>
              </section>

              {/* Responsabilidad del usuario */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Responsabilidad del Usuario</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Eres responsable de todas las actividades que ocurran bajo tu cuenta. RenColombia no se hace responsable
                  por el contenido publicado por los usuarios, las negociaciones entre propietarios e inquilinos, ni por
                  los acuerdos que se establezcan fuera de la plataforma.
                </p>
              </section>

              {/* Limitación de responsabilidad */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Limitación de Responsabilidad</h2>
                <p className="text-muted-foreground leading-relaxed">
                  RenColombia actúa como intermediario entre propietarios e inquilinos. No garantizamos la disponibilidad
                  de los inmuebles, la veracidad de la información publicada por terceros, ni el resultado de las negociaciones.
                  El uso de la plataforma es bajo tu propio riesgo.
                </p>
              </section>

              {/* Modificaciones del servicio */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Modificaciones del Servicio</h2>
                <p className="text-muted-foreground leading-relaxed">
                  RenColombia se reserva el derecho de modificar, suspender o discontinuar cualquier aspecto del servicio
                  en cualquier momento, con o sin previo aviso. Nos esforzamos por mantener la plataforma funcionando
                  correctamente, pero no garantizamos disponibilidad continua.
                </p>
              </section>

              {/* Propiedad intelectual */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Propiedad Intelectual</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Todo el contenido de RenColombia, incluyendo diseño, logos y textos, es propiedad de RenColombia.
                  El contenido que publiques (textos, imágenes) sigue siendo tuyo, pero nos otorgas licencia para
                  mostrarlo en la plataforma.
                </p>
              </section>

              {/* Contacto */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Contacto</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Si tienes preguntas sobre estos términos y condiciones, puedes contactarnos a través de
                  <a href="mailto:info@rencolombia.com" className="text-primary hover:underline ml-1">
                    info@rencolombia.com
                  </a>
                </p>
              </section>
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

export default Terms;
