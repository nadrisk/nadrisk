import Navbar from "@/components/Navbar";
import Groovebox from "@/components/Groovebox";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";
import { useState } from "react";
import { DEFAULT_DISPLAY_THEME, type DisplayTheme } from "@/lib/displayTheme";

const Index = () => {
  const [theme, setTheme] = useState<DisplayTheme>(DEFAULT_DISPLAY_THEME);

  return (
    <div className="site-shell min-h-screen bg-background" data-lcd={theme}>
      <Navbar />
      <main>
        <Groovebox theme={theme} onThemeChange={setTheme} />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
