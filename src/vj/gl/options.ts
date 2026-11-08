// AV world options: pure lists + stepping, shared by the bus, controls and the WebGL renderer.
export const WORLDS = ["SPACE", "PLASMA", "CAM", "NONE"] as const;
export const GROUNDS = ["FLOOR", "SKY", "ENDLESS", "CLOUDS"] as const;
export const OBJECTS = ["NONE", "SPHERE", "CUBE", "PRISM", "TORUS", "MATTER", "PIPE"] as const;
export const MOTIONS = ["FLOAT", "JUMP", "SPIN"] as const;
export const FORMS = ["CLASSIC", "RGB", "BIDOU", "DEMO", "INTERF", "TUNNEL"] as const;
export const EFFECTS = ["NONE", "PIXEL", "DITHER"] as const;
export const PALETTES = ["ORIG", "CLASSIC", "RGB", "BIDOU", "INTERF", "TUNNEL", "1-BIT"] as const;

export type SceneOpts = { ground: number; object: number; motion: number; form: number; effect: number; palette: number };
export type OptKey = keyof SceneOpts;
export const DEFAULT_OPTS: SceneOpts = { ground: 0, object: 1, motion: 1, form: 0, effect: 0, palette: 0 };

/** Objects each ground can hold: CLOUDS is pure flight, PIPE is the ENDLESS structure. */
export function objectsFor(ground: number): number[] {
  if (GROUNDS[ground] === "CLOUDS") return [0];
  if (GROUNDS[ground] === "ENDLESS") return [0, 6, 1, 2, 3, 4, 5];
  return [0, 1, 2, 3, 4, 5];
}
export function validObject(ground: number, object: number) { const a = objectsFor(ground); return a.includes(object) ? object : a[0]; }

const wrap = (v: number, n: number) => ((v % n) + n) % n;
export function stepOpt(o: SceneOpts, key: OptKey, d: number): SceneOpts {
  const n = { ...o };
  if (key === "object") { const a = objectsFor(o.ground), i = Math.max(0, a.indexOf(o.object)); n.object = a[wrap(i + d, a.length)]; return n; }
  const len = { ground: GROUNDS.length, motion: MOTIONS.length, form: FORMS.length, effect: EFFECTS.length, palette: PALETTES.length }[key];
  n[key] = wrap(o[key] + d, len);
  if (key === "ground") n.object = validObject(n.ground, n.object);
  return n;
}
export function cleanOpts(o: Partial<SceneOpts> | undefined): SceneOpts {
  const r = { ...DEFAULT_OPTS, ...(o ?? {}) };
  const c = (v: number, n: number) => Number.isInteger(v) && v >= 0 && v < n ? v : 0;
  r.ground = c(r.ground, GROUNDS.length); r.motion = c(r.motion, MOTIONS.length); r.form = c(r.form, FORMS.length); r.effect = c(r.effect, EFFECTS.length); r.palette = c(r.palette, PALETTES.length);
  r.object = validObject(r.ground, r.object);
  return r;
}
