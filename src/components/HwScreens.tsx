import { Tap } from "@/pixel/PixelScreen";
import type { Px } from "@/pixel/draw";
import { Panel, type Knob } from "@/components/pixelScreens";
import type { PerformanceParams } from "@/audio/performance";

export const pkey = (p: Px, s: string, x: number, y: number, w: number, on: boolean, h = 9) => { if (on) p.rect(x, y, w, h); else p.box(x, y, w, h); p.textC(s, x + w / 2, y + Math.floor((h - 5) / 2), !on); };
type K = { s: string; label: string; x: number; y: number; w: number; on: boolean; fn: () => void; disabled?: boolean };
const drawKeys = (p: Px, ks: K[]) => ks.forEach(k => pkey(p, k.s, k.x, k.y, k.w, k.on));
const keyZones = (ks: K[]) => ks.map(k => <Tap key={k.label} x={k.x} y={k.y} w={k.w} h={9} label={k.label} pressed={k.on} disabled={k.disabled} onClick={k.fn} />);
const kn = (label: string, short: string, value: number, min: number, max: number, step: number, unit: string, set: (v: number) => void): Knob => ({ label, short, value, min, max, step, fmt: v => `${+v.toFixed(1)}${unit}`, set });

export function MasterScreen({ playing, step, onPlay, bpm, setBpm, volume, setVolume, eco, setEco, latency, pf, setPf }: {
  playing: boolean; step: number; onPlay: () => void; bpm: number; setBpm: (v: number) => void; volume: number; setVolume: (v: number) => void;
  eco: boolean; setEco: (v: boolean) => void; latency: number | null; pf: PerformanceParams; setPf: (p: Partial<PerformanceParams>) => void;
}) {
  const keys = (page: string): K[] => page === "OUT" ? [
    { s: playing ? "STOP" : "PLAY", label: playing ? "Stop" : "Play", x: 1, y: 11, w: 30, on: playing, fn: onPlay },
    { s: "ECO", label: "Eco mode", x: 33, y: 11, w: 22, on: eco, fn: () => setEco(!eco) },
  ] : page === "DYN" ? [
    { s: "CLIP", label: "Master clipper", x: 2, y: 14, w: 40, on: pf.clipOn, fn: () => setPf({ clipOn: !pf.clipOn }) },
    { s: "LIMIT", label: "Master limiter", x: 44, y: 14, w: 40, on: pf.limitOn, fn: () => setPf({ limitOn: !pf.limitOn }) },
    { s: "GLUE", label: "Glue compressor", x: 86, y: 14, w: 40, on: !!pf.glueOn, fn: () => setPf({ glueOn: !pf.glueOn }) },
  ] : page === "EQ" ? [{ s: "EQ", label: "Mastering EQ", x: 1, y: 11, w: 22, on: !!pf.mEqOn, fn: () => setPf({ mEqOn: !pf.mEqOn }) }] : [];
  const knobs = (page: string): Knob[] => page === "OUT" ? [
    kn("Tempo", "BPM", bpm, 60, 180, 1, "", setBpm), kn("Master volume", "VOL", volume, 0, 100, 1, "%", setVolume),
  ] : page === "DYN" ? [
    kn("Clip drive", "DRV", pf.clipDrive, 0, 18, .5, "DB", clipDrive => setPf({ clipDrive })), kn("Limiter ceiling", "CEIL", pf.ceiling, -12, 0, .5, "DB", ceiling => setPf({ ceiling })),
    kn("Glue thresh", "THR", pf.glueThresh ?? -12, -30, 0, .5, "DB", glueThresh => setPf({ glueThresh })), kn("Ratio", "RAT", pf.glueRatio ?? 2, 1, 4, .1, ":1", glueRatio => setPf({ glueRatio })),
  ] : page === "EQ" ? [
    kn("Master Low 90Hz", "90", pf.mLow ?? 0, -6, 6, .5, "DB", mLow => setPf({ mLow })), kn("Master Mud 300Hz", "300", pf.mMud ?? 0, -6, 6, .5, "DB", mMud => setPf({ mMud })),
    kn("Master Presence 3k", "3K", pf.mPresence ?? 0, -6, 6, .5, "DB", mPresence => setPf({ mPresence })), kn("Master Air 12k", "12K", pf.mAir ?? 0, -6, 6, .5, "DB", mAir => setPf({ mAir })),
  ] : [];
  return <Panel name="MASTER" label="Master" pages={["OUT", "DYN", "EQ"]} deps={[playing, step, bpm, volume, eco, latency, JSON.stringify(pf)]} knobs={knobs}
    body={(p, page) => {
      drawKeys(p, keys(page));
      if (page === "OUT") {
        p.text(`${bpm}`, 62, 11, true, 2); p.text("BPM", 90, 16);
        for (let i = 0; i < 16; i++) { const x = 2 + i * 8, cur = step >= 0 && step % 16 === i; if (cur) p.rect(x, 23, 6, 5); else p.box(x, 23, 6, 5); }
        p.text(`LAT ${latency == null ? "--" : latency}MS`, 2, 32);
      } else if (page === "EQ") {
        const g = [pf.mLow ?? 0, pf.mMud ?? 0, pf.mPresence ?? 0, pf.mAir ?? 0], xs = [36, 58, 86, 112];
        let px = 14, py = 28;
        for (let x = 14; x < 126; x++) { let y = 28; xs.forEach((c, i) => { y -= g[i] * Math.max(0, 1 - Math.abs(x - c) / 14) * 1.4; }); if (x < 14 + (pf.mHpf ?? 25) / 4) y = 36; p.line(px, py, x, Math.round(y)); px = x; py = Math.round(y); }
        p.text(pf.mEqOn ? "ON" : "BYP", 26, 13);
      }
    }}
    extra={page => keyZones(keys(page))} />;
}

export function MidiScreen({ devices, learn, target, mapCount, status, connect, setLearn, unmap, canUnmap, clear }: {
  devices: string[] | null; learn: boolean; target: string | null; mapCount: number; status: string; connect: () => void; setLearn: (v: boolean) => void; unmap: () => void; canUnmap: boolean; clear: () => void;
}) {
  const ks: K[] = [
    { s: devices ? `${devices.length}DEV` : "CONN", label: "Connect MIDI", x: 1, y: 11, w: 30, on: !!devices?.length, fn: connect },
    { s: "LEARN", label: "MIDI learn", x: 33, y: 11, w: 30, on: learn, fn: () => setLearn(!learn) },
    { s: "UNMAP", label: "Unmap", x: 65, y: 11, w: 30, on: false, fn: unmap, disabled: !canUnmap },
    { s: "CLR", label: "Clear all mappings", x: 97, y: 11, w: 30, on: false, fn: clear, disabled: !mapCount },
  ];
  const msg = (status || (learn ? (target ? `MOVE A KNOB FOR ${target}` : "TAP A CONTROL THEN MOVE A KNOB") : `${mapCount} MAPS  NOTES 36-51 PADS`)).toUpperCase();
  return <Panel name="MIDI" label="MIDI" pages={["MAP"]} deps={[devices?.join(), learn, target, mapCount, status]} knobs={() => []}
    body={p => { drawKeys(p, ks); [msg.slice(0, 31), msg.slice(31, 62), (devices ?? []).join(" ").toUpperCase().slice(0, 31)].forEach((l, i) => p.text(l, 2, 26 + i * 8)); }}
    extra={() => keyZones(ks)} />;
}

export function SeqScreen({ bank, queued, selectBank, view, setView, copy, random, clear, reset }: {
  bank: number; queued: number | null; selectBank: (b: number) => void; view: string; setView: (v: string) => void; copy: () => void; random: () => void; clear: () => void; reset: () => void;
}) {
  const views = ["note", "vel", "chance", "roll", "mod"];
  const ks: K[] = [
    ...["A", "B"].map((n, b) => ({ s: queued === b ? `${n}>` : n, label: `Pattern ${n}`, x: 1 + b * 13, y: 11, w: 12, on: bank === b, fn: () => selectBank(b) })),
    ...views.map((v, i) => ({ s: v === "chance" ? "CHNC" : v.toUpperCase(), label: `View ${v}`, x: 28 + i * 20, y: 11, w: 19, on: view === v, fn: () => setView(v) })),
    { s: `CPY>${bank ? "A" : "B"}`, label: "Copy pattern", x: 1, y: 22, w: 31, on: false, fn: copy },
    { s: "RAND", label: "Random pattern", x: 33, y: 22, w: 31, on: false, fn: random },
    { s: "CLR", label: "Clear pattern", x: 65, y: 22, w: 31, on: false, fn: clear },
    { s: "RST", label: "Reset all", x: 97, y: 22, w: 30, on: false, fn: reset },
  ];
  const hint = view === "mod" ? "DRAG LIT STEPS TO SET AMOUNT" : view === "vel" ? "DRAG LIT STEPS FOR VELOCITY" : view === "chance" ? "DRAG LIT STEPS FOR CHANCE" : view === "roll" ? "DRAG A STEP TO SPLIT IT" : "TAP HIT > TIE > OFF";
  return <div className="px-strip"><Panel name="STEPSEQ" label="Step sequencer" pages={[bank ? "B" : "A"]} deps={[bank, queued, view]} knobs={() => []}
    body={p => { drawKeys(p, ks); p.text(hint, 2, 36); }}
    extra={() => keyZones(ks)} /></div>;
}
