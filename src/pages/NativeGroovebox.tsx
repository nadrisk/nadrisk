import Groovebox from "@/components/Groovebox";
import { useState } from "react";
import { DEFAULT_DISPLAY_THEME, type DisplayTheme } from "@/lib/displayTheme";

const NativeGroovebox = () => {
  const [theme, setTheme] = useState<DisplayTheme>(DEFAULT_DISPLAY_THEME);
  return <main className="native-groovebox-shell" data-lcd={theme}>
    <Groovebox theme={theme} onThemeChange={setTheme} />
  </main>;
};

export default NativeGroovebox;
