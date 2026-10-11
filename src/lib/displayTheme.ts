export const DISPLAY_THEMES = [
  ["oled", "-1"],
  ["blue", "BLUE"],
  ["pink", "PINK"],
  ["green", "GREEN"],
  ["amber", "AMBER"],
] as const;

export type DisplayTheme = typeof DISPLAY_THEMES[number][0];

const legacyTheme: Record<string, DisplayTheme> = {
  oled: "oled", zoom: "blue", ice: "blue", teal: "blue", nadrisk: "pink",
  studio: "oled", matrix: "green", acid: "green", amber: "amber",
};

export const readDisplayTheme = (): DisplayTheme => {
  try { return legacyTheme[localStorage.getItem("nadrisk.lcd.v1") ?? ""] ?? "oled"; }
  catch { return "oled"; }
};

export const nextDisplayTheme = (theme: DisplayTheme): DisplayTheme => {
  const themes = DISPLAY_THEMES.map(([value]) => value);
  return themes[(themes.indexOf(theme) + 1) % themes.length];
};