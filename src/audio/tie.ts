type StepVal = 0 | 1 | 2 | 3;
/** Double-tap tie: joins everything from the nearest earlier note up to `end` into one held note.
 *  Returns null when there's no earlier note, or when `end` is already inside a tie. */
export function tieSpan(row: StepVal[], end: number): StepVal[] | null {
  if (row[end] >= 2) return null;
  let s = end - 1; while (s >= 0 && !row[s]) s--;
  if (s < 0) return null;
  while (s > 0 && row[s] >= 2) s--; // walk back to the head of an earlier tie
  return row.map((v, j) => (j === s ? (v >= 2 ? v : 1) : j > s && j <= end ? 2 : v)) as StepVal[];
}
