import { useEffect, useRef, useState } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel } from "@/components/pixelScreens";
import { factoryRefs, isFactory } from "@/audio/wtFactory";
import { BASIC_ID, deleteTable, importWavetable, listTables, onTablesChanged, type WtRef } from "@/audio/wavetable";

const ROWS = 3;

/** SYN wavetable browser: BASIC and the factory tables grouped by wave type, then the user's imported tables (stored on this device). */
export default function WavetableLibrary({ value, onPick }: { value?: string; onPick: (id: string) => void }) {
  const [list, setList] = useState<WtRef[]>([]);
  const [sel, setSel] = useState(0);
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { const r = () => { listTables().then(setList); }; r(); return onTablesChanged(r); }, []);
  const all: WtRef[] = [{ id: BASIC_ID, name: "BASIC WAVES" }, ...factoryRefs(), ...list], cur = value || BASIC_ID;
  useEffect(() => { const i = all.findIndex(a => a.id === cur); if (i >= 0) setSel(i); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cur, list.length]);
  const top = Math.max(0, Math.min(sel - 1, all.length - ROWS)), vis = all.slice(top, top + ROWS);
  const pick = (i: number) => { setSel(i); const r = all[i]; if (r) onPick(r.id); };
  return <>
    <Panel name="LIBRARY" label="Wavetable library" pages={["WT"]} deps={[sel, cur, all.length, msg]} knobs={() => []}
      body={p => {
        vis.forEach((s, i) => { const y = 11 + i * 9, idx = top + i, on = idx === sel;
          if (on) p.rect(0, y, 116, 9);
          p.text(`${String(idx + 1).padStart(2, "0")} ${"group" in s ? `${(s as { group: string }).group} ` : ""}${s.name.toUpperCase()}`.slice(0, 20), 2, y + 2, !on);
          if (s.id === cur) p.text("*", 96, y + 2, !on);
          if (on && s.id !== BASIC_ID && !isFactory(s.id)) { p.rect(104, y + 1, 11, 7, false); p.text("X", 108, y + 2, true); } });
        p.box(122, 11, 5, 27);
        const n = Math.max(1, all.length), h = Math.max(3, Math.round(25 * ROWS / Math.max(ROWS, n))), y = 12 + Math.round((25 - h) * (top / Math.max(1, n - ROWS)));
        p.rect(123, y, 3, h);
        [["LOAD", 1, 63], ["IMPRT", 64, 63]].forEach(([s, x, w]) => { p.box(x as number, 42, w as number, 11); p.textC(s as string, (x as number) + (w as number) / 2, 45); });
        p.text((msg || (list.length ? `${list.length} IMPORTED TABLE${list.length>1?"S":""}` : "IMPRT YOUR OWN .WAV TABLES")).toUpperCase().slice(0, 31), 2, 57);
      }}
      extra={() => <>
        {vis.map((s, i) => <Tap key={s.id} x={0} y={11 + i * 9} w={102} h={9} label={`Wavetable ${s.name}`} pressed={top + i === sel} onClick={() => setSel(top + i)} />)}
        {all[sel] && all[sel].id !== BASIC_ID && !isFactory(all[sel].id) && sel >= top && sel < top + ROWS && <Tap x={103} y={11 + (sel - top) * 9} w={13} h={9} label={`Remove wavetable ${all[sel].name}`} onClick={async () => { const r = all[sel]; await deleteTable(r.id).catch(() => {}); if (r.id === cur) onPick(BASIC_ID); setSel(Math.max(0, sel - 1)); setMsg(`REMOVED ${r.name}`); }} />}
        <Zone x={119} y={11} w={9} h={27} label="Scroll wavetables" value={all.length - 1 - sel} min={0} max={Math.max(0, all.length - 1)} onChange={v => setSel(all.length - 1 - v)} />
        <Tap x={1} y={42} w={63} h={11} label="Load wavetable" onClick={() => pick(sel)} />
        <Tap x={64} y={42} w={63} h={11} label="Import wavetable" onClick={() => file.current?.click()} />
      </>} />
    <input ref={file} type="file" multiple accept=".wav,audio/wav,audio/x-wav" className="sr-only" onChange={async e => {
      const fs = Array.from(e.target.files ?? []); e.target.value = ""; let last: string | null = null, bad = 0;
      for (const f of fs) { try { const t = await importWavetable(f); last = t.id; setMsg(`${t.name} ${t.frames.length} FRAMES`); } catch (err) { bad++; setMsg(`${f.name}: ${(err as Error).message}`); } }
      if (last) onPick(last); if (fs.length > 1) setMsg(`${fs.length - bad} IMPORTED${bad ? ` ${bad} FAILED` : ""}`);
    }} />
  </>;
}
