import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

const DataTreatment = () => {
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
                  <Database className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    Tratamiento de Datos Personales
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    De conformidad con la Ley 1581 de 2012 y el Decreto 1377 de 2013
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-card rounded-xl border border-border p-6 md:p-8 space-y-6">
              {/* Introducción */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Responsable del Tratamiento</h2>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>RenColombia</strong> es responsable del tratamiento de tus datos personales.
                  Nuestro domicilio está en Bogotá, Colombia. Puedes contactarnos en{" "}
                  <a href="mailto:info@rencolombia.com" className="text-primary hover:underline">
                    info@rencolombia.com
                  </a>
                </p>
              </section>

              {/* Finalidad */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Finalidad del Tratamiento</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Tratamos tus datos personales para las siguientes finalidades:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Gestionar tu cuenta y perfil en la plataforma</li>
                  <li>Facilitar la publicación y búsqueda de inmuebles</li>
                  <li>Permitir la comunicación entre propietarios e inquilinos</li>
                  <li>Mejorar nuestros servicios y experiencia del usuario</li>
                  <li>Cumplir con obligaciones legales y regulatorias</li>
                  <li>Prevenir fraudes y garantizar la seguridad de la plataforma</li>
                </ul>
              </section>

              {/* Consentimiento */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Consentimiento</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Al registrarte y usar RenColombia, otorgas tu consentimiento libre, previo, expreso e informado
                  para el tratamiento de tus datos personales conforme a esta política. Puedes revocar tu consentimiento
                  en cualquier momento contactándonos, aunque esto puede afectar el uso de algunos servicios.
                </p>
              </section>

              {/* Derechos ARCO */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Derechos ARCO</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Como titular de datos personales, tienes los siguientes derechos:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Acceso:</strong> Conocer qué datos tenemos sobre ti y cómo los estamos usando</li>
                  <li><strong>Rectificación:</strong> Solicitar la corrección de datos inexactos o incompletos</li>
                  <li><strong>Cancelación:</strong> Solicitar la eliminación de tus datos cuando consideres que no deben ser procesados</li>
                  <li><strong>Oposición:</strong> Oponerte al tratamiento de tus datos en ciertos casos</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  Para ejercer estos derechos, puedes contactarnos a través de tu perfil en la plataforma o por email.
                </p>
              </section>

              {/* Datos sensibles */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Datos Sensibles</h2>
                <p className="text-muted-foreground leading-relaxed">
                  RenColombia no solicita ni procesa datos sensibles (raza, origen étnico, orientación política,
                  convicciones religiosas o filosóficas, afiliación sindical, datos biométricos, datos sobre salud
                  o vida sexual). Si necesitamos procesar este tipo de datos en el futuro, solicitaremos tu
                  consentimiento explícito.
                </p>
              </section>

              {/* Transferencias */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Transferencias y Transmisiones</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Tus datos pueden ser almacenados en servidores ubicados fuera de Colombia mediante servicios
                  de infraestructura en la nube. Estas transferencias se realizan bajo estándares de seguridad
                  internacionales y con el único propósito de proporcionar nuestros servicios.
                </p>
              </section>

              {/* Seguridad */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Medidas de Seguridad</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Implementamos medidas técnicas, administrativas y organizativas para proteger tus datos personales
                  contra pérdida, alteración, destrucción o acceso no autorizado. Sin embargo, ningún sistema es
                  completamente seguro, y no podemos garantizar seguridad absoluta.
                </p>
              </section>

              {/* Vigencia */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Vigencia</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Conservaremos tus datos personales mientras mantengas una cuenta activa en RenColombia y durante
                  el tiempo necesario para cumplir con obligaciones legales. Cuando solicites la eliminación de tu
                  cuenta, eliminaremos tus datos personales, excepto aquellos que debamos conservar por obligación legal.
                </p>
              </section>

              {/* Contacto */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. Contacto</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para ejercer tus derechos o hacer consultas sobre el tratamiento de tus datos personales, puedes
                  contactarnos en{" "}
                  <a href="mailto:info@rencolombia.com" className="text-primary hover:underline">
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

export default DataTreatment;
