import { describe, expect, it } from "vitest";
import { shouldShowWelcome } from "./welcome";

const H = 3600_000;
describe("welcome once a day", () => {
  it("shows on first visit", () => expect(shouldShowWelcome(1000, null)).toBe(true));
  it("hidden within 24 hours", () => expect(shouldShowWelcome(23 * H, 0)).toBe(false));
  it("shows again after 24 hours", () => expect(shouldShowWelcome(24 * H, 0)).toBe(true));
});
