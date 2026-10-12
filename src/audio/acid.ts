import * as Tone from "tone";
import type { Voice } from "./voices";

export type AcidParams = { wave: "sawtooth" | "square"; cutoff: number; res: number; envMod: number; decay: number; accent: number; drive: number };
export const defaultAcid = (): AcidParams => ({ wave: "sawtooth", cutoff: 320, res: .72, envMod: 3.4, decay: .32, accent: .65, drive: .24 });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
export function acidParams(p?: Partial<AcidParams>): AcidParams {
  const r = { ...defaultAcid(), ...p };
  return { wave: r.wave === "square" ? "square" : "sawtooth", cutoff: clamp(r.cutoff, 40, 8000), res: clamp(r.res, 0, 1), envMod: clamp(r.envMod, 0, 5), decay: clamp(r.decay, .06, 1.5), accent: clamp(r.accent, 0, 1), drive: clamp(r.drive, 0, 1) };
}

// Original implementation of a topology-preserving four-pole ladder with
// analytically solved feedback (Stilson/Smith ladder principle). Not a circuit clone.
// Two integration steps/sample bound high-cutoff feedback; saturation lives inside the loop.
export const ACID_WORKLET = `
class NadAcidFilter extends AudioWorkletProcessor {
 static get parameterDescriptors(){return [{name:'cutoff',defaultValue:320,minValue:40,maxValue:18000},{name:'res',defaultValue:.72,minValue:0,maxValue:1,automationRate:'k-rate'},{name:'drive',defaultValue:.24,minValue:0,maxValue:1,automationRate:'k-rate'}];}
 constructor(){super();this.z=new Float64Array(4);this.prev=0;}
 process(ins,outs,p){const input=ins[0]?.[0],out=outs[0]?.[0];if(!out)return true;
 const k=p.res[0]*3.85,drive=1+p.drive[0]*4;
 for(let n=0;n<out.length;n++){
 const x=input?.[n]||0,fc=Math.min(sampleRate*.19,Math.max(40,p.cutoff.length===1?p.cutoff[0]:p.cutoff[n]));
 const g=Math.tan(Math.PI*fc/(sampleRate*2)),G=g/(1+g),G2=G*G,G3=G2*G,G4=G2*G2;let sum=0;
 for(let sub=0;sub<2;sub++){
 const inp=sub===0?(this.prev+x)*.5:x;
 const S=(G3*this.z[0]+G2*this.z[1]+G*this.z[2]+this.z[3])/(1+g);
 let v=Math.tanh((inp*.65-k*S)*drive/(1+k*G4))/drive;
 for(let stage=0;stage<4;stage++){const d=(v-this.z[stage])*G;v=d+this.z[stage];this.z[stage]=v+d;}
 sum+=v;
 }
 this.prev=x;const y=Math.tanh(sum*.5*(1+k*.3)*1.6);out[n]=Number.isFinite(y)?y:0;
 if(!Number.isFinite(y))this.z.fill(0);
 }return true;
 }
}
registerProcessor('nad-acid-filter',NadAcidFilter);
`;

export function playAcid(ctx: BaseAudioContext, dest: AudioNode, params: AcidParams, midi: number, t: number, gate: number, vel = 1): Voice {
  let p = params;
  const osc = ctx.createOscillator(), shape = ctx.createBiquadFilter(), amp = ctx.createGain(), releaseGain = ctx.createGain();
  const filter = Tone.getContext().createAudioWorkletNode("nad-acid-filter", { outputChannelCount: [1], channelCount: 1 }) as unknown as AudioWorkletNode;
  const cut = filter.parameters.get("cutoff"), res = filter.parameters.get("res"), drive = filter.parameters.get("drive");
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  osc.type = p.wave; osc.frequency.setValueAtTime(frequency, t);
  // AC coupling softens the square plateau into the hollow 303-like pulse.
  shape.type = "highpass"; shape.frequency.value = p.wave === "square" ? frequency * .42 : 20; shape.Q.value = .707;
  osc.connect(shape).connect(filter).connect(amp).connect(releaseGain).connect(dest);
  const accented = vel > .8;
  const envelope = (at: number, elapsed: number) => {
    const dec = accented ? p.decay + (.18 - p.decay) * p.accent : p.decay;
    const amount = p.envMod + (accented ? p.accent * 1.5 : 0);
    const oct = amount * Math.exp(-elapsed / (dec / 3));
    cut?.cancelScheduledValues(at);
    cut?.setValueAtTime(Math.min(18000, p.cutoff * 2 ** oct), at);
    cut?.exponentialRampToValueAtTime(p.cutoff, at + Math.max(.01, dec - elapsed));
    res?.setTargetAtTime(p.res, at, .007); drive?.setTargetAtTime(p.drive, at, .007);
  };
  envelope(t, 0);
  const peak = vel * .48 * (1 + (accented ? p.accent * .45 : 0));
  amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(peak, t + .002);
  amp.gain.setTargetAtTime(peak * .65, t + .002, .18);
  const gateEnd = t + Math.max(.005, gate);
  releaseGain.gain.setValueAtTime(1, t); releaseGain.gain.setTargetAtTime(0, gateEnd, .018);
  let end = gateEnd + .14, cleaned = false;
  const cleanup = () => { if (cleaned) return; cleaned = true; [osc, shape, filter, amp, releaseGain].forEach(n => n.disconnect()); };
  osc.start(t); osc.stop(end); osc.onended = cleanup;
  const fade = (at: number, duration: number) => {
    const nextEnd = at + duration + .03; if (nextEnd >= end) return;
    end = nextEnd; releaseGain.gain.cancelScheduledValues(at); releaseGain.gain.setTargetAtTime(0, at, Math.max(.001, duration / 4));
    try { osc.stop(end); } catch { /* already ended */ }
  };
  return {
    stop: at => fade(at, .012), release: (at, r) => fade(at, Math.min(.1, r)),
    glide: (delta, at, duration) => { osc.frequency.cancelScheduledValues(at); osc.frequency.setTargetAtTime(frequency * 2 ** (delta / 12), at, Math.max(.003, duration / 3)); },
    update: patch => {
      const next = (patch as { acid?: Partial<AcidParams> }).acid; if (!next) return;
      p = acidParams({ ...p, ...next }); const now = ctx.currentTime;
      osc.type = p.wave; shape.frequency.setTargetAtTime(p.wave === "square" ? frequency * .42 : 20, now, .007);
      envelope(now, Math.max(0, now - t));
    },
  };
}