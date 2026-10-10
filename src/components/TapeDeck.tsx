import { memo, useEffect, useRef, useState } from "react";
import { Tap } from "@/pixel/PixelScreen";
import type { Px } from "@/pixel/draw";
import { Panel } from "@/components/pixelScreens";
import { createTape, encodeMp3, encodeWav, MAX_TAPE_SEC, type Take } from "@/audio/tape";

type Source = () => Promise<{ ctx: BaseAudioContext; node: AudioNode } | null>;
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;

/** tape.rec~ — records the final master output; exports WAV (16-bit) or MP3 (320 kbps), all on the device. */
function TapeDeck({ getSource }: { getSource: Source }) {
  const tape = useRef<Awaited<ReturnType<typeof createTape>> | null>(null);
  const [state, setState] = useState<"idle" | "rec" | "play">("idle");
  const [secs, setSecs] = useState(0);
  const [take, setTake] = useState<Take | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => () => { tape.current?.dispose(); }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => {
    if (state !== "rec") return;
    const iv = window.setInterval(() => { const s = tape.current?.seconds() ?? 0; setSecs(s); if (s >= MAX_TAPE_SEC) stop(); }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const record = async () => {
    try {
      if (!tape.current) { const src = await getSource(); if (!src) return; tape.current = await createTape(src.node, src.ctx); }
      audio.current?.pause(); setTake(null); setUrl(null); setSecs(0); tape.current.start(); setState("rec"); setBusy("");
    } catch { setBusy("recorder unavailable in this browser"); }
  };
  const stop = () => {
    if (state === "play") { audio.current?.pause(); setState("idle"); return; }
    const t = tape.current?.stop(); setState("idle");
    if (t && t.frames) { setTake(t); setSecs(t.frames / t.rate); setUrl(URL.createObjectURL(encodeWav(t))); }
  };
  const play = () => { if (!audio.current || !url) return; audio.current.currentTime = 0; void audio.current.play(); setState("play"); };
  const save = async (kind: "wav" | "mp3") => {
    if (!take) return;
    const name = `nadrisk-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.${kind}`;
    let blob: Blob;
    if (kind === "wav") blob = encodeWav(take);
    else { setBusy("encoding mp3 0%"); blob = await encodeMp3(take, p => setBusy(`encoding mp3 ${Math.round(p * 100)}%`)); setBusy(""); }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const fill = Math.min(1, secs / 180);

  const ang = secs * 3;
  const reel = (p: Px, cx: number, f: number) => { p.circle(cx, 24, 12); p.circle(cx, 24, Math.max(3, Math.round(4 + f * 7))); p.circle(cx, 24, 2); for (let k = 0; k < 3; k++) { const a = ang + k * 2.094; p.line(cx + 3 * Math.cos(a), 24 + 3 * Math.sin(a), cx + 10 * Math.cos(a), 24 + 10 * Math.sin(a)); } };
  const keys: [string, string, number, boolean, () => void][] = [
    ["REC", "Record master", 1, state !== "rec", record], ["STOP", "Stop tape", 33, state !== "idle", stop], ["PLAY", "Play take", 65, !!url && state === "idle", play], ["CLR", "Clear take", 97, !!take && state === "idle", () => { setTake(null); setUrl(null); setSecs(0); }],
  ];
  const ex: [string, string, number, () => void][] = [["WAV", "Download WAV", 1, () => save("wav")], ["MP3", "Download MP3", 65, () => save("mp3")]];
  return <div className="node-body tape-deck">
    <Panel name="TAPE" label="Tape recorder" pages={["REC"]} deps={[state, secs, !!take, busy]} knobs={() => []}
      body={p => {
        reel(p, 22, 1 - fill); reel(p, 106, fill);
        p.line(22, 36, 106, 36); p.rect(58, 33, 12, 4);
        p.textC(clock(secs), 64, 14);
        p.textC(state === "rec" ? "REC" : state === "play" ? "PLAY" : take ? "READY" : "EMPTY", 64, 22, true);
        if (state === "rec") p.rect(46, 22, 3, 5);
        keys.forEach(([s, , x, en]) => { const on = (s === "REC" && state === "rec") || (s === "PLAY" && state === "play"); if (on) p.rect(x, 41, 30, 9); else p.box(x, 41, 30, 9, !en); p.textC(s, x + 15, 43, !on); });
        ex.forEach(([s, , x]) => { p.box(x, 53, 62, 10, !take || !!busy); p.textC(s, x + 31, 56); });
        if (busy) { p.rect(0, 53, 128, 10, false); p.textC(busy.toUpperCase().slice(0, 30), 64, 56); }
      }}
      extra={() => <>
        {keys.map(([s, l, x, en, fn]) => <Tap key={s} x={x} y={41} w={30} h={9} label={l} disabled={!en} pressed={s === "REC" ? state === "rec" : undefined} onClick={fn} />)}
        {ex.map(([s, l, x, fn]) => <Tap key={s} x={x} y={53} w={62} h={10} label={l} disabled={!take || !!busy} onClick={fn} />)}
      </>} />
    {url && <audio ref={audio} src={url} onEnded={() => setState("idle")} hidden />}
  </div>;
}
export default memo(TapeDeck);
