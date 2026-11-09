// AV world options: pure lists + stepping, shared by the bus, controls and the WebGL renderer.
export const WORLDS = ["SPACE", "PLASMA", "NONE"] as const;
export const GROUNDS = ["DUNES", "SKY", "HORIZON", "CLOUDS", "OCEAN"] as const;
export const OBJECTS = ["NONE", "SPHERE", "CUBE", "PYRAMID", "TORUS", "MATTER"] as const;
export const MOTIONS = ["FLOAT", "JUMP", "SPIN"] as const;
/** Camera travel through a world; every world can borrow any of them. */
export const CAMS = ["STILL", "DRIFT", "ORBIT", "DIVE"] as const;
/** Each world's own travel, chosen when you switch world. */
export const NATIVE_CAM = [2, 0, 1, 3, 1];
export const FORMS = ["LIQUID", "WAVE", "WARP", "PULSE", "RINGS", "TUNNEL"] as const;
/** Object surface: the world's own shading, or one of the plasma forms. */
export const SKINS = ["SHADE", ...FORMS] as const;
export const EFFECTS = ["NONE", "PIXEL", "DITHER"] as const;
export const PALETTES = ["ORIG", "CLASSIC", "RGB", "BIDOU", "INTERF", "TUNNEL", "1-BIT"] as const;
export const SURFACE_PALETTES = [...PALETTES, "CHECKER"] as const;

export type SceneOpts = { ground: number; object: number; motion: number; cam: number; skin: number; floor: number; form: number; effect: number; palette: number; objectPalette: number; floorPalette: number };
export type OptKey = keyof SceneOpts;
export const DEFAULT_OPTS: SceneOpts = { ground: 0, object: 1, motion: 1, cam: 2, skin: 0, floor: 0, form: 0, effect: 0, palette: 0, objectPalette: 0, floorPalette: 0 };

/** Every world can hold every shape. */
export function objectsFor(_ground: number): number[] { return OBJECTS.map((_, i) => i); }
export function validObject(ground: number, object: number) { const a = objectsFor(ground); return a.includes(object) ? object : a[0]; }

const wrap = (v: number, n: number) => ((v % n) + n) % n;
const LEN: Record<Exclude<OptKey, "object">, number> = { ground: GROUNDS.length, motion: MOTIONS.length, cam: CAMS.length, skin: SKINS.length, floor: SKINS.length, form: FORMS.length, effect: EFFECTS.length, palette: PALETTES.length, objectPalette: SURFACE_PALETTES.length, floorPalette: SURFACE_PALETTES.length };
export function stepOpt(o: SceneOpts, key: OptKey, d: number): SceneOpts {
  const n = { ...o };
  if (key === "object") { const a = objectsFor(o.ground), i = Math.max(0, a.indexOf(o.object)); n.object = a[wrap(i + d, a.length)]; return n; }
  n[key] = wrap(o[key] + d, LEN[key]);
  if (key === "ground") { n.object = validObject(n.ground, n.object); n.cam = NATIVE_CAM[n.ground]; }
  return n;
}
export function cleanOpts(o: Partial<SceneOpts> | undefined): SceneOpts {
  const r = { ...DEFAULT_OPTS, ...(o ?? {}) };
  // Older AV windows shared one palette across both SPACE surfaces.
  if (o?.objectPalette === undefined) r.objectPalette = o?.palette ?? 0;
  if (o?.floorPalette === undefined) r.floorPalette = o?.palette ?? 0;
  const c = (v: number, n: number) => Number.isInteger(v) && v >= 0 && v < n ? v : 0;
  for (const k of Object.keys(LEN) as (keyof typeof LEN)[]) r[k] = c(r[k], LEN[k]);
  if (!(o && "cam" in o)) r.cam = NATIVE_CAM[r.ground];
  r.object = validObject(r.ground, r.object);
  return r;
}
