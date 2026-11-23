export const BUS_NAMES = ["VAPOR", "SUSPEND", "FRACTURE", "MELT"] as const;
export type MacroMap = { x: string; y: string };
export type SurfaceState = { amounts: number[]; sends: boolean[][]; macros: MacroMap[] };
export const defaultSurface = (): SurfaceState => ({ amounts: [0, 0, 0, 0], sends: Array.from({ length: 6 }, () => [false, false, false, false]), macros: Array.from({ length: 4 }, () => ({ x: "", y: "" })) });
export const unit = (v: number) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
export function hydrateSurface(s?: Partial<SurfaceState>): SurfaceState {
  const d = defaultSurface();
  return { amounts: d.amounts.map((_, i) => unit(s?.amounts?.[i] ?? 0)), sends: d.sends.map((r, i) => r.map((_, k) => s?.sends?.[i]?.[k] === true)), macros: d.macros.map((m, i) => ({ x: s?.macros?.[i]?.x ?? m.x, y: s?.macros?.[i]?.y ?? m.y })) };
}
export const meltFeedback = (amount: number) => .45 + .5 * Math.tanh(unit(amount) * 2);