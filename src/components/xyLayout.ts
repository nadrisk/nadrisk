/** Fixed hit-zone grid for the XY screen's bottom strip. Same rows on every tab; 1px gaps so nothing shares a pixel. */
export type Box = { x: number; y: number; w: number; h: number };
export const PAD: Box = { x: 2, y: 11, w: 124, h: 34 };
const R1 = 46, R2 = 55, H = 8;
export const XY_ZONES = {
  hold: { x: 66, y: R1, w: 20, h: H }, snap: { x: 87, y: R1, w: 20, h: H }, set: { x: 108, y: R1, w: 19, h: H },
  center: { x: 66, y: R2, w: 61, h: H },
};
export const REC_ZONES = {
  arm: { x: 2, y: R1, w: 24, h: H }, play: { x: 27, y: R1, w: 24, h: H }, clr: { x: 52, y: R1, w: 24, h: H }, len: { x: 77, y: R1, w: 50, h: H },
};
export const REC_BAR: Box = { x: 2, y: R2, w: 125, h: H };
export const LFO_ZONES = {
  on: { x: 2, y: R1, w: 20, h: H }, shape: { x: 23, y: R1, w: 40, h: H }, rate: { x: 64, y: R1, w: 63, h: H },
  depth: { x: 2, y: R2, w: 62, h: H }, phase: { x: 65, y: R2, w: 62, h: H },
};
export const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
