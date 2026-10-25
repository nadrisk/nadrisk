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
  if (model === "POLY") {
    ring(back, 1.28 - audio.kick * .2, .22, .75);
    ring(front, 1.18, -.12, -.65);
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12 + Math.floor(phase * 8) * Math.PI / 48 + audio.hat * .1;
      const r = 1.28 - audio.kick * .2;
      add(back, [Math.cos(a) * r, Math.sin(a) * r * .73, .22], [Math.cos(a) * (r + .05), Math.sin(a) * (r + .05) * .73, .22]);
    }
  } else if (model === "WIRE") {
    const shift = audio.snare * .1, drift = (phase * .018) % .09;
    for (let i = -11; i <= 11; i++) {
      const p = i * (.095 + audio.snare * .012) + drift + shift;
      add(back, [p, -1.1, .5], [p, 1.1, .5]);
      if (i % 2 === 0) add(front, [-1.1, p, -.4], [1.1, p, -.4]);
    }
  } else if (model === "TESSERACT") {
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
  } else if (model === "KNOT") {
    let previous: V3 | undefined;
    for (let i = 0; i <= 192; i++) {
      const a = i / 192 * Math.PI * 2 + phase * .15;
      const sample = wave.length ? wave[Math.floor(i / 193 * wave.length)] ?? 0 : 0;
      const r = 1.12 + audio.kick * .14 + Math.max(-1, Math.min(1, sample)) * .22;
      const p: V3 = [r * Math.cos(a), (i / 192 - .5) * .65 + sample * .12, r * Math.sin(a)];
      if (previous) add(p[2] < 0 ? front : back, previous, p);
      previous = p;
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