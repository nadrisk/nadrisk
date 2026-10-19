export const WELCOME_KEY = "nad-welcome-seen";
export const WELCOME_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Welcome shows at most once per 24 h per device. */
export function shouldShowWelcome(now: number, last: number | null): boolean {
  return last == null || !Number.isFinite(last) || now - last >= WELCOME_INTERVAL_MS;
}

export function readWelcomeSeen(): number | null {
  try { const v = localStorage.getItem(WELCOME_KEY); return v == null ? null : Number(v); } catch { return null; }
}
export function markWelcomeSeen(now = Date.now()) { try { localStorage.setItem(WELCOME_KEY, String(now)); } catch { /* private mode */ } }

export const LINKS = {
  kofi: "https://ko-fi.com/nadrisk",
  instagram: "https://www.instagram.com/nadriskmusic",
  soundcloud: "https://soundcloud.com/nadrisk",
  apple: "https://music.apple.com/ba/artist/nadrisk/1445743303",
  youtube: "https://www.youtube.com/@Nadrisk",
};
