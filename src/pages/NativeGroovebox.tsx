import Groovebox from "@/components/Groovebox";
import { useEffect, useState } from "react";
import { readDisplayTheme, type DisplayTheme } from "@/lib/displayTheme";

const NativeGroovebox = () => {
  const [theme, setTheme] = useState<DisplayTheme>(readDisplayTheme);
  useEffect(() => { try { localStorage.setItem("nadrisk.lcd.v1", theme); } catch { /* private mode */ } }, [theme]);
  return <main className="native-groovebox-shell" data-lcd={theme}>
    <Groovebox theme={theme} onThemeChange={setTheme} />
  </main>;
};

export default NativeGroovebox;