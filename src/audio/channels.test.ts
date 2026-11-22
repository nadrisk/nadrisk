import { describe, expect, it } from "vitest";
import { CHANNELS, pickChannels, droppedCount } from "./channels";
describe("six fixed channels", () => {
  it("are KIK SNR HAT CLP PRC SURF in order", () => expect(CHANNELS.map(c => c.id)).toEqual(["KIK", "SNR", "HAT", "CLP", "PRC", "SURF"]));
  it("maps the first slot of each voice type", () => {
    const old = [{ engine: "synth" }, { engine: "drum", drum: { kind: "snare" } }, { engine: "drum", drum: { kind: "kick" } }, { engine: "drum", drum: { kind: "kick" } }, { engine: "idm" }];
    const p = pickChannels(old);
    expect(p).toEqual([2, 1, null, null, 4, 0]);
    expect(droppedCount(old, p)).toBe(1);
  });
});
