import { quietReaction, type Reaction, type Segment, type V3 } from "./models";

export type OpticalField = { back: Segment[]; front: Segment[] };

// Sparse model-specific measurement fields. All coordinates share the centerpiece's 3D space.
export function opticalField(model: string, phase: number, audio: Reaction = quietReaction, wave: readonly number[] = []): OpticalField {
  const back: Segment[] = [], front: Segment[] = [];
  const add = (target: Segment[], a: V3, b: V3) => target.push([a, b]);
  const ring = (target: Segment[], r: number, z: number, tilt = 0, start = 0, end = Math.PI * 2) => {
    let previous: V3 | undefined;
    for (let i = 0; i <= 96; i++) {
      const a = start + (end - start) * i / 96;
      const p: V3 = [r * Math.cos(a), r * Math.sin(a) * Math.cos(tilt), z + r * Math.sin(a) * Math.sin(tilt)];
      if (previous) add(target, previous, p);
      previous = p;
    }
  };
  // POLY and WIRE stay unframed: their solids already carry the image.
  if (model === "TESSERACT") {
    for (let i = 0; i < 8; i++) {
      const x = i & 1 ? 1 : -1, y = i & 2 ? 1 : -1, z = i & 4 ? .45 : -.45;
      const r = 1.1 + audio.kick * .15;
      // Broken probes leave the center and hypercube connections readable.
      for (let j = 0; j < (audio.snare > .15 ? 3 : 1); j++) {
        const a = r + j * .14, b = a + (audio.snare > .15 ? .08 : .35);
        add(back, [x * a, y * a * .7, z], [x * b, y * b * .7, z]);
      }
      add(front, [x * r, y * r * .7, z], [x * r, y * (r * .7 - .09), z]);
    }
  } else if (model === "EYE") {
    // Gyroscope rings orbit the eye: kicks swell them, hats step the ticks, live waveform ripples the outer edge.
    const spin = phase * .35 + audio.snare * .6, r = 1.2 + audio.kick * .22;
    let previous: V3 | undefined;
    for (let i = 0; i <= 96; i++) {
      const a = i / 96 * Math.PI * 2;
      const s = wave.length ? Math.max(-1, Math.min(1, wave[Math.floor(i / 97 * wave.length)] ?? 0)) : 0;
      const rr = r + s * .1, tilt = .75 + Math.sin(phase * .2) * .15;
      const p: V3 = [rr * Math.cos(a + spin), rr * Math.sin(a + spin) * Math.cos(tilt), .22 + rr * Math.sin(a + spin) * Math.sin(tilt)];
      if (previous) add(back, previous, p);
      previous = p;
    }
    ring(front, 1.1 - audio.kick * .08, -.12, -.65 - audio.snare * .3);
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12 + Math.floor(phase * 8) * Math.PI / 48 - spin + audio.hat * .3;
      const len = i % 6 === 0 ? .1 + audio.kick * .12 : .05 + audio.hat * .06;
      add(front, [Math.cos(a) * 1.1, Math.sin(a) * 1.1 * .8, -.12], [Math.cos(a) * (1.1 + len), Math.sin(a) * (1.1 + len) * .8, -.12]);
    }
  } else if (model === "STELLA") {
    add(back, [-1.5, 0, .4], [1.5, 0, .4]);
    for (const sign of [-1, 1]) {
      for (const x of [-1, 1]) {
        const y = sign * (.62 + audio.kick * .3);
        add(front, [x * .62, y, sign * .35], [x * (.88 + audio.snare * .18), y * 1.4, sign * .5]);
      }
    }
  } else if (model === "SMILEY") {
    ring(back, 1.12, .25);
    for (let i = 0; i < 48; i++) {
      const a = i * Math.PI / 24, r = 1.12, length = i % 12 === 0 ? .14 : .035;
      add(back, [Math.cos(a) * r, Math.sin(a) * r, .25], [Math.cos(a) * (r + length), Math.sin(a) * (r + length), .25]);
    }
    const sector = Math.floor(phase * 2) % 4;
    for (let i = 0; i < 4; i++) {
      if (audio.perc > .15 && i !== sector) continue;
      const a = i * Math.PI / 2 + .12;
      ring(front, 1.26 + audio.perc * .06, -.12, 0, a, a + .38);
    }
  }
  return { back, front };
}