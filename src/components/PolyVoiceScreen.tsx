import { memo } from "react";
import type { Slot } from "@/hooks/useGroovebox";
import { Panel, pct, type Knob } from "@/components/pixelScreens";

/** VOICE: the poly's stack drawn as a voice matrix — detuned saws spread left/right, pulse and sub below, chorus width as the outer frame. */
function PolyVoiceScreen({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const v = slot.poly, P = (x: Partial<typeof v>) => onChange({ poly: { ...v, ...x } });
  const knobs: Knob[] = [
    { label: "Poly voice detune", short: "DET", value: v.detune, min: 0, max: 40, step: 1, reset: 9, fmt: x => `${Math.round(x)}CT`, set: detune => P({ detune }) },
    { label: "Poly voice pulse", short: "PULS", value: v.pulse, min: 0, max: 1, step: .01, reset: .35, fmt: pct, set: pulse => P({ pulse }) },
    { label: "Poly voice sub", short: "SUB", value: v.sub, min: 0, max: 1, step: .01, reset: .3, fmt: pct, set: sub => P({ sub }) },
    { label: "Poly voice chorus", short: "WIDE", value: v.chorus, min: 0, max: 1, step: .01, reset: .35, fmt: pct, set: chorus => P({ chorus }) },
  ];
  return <Panel name="VOICE" label="Poly voice matrix" pages={["STK"]} deps={[v.detune, v.pulse, v.sub, v.chorus]} knobs={() => knobs}
    body={p => {
      const cx = 64, wide = Math.round(v.chorus * 40), off = Math.round(v.detune / 40 * 22);
      p.box(cx - 22 - wide, 11, 44 + wide * 2, 34, true);
      // Three saw voices: centre plus two detuned copies pushed out by DET and WIDE.
      [-1, 0, 1].forEach(k => { const x = cx + k * (off + wide / 2) - 6; for (let s = 0; s < 2; s++) { p.line(x + s * 6, 26, x + s * 6 + 6, 14); p.line(x + s * 6 + 6, 14, x + s * 6 + 6, 26); } });
      // Pulse row: solid bar sized by level; sub row: low square under the stack.
      const pw = Math.round(v.pulse * 40); if (pw) { p.rect(cx - pw / 2, 30, pw, 1); p.rect(cx - pw / 2, 30, 1, 5); p.rect(cx + pw / 2, 30, 1, 5); p.rect(cx - pw / 2, 34, pw, 1); }
      const sw = Math.round(v.sub * 30); if (sw) p.rect(cx - sw / 2, 39, sw, 4);
      p.text("SUB", 4, 39); p.text("PLS", 4, 30); p.text("SAW", 4, 18);
    }} />;
}
export default memo(PolyVoiceScreen);
