import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturedProperties from "@/components/home/FeaturedProperties";
import HowItWorks from "@/components/home/HowItWorks";
import CTASection from "@/components/home/CTASection";
import Testimonials from "@/components/home/Testimonials";
import { defaultHeroImage } from "@/data/city-hero-images";

const Index = () => {
  // Manejar scroll cuando se carga la página con hash
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash === "#como-funciona") {
        // Esperar a que el contenido se renderice
        setTimeout(() => {
          const element = document.getElementById("como-funciona");
          if (element) {
            const offset = 80; // Altura del navbar
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
              top: offsetPosition,
              behavior: "smooth",
            });
          }
        }, 100);
      }
    };

    // Ejecutar inmediatamente si hay hash
    handleHashScroll();

    // También escuchar cambios en el hash
    window.addEventListener("hashchange", handleHashScroll);
    return () => window.removeEventListener("hashchange", handleHashScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection backgroundImage={defaultHeroImage.imageUrl} />
        <FeaturedProperties />
        <HowItWorks />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
