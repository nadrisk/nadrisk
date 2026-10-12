import { describe, expect, it } from "vitest";
import { compactHeaderText, drawHeader, tabLayout } from "./pixelScreens";
import { textWidth } from "@/pixel/font";
import type { Px } from "@/pixel/draw";

const pages = ["SRC", "SHP", "PIT", "FLT", "ENV", "PRST"];
describe("compact drum header", () => {
  it("fits complete labelled values before six tabs", () => {
    const width = tabLayout(pages)[0].x - 4;
    for (const text of ["TUNE 1.2K", "CNTR 500MS", "AMT -48ST", "NDEC 1000MS", "FDEC 1000MS", "SPRD 2.00", "NTON 12.0K", "REL 3000MS", "ATK 2000MS", "SUS 100%", "BASE 8.0K"]) {
      const fitted = compactHeaderText(text, width);
      expect(textWidth(fitted)).toBeLessThanOrEqual(width);
      expect(fitted).not.toBe("");
    }
  });
  it("replaces the name only while feedback is present", () => {
    const texts: string[] = [];
    const p = { invert() {}, rect() {}, text(s: string) { texts.push(s); } } as unknown as Px;
    drawHeader(p, "KICK", "CNTR 500MS", pages, "SRC", true);
    expect(texts[0]).toBe("CNTR500MS");
    expect(texts).not.toContain("KICK");
    texts.length = 0;
    drawHeader(p, "KICK", "", pages, "SRC", true);
    expect(texts[0]).toBe("KICK");
    expect(texts.slice(1)).toEqual(pages);
  });
});