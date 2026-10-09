import { memo, useEffect, useRef, useState } from "react";
import { Circle, Download, Play, Square, Trash2 } from "lucide-react";
import { createTape, encodeMp3, encodeWav, MAX_TAPE_SEC, type Take } from "@/audio/tape";

type Source = () => Promise<{ ctx: BaseAudioContext; node: AudioNode } | null>;
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;

function Reel({ fill, spin, reverse }: { fill: number; spin: boolean; reverse?: boolean }) {
  const r = 14 + fill * 22;
  return <svg viewBox="0 0 100 100" className={`tape-reel ${spin ? "spin" : ""} ${reverse ? "rev" : ""}`} aria-hidden="true">
    <circle cx="50" cy="50" r={r + 8} className="tape-pack" />
    <circle cx="50" cy="50" r="46" className="tape-flange" />
    {[0, 120, 240].map(a => <path key={a} transform={`rotate(${a} 50 50)`} d="M50 50 L42 12 A40 40 0 0 1 58 12 Z" className="tape-window" />)}
    <circle cx="50" cy="50" r="9" className="tape-hub" />
    {[0, 60, 120, 180, 240, 300].map(a => <rect key={a} transform={`rotate(${a} 50 50)`} x="48.5" y="40" width="3" height="5" className="tape-tooth" />)}
  </svg>;
}

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
  const fill = Math.min(1, secs / 180), spinning = state !== "idle";

  return <div className="node-body tape-deck">
    <div className={`tape-machine ${state}`}>
      <Reel fill={1 - fill} spin={spinning} />
      <div className="tape-path" aria-hidden="true"><i className="tape-guide" /><span className="tape-head">{state === "rec" ? "REC" : state === "play" ? "PB" : "HEAD"}</span><i className="tape-guide" /></div>
      <Reel fill={fill} spin={spinning} />
    </div>
    <div className="tape-counter"><span className={`tape-lamp ${state === "rec" ? "on" : ""}`} />{clock(secs)}<span className="patch-small">{state === "rec" ? "recording master" : take ? "take ready" : "empty reel"}</span></div>
    <div className="tape-buttons">
      <button className={`gb-mute tape-rec ${state === "rec" ? "selected" : ""}`} aria-label="Record master" aria-pressed={state === "rec"} disabled={state === "rec"} onClick={record}><Circle size={11} /> REC</button>
      <button className="gb-mute" aria-label="Stop tape" disabled={state === "idle"} onClick={stop}><Square size={11} /> STOP</button>
      <button className="gb-mute" aria-label="Play take" disabled={!url || state !== "idle"} onClick={play}><Play size={11} /> PLAY</button>
      <button className="gb-mute" aria-label="Clear take" disabled={!take || state !== "idle"} onClick={() => { setTake(null); setUrl(null); setSecs(0); }}><Trash2 size={11} /></button>
    </div>
    <div className="tape-buttons">
      <button className="gb-mute" aria-label="Download WAV" disabled={!take || !!busy} onClick={() => save("wav")}><Download size={11} /> WAV</button>
      <button className="gb-mute" aria-label="Download MP3" disabled={!take || !!busy} onClick={() => save("mp3")}><Download size={11} /> MP3 320</button>
    </div>
    <span className="patch-small">{busy || `records everything you hear · up to ${MAX_TAPE_SEC / 60} min`}</span>
    {url && <audio ref={audio} src={url} onEnded={() => setState("idle")} hidden />}
  </div>;
}
export default memo(TapeDeck);
