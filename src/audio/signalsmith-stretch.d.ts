declare module "signalsmith-stretch" {
  export type StretchChange = { output?: number; outputTime?: number; active?: boolean; input?: number; rate?: number; semitones?: number; loopStart?: number; loopEnd?: number };
  export interface StretchNode extends AudioWorkletNode {
    inputTime: number;
    schedule(change: StretchChange): Promise<unknown>;
    stop(when?: number): Promise<unknown>;
    configure(options: { preset?: "default" | "cheaper"; blockMs?: number; intervalMs?: number; splitComputation?: boolean }): Promise<unknown>;
    addBuffers(channels: Float32Array[]): Promise<number>;
    dropBuffers(): Promise<unknown>;
  }
  const create: ((context: BaseAudioContext, options?: AudioWorkletNodeOptions) => Promise<StretchNode>) & { moduleUrl?: string };
  export default create;
}