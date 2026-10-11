import Groovebox from "@/components/Groovebox";
import { useState } from "react";
import { DEFAULT_DISPLAY_THEME, type DisplayTheme } from "@/lib/displayTheme";

const Index = () => {
  const [theme, setTheme] = useState<DisplayTheme>(DEFAULT_DISPLAY_THEME);

  return (
    <div className="site-shell min-h-screen bg-background" data-lcd={theme}>
      <main>
        <Groovebox theme={theme} onThemeChange={setTheme} />
      </main>
    </div>
  );
};

export default Index;
