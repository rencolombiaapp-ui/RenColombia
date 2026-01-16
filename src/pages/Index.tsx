import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturedProperties from "@/components/home/FeaturedProperties";
import HowItWorks from "@/components/home/HowItWorks";
import PriceInsightsSection from "@/components/home/PriceInsightsSection";
import CTASection from "@/components/home/CTASection";
import Testimonials from "@/components/home/Testimonials";
import { defaultHeroImage } from "@/data/city-hero-images";

const Index = () => {
  console.log("Index component rendering...");
  
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

  try {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection backgroundImage={defaultHeroImage.imageUrl} />
          <FeaturedProperties />
          <HowItWorks />
          <PriceInsightsSection />
          <Testimonials />
          <CTASection />
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error("Error in Index component:", error);
    return (
      <div style={{ padding: "50px", color: "red" }}>
        <h1>Error en Index</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
};

export default Index;
