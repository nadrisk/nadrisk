import { describe, expect, it } from "vitest";
import { copyBankMods, defaultMod } from "./musical";

describe("pattern MOD copying", () => {
  it.each([0, 1, 2, 3])("copies every lane from bank %i to the next bank, including D to A", source => {
    const mods = Array.from({ length: 12 }, (_, i) => ({ ...defaultMod(), on: i % 2 === 0, target: ["pitch", "cutoff", "fx:0:mix"][Math.floor(i / 4)], steps: 32, range: 24, values: Array(32).fill(i / 12) }));
    const destination = (source + 1) % 4;
    const copied = copyBankMods(mods, source, destination);
    for (let lane = 0; lane < 3; lane++) {
      const a = source + lane * 4, b = destination + lane * 4;
      expect(copied[b]).toEqual(mods[a]);
      expect(copied[b]).not.toBe(mods[a]);
      expect(copied[b].values).not.toBe(mods[a].values);
      copied[b].values[0] = .99;
      expect(mods[a].values[0]).toBe(a / 12);
    }
    mods.forEach((lane, i) => { if (i % 4 !== destination) expect(copied[i]).toBe(lane); });
  });
});