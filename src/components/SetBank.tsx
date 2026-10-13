import { useRef, useState } from "react";
import PixelScreen, { Tap } from "@/pixel/PixelScreen";
import type { Px } from "@/pixel/draw";
import type { GrooveSet } from "@/hooks/useGroovebox";
import { packSamples, unpackSamples } from "@/audio/sampleStore";

const KEY = "nadrisk.sets.v1", N = 8;
const read = (): (GrooveSet | null)[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.from({ length: N }, (_, i) => v[i] ?? null); } catch { return Array(N).fill(null); } };

const BTNS = ["SAVE", "LOAD", "DEL", "EXP", "EXP+", "IMP"] as const;

// MEMORY: the set bank as a 128x64 1-bit hardware screen. Storage logic unchanged.
export default function SetBank({ getSet, applySet, locked }: { getSet: (name: string) => GrooveSet; applySet: (s: GrooveSet) => void; locked?: boolean }) {
  const [sets, setSets] = useState(read);
  const [sel, setSel] = useState(0);
  const [name, setName] = useState(() => read()[0]?.name ?? "SET 01");
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const store = (next: (GrooveSet | null)[]) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); setSets(next); return true; } catch { setMsg("storage full — export instead"); return false; }
  };
  const pick = (i: number) => { setSel(i); setName(sets[i]?.name ?? `SET ${String(i + 1).padStart(2, "0")}`); setMsg(""); };
  const save = () => { if (locked) { setMsg("NADRISK LOCK"); return; } const n = sets.slice(); n[sel] = getSet(name.trim() || `SET ${sel + 1}`); if (store(n)) setMsg(`saved to slot ${sel + 1}`); };
  const load = () => { const st = sets[sel]; if (st) { applySet(st); setMsg(`loaded "${st.name}"`); } };
  const del = () => { if (locked) { setMsg("NADRISK LOCK"); return; } const n = sets.slice(); n[sel] = null; if (store(n)) setMsg("slot cleared"); };
  const exportSet = async (bundle: boolean) => {
    const base = sets[sel] ?? getSet(name || "set");
    let st: GrooveSet & { samples?: Awaited<ReturnType<typeof packSamples>> } = base, missing = 0;
    if (bundle) {
      const ids = [...new Set(base.slots.map(x => x.sampler?.sampleId ?? "").filter(id => id.startsWith("db:")))];
      try { const samples = await packSamples(ids); missing = ids.filter(id => !samples[id]).length; st = { ...base, samples }; }
      catch { setMsg("samples unreadable — exported without"); missing = -1; }
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...st, origin: location.hostname }, null, 1)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `${st.name.replace(/[^\w-]+/g, "_")}${bundle ? ".bundle" : ""}.nadrisk.json`; a.click(); URL.revokeObjectURL(url);
    if (missing > 0) setMsg(`exported · ${missing} sample${missing > 1 ? "s" : ""} missing`); else if (!missing) setMsg(bundle ? "exported with samples" : "exported");
  };
  const importSet = async (f?: File) => {
    if (!f) return;
    if (locked) { setMsg("NADRISK LOCK"); if (file.current) file.current.value = ""; return; }
    try { const raw = JSON.parse(await f.text()) as GrooveSet & { samples?: Parameters<typeof unpackSamples>[0] }; if (!Array.isArray(raw.slots)) throw 0; let samplesOk = true; try { await unpackSamples(raw.samples); } catch { samplesOk = false; }
      const { samples: _s, ...st } = raw; const n = sets.slice(); n[sel] = st; const kept = store(n); setName(st.name); applySet(st);
      if (!samplesOk) setMsg("imported · samples not saved"); else if (kept) setMsg(`imported "${st.name}"`); }
    catch { setMsg("not a valid set file"); }
    if (file.current) file.current.value = "";
  };
  const act = (b: (typeof BTNS)[number]) => {
    if (b === "SAVE") save(); else if (b === "LOAD") load(); else if (b === "DEL") del();
    else if (b === "EXP") void exportSet(false); else if (b === "EXP+") void exportSet(true); else file.current?.click();
  };

  const draw = (p: Px) => {
    p.invert(0, 0, 128, 9);
    p.text("MEMORY", 2, 2, false);
    p.text(msg.slice(0, 12).toUpperCase(), 40, 2, false);
    for (let i = 0; i < N; i++) {
      const col = i % 2, row = Math.floor(i / 2), x = 1 + col * 64, y = 11 + row * 10, st = sets[i];
      if (i === sel) p.invert(x, y - 1, 63, 9);
      const on = i !== sel;
      p.text(String(i + 1).padStart(2, "0"), x + 2, y, on);
      p.text((st?.name ?? "EMPTY").slice(0, 8).toUpperCase(), x + 12, y, on);
      if (st) p.text(`${st.bpm}`, x + 47, y, on);
    }
    BTNS.forEach((b, i) => { const x = 1 + i * 21, w = b === "EXP+" ? 22 : 20; p.box(x, 53, w, 9); p.text(b, x + 2, 55); });
  };

  return <div className="node-body">
    <div className="px-panel">
      <PixelScreen label="Memory set bank screen" draw={draw} deps={[sets, sel, msg]}>
        {sets.map((st, i) => <Tap key={i} x={1 + (i % 2) * 64} y={9 + Math.floor(i / 2) * 10} w={63} h={10} label={`Set slot ${i + 1}${st ? ` ${st.name}` : " empty"}`} pressed={i === sel}
          onClick={() => pick(i)} />)}
        {BTNS.map((b, i) => <Tap key={b} x={1 + i * 21} y={52} w={b === "EXP+" ? 22 : 20} h={11} label={b === "DEL" ? "Clear slot" : b === "EXP" ? "Export set" : b === "EXP+" ? "Export set with samples" : b === "IMP" ? "Import set" : b === "SAVE" ? "Save set" : "Load set"}
          disabled={(b === "LOAD" || b === "DEL") && !sets[sel]} onClick={() => act(b)} />)}
      </PixelScreen>
    </div>
    <div className="gb-seq-tools" style={{ padding: "8px 0 0", flexWrap: "wrap" }}>
      <input className="gb-input" aria-label="Set name" value={name} maxLength={24} onChange={e => setName(e.target.value)} style={{ width: 120 }} />
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => void importSet(e.target.files?.[0])} />
    </div>
    <span className="patch-small">{msg || "tap a slot · SAVE / LOAD / DEL · EXP+ packs the samples too · samples are remembered on this device"}</span>
  </div>;
}
