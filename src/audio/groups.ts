import { fxLoad, type FxUnit } from "./effects";
/** Four shared group buses. A pad with group 1-4 sums into that bus; its own insert FX are bypassed (kept, not deleted). */
export const GROUPS = 4;
export type GroupBus = { fx: FxUnit[]; level: number; pan: number };
export const defaultGroups = (): GroupBus[] => Array.from({ length: GROUPS }, () => ({ fx: [], level: 100, pan: 0 }));
export const groupOf = (s: { group?: number }) => (s.group && s.group >= 1 && s.group <= GROUPS ? s.group : 0);
/** Live insert FX for a pad: none while it sits in a group. */
export const padFx = (s: { group?: number; fx: FxUnit[] }) => (groupOf(s) ? [] : s.fx);
/** Whole-groovebox FX load: ungrouped pad racks plus every group rack. */
export const totalFxLoad = (slots: { group?: number; fx: FxUnit[] }[], groups: GroupBus[]) => fxLoad([...slots.map(padFx), ...groups.map(g => g.fx)]);
export const hydrateGroups = (g?: Partial<GroupBus>[]): GroupBus[] => defaultGroups().map((d, i) => ({ ...d, ...g?.[i], fx: g?.[i]?.fx ?? [] }));
