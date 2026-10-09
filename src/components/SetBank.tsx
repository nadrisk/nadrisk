import { useRef, useState } from "react";
import { Download, Save, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GrooveSet } from "@/hooks/useGroovebox";

const KEY = "nadrisk.sets.v1", N = 8;
const read = (): (GrooveSet | null)[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.from({ length: N }, (_, i) => v[i] ?? null); } catch { return Array(N).fill(null); } };

export default function SetBank({ getSet, applySet }: { getSet: (name: string) => GrooveSet; applySet: (s: GrooveSet) => void }) {
  const [sets, setSets] = useState(read);
  const [sel, setSel] = useState(0);
  const [name, setName] = useState(() => read()[0]?.name ?? "SET 01");
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const store = (next: (GrooveSet | null)[]) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); setSets(next); return true; } catch { setMsg("storage full — export instead"); return false; }
  };
  const pick = (i: number) => { setSel(i); setName(sets[i]?.name ?? `SET ${String(i + 1).padStart(2, "0")}`); setMsg(""); };
  const save = () => { const n = sets.slice(); n[sel] = getSet(name.trim() || `SET ${sel + 1}`); if (store(n)) setMsg(`saved to slot ${sel + 1}`); };
  const load = () => { const st = sets[sel]; if (st) { applySet(st); setMsg(`loaded "${st.name}"`); } };
  const del = () => { const n = sets.slice(); n[sel] = null; if (store(n)) setMsg("slot cleared"); };
  const exportSet = () => {
    const st = sets[sel] ?? getSet(name || "set");
    const url = URL.createObjectURL(new Blob([JSON.stringify(st, null, 1)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `${st.name.replace(/[^\w-]+/g, "_")}.nadrisk.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importSet = async (f?: File) => {
    if (!f) return;
    try { const st = JSON.parse(await f.text()) as GrooveSet; if (!Array.isArray(st.slots)) throw 0; const n = sets.slice(); n[sel] = st; store(n); setName(st.name); applySet(st); setMsg(`imported "${st.name}"`); }
    catch { setMsg("not a valid set file"); }
    if (file.current) file.current.value = "";
  };

  return <div className="node-body">
    <div className="gb-sets">{sets.map((st, i) => <button key={i} className={`gb-set ${sel === i ? "sel" : ""} ${st ? "full" : ""}`} onClick={() => pick(i)} onDoubleClick={() => { pick(i); if (st) { applySet(st); setMsg(`loaded "${st.name}"`); } }}>
      <span className="gb-pad-index">{String(i + 1).padStart(2, "0")}</span><span className="gb-set-name">{st?.name ?? "empty"}</span>{st && <span className="gb-pad-kind">{st.bpm} bpm</span>}
    </button>)}</div>
    <div className="gb-seq-tools" style={{ padding: "8px 0 0", flexWrap: "wrap" }}>
      <input className="gb-input" aria-label="Set name" value={name} maxLength={24} onChange={e => setName(e.target.value)} style={{ width: 120 }} />
      <Button variant="ghost" size="sm" onClick={save}><Save size={12} /> save</Button>
      <Button variant="ghost" size="sm" disabled={!sets[sel]} onClick={load}><Upload size={12} /> load</Button>
      <Button variant="ghost" size="sm" disabled={!sets[sel]} onClick={del}><Trash2 size={12} /> clear</Button>
      <Button variant="ghost" size="sm" onClick={exportSet}><Download size={12} /> export</Button>
      <Button variant="ghost" size="sm" onClick={() => file.current?.click()}><Upload size={12} /> import</Button>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => void importSet(e.target.files?.[0])} />
    </div>
    <span className="patch-small">{msg || "tap a slot · save / load · double-tap to load · imported sample files aren't stored"}</span>
  </div>;
}
