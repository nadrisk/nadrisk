/** Silent summing point the tape records from: every engine in the tab (editor + crate decks) feeds it, nothing plays it. */
let bus: GainNode | null = null;
export function tapeBus(ctx: BaseAudioContext): GainNode {
  if (!bus || bus.context !== ctx) bus = ctx.createGain();
  return bus;
}
