import { describe, expect, it } from "vitest";
import { phraseSemi } from "./harmony";

describe("phrase root follows sequencer pitch", () => {
  const h = { key: 0, scale: "major" as const };
  it("walks the key from the step's pitch rather than transposing", () => {
    // C major phrase step two degrees up: from C it's E (+4), from D (pitch +2) it's F (+3), not F# (+4).
    expect(phraseSemi(h, 60, "major", 2)).toBe(4);
    expect(phraseSemi(h, 62, "major", 2)).toBe(3);
  });
});
