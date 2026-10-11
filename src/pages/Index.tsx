import Navbar from "@/components/Navbar";
import Groovebox from "@/components/Groovebox";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { readDisplayTheme, type DisplayTheme } from "@/lib/displayTheme";

const Index = () => {
  const [theme, setTheme] = useState<DisplayTheme>(readDisplayTheme);
  useEffect(() => { try { localStorage.setItem("nadrisk.lcd.v1", theme); } catch { /* private mode */ } }, [theme]);

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
