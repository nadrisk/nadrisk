import type { AcidParams } from "@/audio/acid";
import type { Px } from "./draw";
import { glyph } from "./font";

export function drawAcidDisplay(p: Px, a: AcidParams, energy = 0) {
  const level = Math.max(0, Math.min(1, energy));
  const fill = Math.max(0, Math.min(1, Math.log(a.cutoff / 40) / Math.log(200) * .8 + level * .2));
  const scale = 4, top = 13, bottom = 32;
  [..."303"].forEach((ch, i) => {
    const g = glyph(ch), origin = 37 + i * 20;
    const isSet = (x: number, y: number) => x >= 0 && x < 12 && y >= 0 && y < 20 && g[Math.floor(y / scale) * 3 + Math.floor(x / scale)] === "1";
    for (let y = 0; y < 20; y++) for (let x = 0; x < 12; x++) {
      if (!isSet(x, y)) continue;
      const edge = !isSet(x - 1, y) || !isSet(x + 1, y) || !isSet(x, y - 1) || !isSet(x, y + 1);
      const interference = a.res > .4 && y % 3 === 1 && (x + i * 2) % 5 < Math.round(a.res * 2);
      if (edge || (y >= 20 - Math.round(fill * 20) && !interference)) p.dot(origin + x, top + y);
    }
  });
  let py = bottom + 8;
  for (let x = 8; x < 120; x++) {
    const y = 42 - Math.round(a.envMod / 5 * 6 * Math.exp(-(x - 8) / (8 + a.decay * 24)));
    if (x > 8) p.line(x - 1, py, x, y);
    py = y;
  }
}