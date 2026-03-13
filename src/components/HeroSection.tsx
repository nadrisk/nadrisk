import { ChevronDown } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section id="home" className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Nadrisk in studio"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        <h1
          className="text-6xl md:text-8xl lg:text-9xl font-light tracking-wide text-foreground text-glow"
          style={{ animationDelay: "0.2s", animation: "fade-up 1s ease-out forwards" }}
        >
          Nadrisk
        </h1>
        <a
          href="#about"
          className="mt-8 px-8 py-3 text-sm font-medium tracking-widest uppercase border border-foreground/40 text-foreground hover:bg-foreground/10 transition-all duration-300 rounded-sm opacity-0 animate-fade-up"
          style={{ animationDelay: "0.6s" }}
        >
          Read More
        </a>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <ChevronDown className="text-muted-foreground animate-scroll-hint" size={24} />
      </div>
    </section>
  );
};

export default HeroSection;
