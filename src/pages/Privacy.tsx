import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
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
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    Política de Privacidad
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
                  En RenColombia respetamos tu privacidad y nos comprometemos a proteger tus datos personales.
                  Esta política explica qué información recopilamos, cómo la usamos y cómo la protegemos.
                </p>
              </section>

              {/* Datos que recolectamos */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Información que Recolectamos</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Recolectamos la siguiente información cuando usas RenColombia:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Información de cuenta:</strong> nombre, email, teléfono (opcional)</li>
                  <li><strong>Información de perfil:</strong> foto de perfil, tipo de publicador, información de inmobiliaria (si aplica)</li>
                  <li><strong>Información de inmuebles:</strong> datos de las propiedades que publicas</li>
                  <li><strong>Información de uso:</strong> cómo interactúas con la plataforma</li>
                  <li><strong>Información técnica:</strong> dirección IP, tipo de navegador, dispositivo</li>
                </ul>
              </section>

              {/* Cómo usamos los datos */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Cómo Usamos tu Información</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Utilizamos tu información para:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Proporcionar y mejorar nuestros servicios</li>
                  <li>Facilitar la comunicación entre propietarios e inquilinos</li>
                  <li>Personalizar tu experiencia en la plataforma</li>
                  <li>Enviar notificaciones importantes sobre tu cuenta</li>
                  <li>Cumplir con obligaciones legales</li>
                  <li>Prevenir fraudes y abusos</li>
                </ul>
              </section>

              {/* Almacenamiento */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Almacenamiento y Seguridad</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Tus datos se almacenan de forma segura utilizando servicios de infraestructura en la nube con altos
                  estándares de seguridad. Implementamos medidas técnicas y organizativas para proteger tu información
                  contra acceso no autorizado, pérdida o destrucción.
                </p>
              </section>

              {/* Compartir información */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Compartir Información</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  No vendemos tu información personal. Podemos compartir información en los siguientes casos:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Con otros usuarios cuando es necesario para el funcionamiento del servicio (ej: mostrar tu nombre al publicar un inmueble)</li>
                  <li>Con proveedores de servicios que nos ayudan a operar la plataforma</li>
                  <li>Cuando es requerido por ley o para proteger nuestros derechos</li>
                </ul>
              </section>

              {/* Derechos del usuario */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Tus Derechos</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Tienes derecho a:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Acceder a tus datos personales</li>
                  <li>Rectificar información incorrecta</li>
                  <li>Solicitar la eliminación de tus datos</li>
                  <li>Oponerte al procesamiento de tus datos</li>
                  <li>Exportar tus datos</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  Puedes ejercer estos derechos contactándonos a través de tu perfil o por email.
                </p>
              </section>

              {/* Cookies */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Cookies y Tecnologías Similares</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos cookies y tecnologías similares para mejorar tu experiencia, analizar el uso de la plataforma
                  y personalizar el contenido. Puedes configurar tu navegador para rechazar cookies, aunque esto puede
                  afectar algunas funcionalidades.
                </p>
              </section>

              {/* Cambios */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Cambios a esta Política</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos sobre cambios
                  significativos publicando la nueva política en esta página y actualizando la fecha de "última actualización".
                </p>
              </section>

              {/* Contacto */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. Contacto</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Si tienes preguntas sobre esta política de privacidad o sobre cómo manejamos tus datos, puedes
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

export default Privacy;
