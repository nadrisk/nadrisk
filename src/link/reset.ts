export type Tap = { time: number; x: number; y: number };
export function isResetTap(previous: Tap | null, current: Tap): boolean {
  return !!previous && current.time > previous.time && current.time - previous.time <= 320 && Math.hypot(current.x - previous.x, current.y - previous.y) < 24;
}