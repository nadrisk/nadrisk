import { ChevronDown } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section id="home" className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Nadrisk"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <ChevronDown className="text-muted-foreground animate-scroll-hint" size={24} />
      </div>
    </section>
  );
};

export default HeroSection;
