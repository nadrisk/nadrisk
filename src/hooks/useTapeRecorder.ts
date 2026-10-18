import { useEffect, useRef, useState } from "react";
import { createTape, encodeMp3, encodeWav, MAX_TAPE_SEC, type Take } from "@/audio/tape";

type Source = () => Promise<{ ctx: BaseAudioContext; node: AudioNode } | null>;
/** Owned by the groovebox, never by a switchable panel. */
export function useTapeRecorder(getSource: Source, playing: boolean, step: number, bpm: number, onPlay: () => void) {
  const tape = useRef<Awaited<ReturnType<typeof createTape>> | null>(null);
  const [state, setState] = useState<"idle" | "count" | "arm" | "rec" | "play">("idle");
  const [count, setCount] = useState(0), [secs, setSecs] = useState(0);
  const [take, setTake] = useState<Take | null>(null), [url, setUrl] = useState<string | null>(null), [busy, setBusy] = useState("");
  const audio = useRef<HTMLAudioElement>(null), timers = useRef<number[]>([]), lastStep = useRef(step);
  useEffect(() => () => { tape.current?.dispose(); timers.current.forEach(clearTimeout); }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const begin = () => { tape.current?.start(); setState("rec"); };
  const stop = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (state === "play") { audio.current?.pause(); setState("idle"); return; }
    if (state === "count" || state === "arm") { setState("idle"); return; }
    const t = tape.current?.stop(); setState("idle");
    if (t && t.frames) { setTake(t); setSecs(t.frames / t.rate); setUrl(URL.createObjectURL(encodeWav(t))); }
  };
  useEffect(() => {
    if (state !== "rec") return;
    const iv = window.setInterval(() => { const s = tape.current?.seconds() ?? 0; setSecs(s); if (s >= MAX_TAPE_SEC) stop(); }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  useEffect(() => {
    const prev = lastStep.current; lastStep.current = step;
    if (state !== "arm") return;
    if (!playing) { setState("idle"); return; }
    if (step >= 0 && step % 16 === 0 && prev !== step) begin();
  }, [step, state, playing]);
  const record = async () => {
    try {
      if (!tape.current) { const src = await getSource(); if (!src) return; tape.current = await createTape(src.node, src.ctx); }
      audio.current?.pause(); setTake(null); setUrl(null); setSecs(0); setBusy("");
      if (playing) { setState("arm"); return; }
      const beat = 60000 / Math.max(30, bpm); setState("count"); setCount(2);
      timers.current = [window.setTimeout(() => setCount(1), beat), window.setTimeout(() => { begin(); onPlay(); }, beat * 2)];
    } catch { setBusy("recorder unavailable in this browser"); }
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
  return { state, count, secs, take, url, busy, audio, record, stop, play, save, clear: () => { setTake(null); setUrl(null); setSecs(0); }, ended: () => setState("idle") };
}
export type TapeRecorder = ReturnType<typeof useTapeRecorder>;