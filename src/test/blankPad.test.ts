import { describe, expect, it } from "vitest";
import { isBlankSlot, padBadge, slotTitle } from "@/audio/slotState";
import type { Slot } from "@/hooks/useGroovebox";

/** Only the fields these labels read are filled in; the rest is irrelevant to them. */
const slot = (o: Partial<Slot>) => ({ engine: "sampler", sampler: { sampleName: "EMPTY" }, ...o }) as Slot;

describe("blank pad labels", () => {
  it("an empty pad reads as unassigned everywhere it is shown", () => {
    const s = slot({});
    expect(isBlankSlot(s)).toBe(true);
    expect(padBadge(s)).toBe("blnk");
    expect(slotTitle(s)).toBe("BLNK");
  });

  it("assigning one of the three machines clears the blank state", () => {
    for (const [engine, badge, title] of [["drum", "kick", "DRUM"], ["idm", "prc", "PRC"], ["synth", "syn", "SYNTH"]] as const) {
      const s = slot({ engine, drum: { kind: "kick" } as Slot["drum"] });
      expect(isBlankSlot(s)).toBe(false);
      expect(padBadge(s)).toBe(badge);
      expect(slotTitle(s)).toBe(title);
    }
  });

  it("a pad with a sample loaded is not blank", () => {
    const s = slot({ sampler: { sampleName: "GTR TAKE", sampleId: "abc" } as Slot["sampler"] });
    expect(isBlankSlot(s)).toBe(false);
    expect(padBadge(s)).toBe("smp");
    expect(slotTitle(s)).toBe("SAMPLER");
  });
});
