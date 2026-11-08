import { afterEach, describe, expect, it, vi } from "vitest";
import { openRoom } from "./transport";
afterEach(() => vi.unstubAllGlobals());
describe("local room", () => {
  it("delivers mixer messages only to other tabs in the same room without networking", () => {
    const channels: FakeChannel[] = [];
    class FakeChannel {
      onmessage: ((e: { data: unknown }) => void) | null = null;
      constructor(public name: string) { channels.push(this); }
      postMessage(data: unknown) { channels.filter(c => c !== this && c.name === this.name).forEach(c => c.onmessage?.({ data })); }
      close() { channels.splice(channels.indexOf(this), 1); }
    }
    vi.stubGlobal("BroadcastChannel", FakeChannel);
    const receiveA = vi.fn(), receiveB = vi.fn(), other = vi.fn(), online = vi.fn();
    const a = openRoom("ABCD", "tabs", receiveA, online);
    const b = openRoom("ABCD", "tabs", receiveB, online);
    const c = openRoom("EFGH", "tabs", other, online);
    a.send("mix", { xf: -1 });
    expect(receiveB).toHaveBeenCalledWith({ event: "mix", payload: { xf: -1 } });
    expect(receiveA).not.toHaveBeenCalled(); expect(other).not.toHaveBeenCalled(); expect(online).toHaveBeenCalledWith(true);
    b.close(); a.send("mix", { xf: 1 }); expect(receiveB).toHaveBeenCalledTimes(1);
    a.close(); c.close(); expect(channels).toHaveLength(0);
  });
});