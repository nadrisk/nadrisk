export const DISPLAY_THEMES = [
  ["oled", "-1"],
  ["blue", "BLUE"],
  ["pink", "PINK"],
  ["green", "GREEN"],
  ["amber", "AMBER"],
] as const;

export type DisplayTheme = typeof DISPLAY_THEMES[number][0];

// The site always boots on the 1-bit OLED display; DISP only changes it for the current visit.
export const DEFAULT_DISPLAY_THEME: DisplayTheme = "oled";

export const nextDisplayTheme = (theme: DisplayTheme): DisplayTheme => {
  const themes = DISPLAY_THEMES.map(([value]) => value);
  return themes[(themes.indexOf(theme) + 1) % themes.length];
};
