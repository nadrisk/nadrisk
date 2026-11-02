import type { Slot } from "@/hooks/useGroovebox";
import { defaultClean } from "./clean";

/** ACID moved from POLY to BAS; lineup v3 retires POLY and SIREN. Pattern grids, names and chokes are never touched. */
export const migrateEngine = (x0: Slot): Slot => {
  let x = (x0.poly as { mode?: string }).mode === "acid" ? { ...x0, engine: "808" as const, bass: { ...x0.bass, mode: "acid" as const, acid: (x0.poly as { acid?: Slot["bass"]["acid"] }).acid }, poly: { ...x0.poly, mode: "poly" as const } } : x0;
  // Lineup v3: POLY-REESE pads become BAS in REESE mode, POLY chords become an 8-voice SYN, SIREN pads become a mono SYN.
  if (x.engine === "poly") x = x.poly.mode === "reese" ? { ...x, engine: "808", bass: { ...x.bass, mode: "reese", reese: x.poly.reese } }
    : { ...x, engine: "synth", synth: { ...x.synth, clean: { ...defaultClean(), detune: Math.min(1, x.poly.detune / 30), sub: x.poly.sub, cutoff: x.poly.cutoff, res: Math.min(1, x.poly.res / 8), env: x.poly.env, voices: 8 } } };
