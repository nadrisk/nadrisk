/** Relative fine adjustment: touching a control never changes its value. */
export function draggedValue(start: number, dy: number, divisions = 100) {
  const distance = Math.max(0, Math.abs(dy) - 4) * Math.sign(dy);
  return Math.round(Math.max(0, Math.min(1, start + distance / 450)) * divisions) / divisions;
}
export const inLengthGrip = (width: number, fromRight: number, mouse: boolean) => fromRight <= (mouse ? Math.min(12, width * .5) : width * .5);