import { useEffect, useRef, useState } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel } from "@/components/pixelScreens";
import { LIBRARY, listCached, type SampleRef } from "@/audio/sampleStore";

const ROWS = 3;

export default function LibraryScreen({ value, onPick, onFolder, onLoad }: { value?: string; onPick: (id: string, name: string) => void; onFolder: (f: File[]) => Promise<{ total: number; matched: number; saved?: number }>; onLoad: (f: File) => void }) {
  const [cached, setCached] = useState<SampleRef[]>([]);
  const [sel, setSel] = useState(0);
  const [msg, setMsg] = useState("");
  const folder = useRef<HTMLInputElement>(null), file = useRef<HTMLInputElement>(null);
  const refresh = () => { listCached().then(setCached).catch(() => setCached([])); };
  useEffect(refresh, [value]);
  const all = [...LIBRARY.map(n => ({ id: `lib:${n}`, name: n })), ...cached];
  useEffect(() => { const i = all.findIndex(a => a.id === value); if (i >= 0) setSel(i); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [value, cached.length]);
  const top = Math.max(0, Math.min(sel - 1, all.length - ROWS));
  const vis = all.slice(top, top + ROWS);
  return <>
    <Panel name="LIBRARY" label="Sample library" pages={["SMP"]} deps={[sel, value, all.length, msg]} knobs={() => []}
      body={p => {
        vis.forEach((s, i) => {
          const y = 11 + i * 9, idx = top + i, on = idx === sel;
          if (on) p.rect(0, y, 120, 9);
          p.text(`${String(idx + 1).padStart(2, "0")} ${s.name.toUpperCase().replace(/\.[A-Z0-9]+$/, "")}`.slice(0, 26), 2, y + 2, !on);
          if (s.id === value) p.text("*", 114, y + 2, !on);
        });
        // stepped scrollbar
        p.box(122, 11, 5, 27);
        const n = Math.max(1, all.length), h = Math.max(3, Math.round(25 * ROWS / n)), y = 12 + Math.round((25 - h) * (top / Math.max(1, n - ROWS)));
        p.rect(123, y, 3, h);
        [["LOAD", 1], ["FOLDR", 43], ["IMPRT", 85]].forEach(([s, x]) => { p.box(x as number, 42, 42, 11); p.textC(s as string, (x as number) + 21, 45); });
        p.text((msg || `${all.length} SAMPLES`).toUpperCase().slice(0, 31), 2, 57);
      }}
      extra={() => <>
        {vis.map((s, i) => <Tap key={s.id} x={0} y={11 + i * 9} w={120} h={9} label={`Sample ${s.name}`} pressed={top + i === sel} onClick={() => setSel(top + i)} />)}
        <Zone x={121} y={11} w={7} h={27} label="Scroll samples" value={all.length - 1 - sel} min={0} max={Math.max(0, all.length - 1)} onChange={v => setSel(all.length - 1 - v)} />
        <Tap x={1} y={42} w={42} h={11} label="Load sample" onClick={() => { const r = all[sel]; if (r) onPick(r.id, r.name); }} />
        <Tap x={43} y={42} w={42} h={11} label="Load folder" onClick={() => folder.current?.click()} />
        <Tap x={85} y={42} w={42} h={11} label="Import sample" onClick={() => file.current?.click()} />
      </>} />
    <input ref={folder} type="file" multiple className="sr-only" {...{ webkitdirectory: "", directory: "" }} onChange={async e => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (!f.length) return; const r = await onFolder(f); refresh(); setMsg(`${r.saved ?? r.total} SAVED ${r.matched} MATCHED`); }} />
    <input ref={file} type="file" accept="audio/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) onLoad(f); e.target.value = ""; }} />
  </>;
}
