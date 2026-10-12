import { useRef, useState } from "react";
import PixelScreen, { Tap } from "@/pixel/PixelScreen";
import type { Px } from "@/pixel/draw";
import type { Slot } from "@/hooks/useGroovebox";
import { packSamples, unpackSamples } from "@/audio/sampleStore";
import { PATCH_KEY, capturePatch, newId, parsePatchFile, readPatches, samplesOf, uniqueName, type Patch, type PatchSound } from "@/audio/patchStore";

const TAG: Record<string, string> = { drum: "DRM", synth: "SYN", sampler: "SMP", poly: "PLY", "808": "808", siren: "SRN" };
const BTNS = ["SAVE", "OVR", "LOAD", "REN", "DUP", "DEL"] as const, BTNS2 = ["EXP", "BANK", "IMP"] as const;
const ROWS = 4;

// PATCH: per-pad sound + FX rack presets, as a 128x64 1-bit screen.
export default function PatchBank({ getPatch, applyPatch }: { getPatch: () => Slot; applyPatch: (p: PatchSound) => void }) {
  const [patches, setPatches] = useState(readPatches);
  const [sel, setSel] = useState(0), [top, setTop] = useState(0), [all, setAll] = useState(true);
  const [name, setName] = useState("PATCH"), [msg, setMsg] = useState(""), [confirm, setConfirm] = useState<"" | "OVR" | "DEL">("");
  const file = useRef<HTMLInputElement>(null), lastTap = useRef({ i: -1, t: 0 });
  const cur = getPatch();
  const list = all ? patches : patches.filter(p => p.engine === cur.engine);
  const chosen = list[sel];
  const store = (next: Patch[]) => { try { localStorage.setItem(PATCH_KEY, JSON.stringify(next)); setPatches(next); return true; } catch { setMsg("storage full"); return false; } };
  const names = () => patches.map(p => p.name);
  const download = (data: unknown, fname: string) => { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = fname; a.click(); URL.revokeObjectURL(url); };
  const pack = async (ps: Patch[]) => { try { return await packSamples(samplesOf(ps)); } catch { return {}; } };
  const select = (i: number) => { setSel(i); setConfirm(""); if (list[i]) setName(list[i].name); if (i < top) setTop(i); else if (i >= top + ROWS) setTop(i - ROWS + 1); };

  const act = async (b: string) => {
    setMsg("");
    if (b === "SAVE") { const p = capturePatch(getPatch(), uniqueName(name.trim() || "PATCH", names())); if (store([...patches, p])) { setAll(true); select(patches.length); setName(p.name); setMsg("saved"); } return; }
    if (b === "IMP") { file.current?.click(); return; }
    if (b === "BANK") { if (!patches.length) return; download({ kind: "nad-patch-bank", v: 1, patches, samples: await pack(patches) }, "nadrisk-patch-bank.nadpatch.json"); setMsg("bank exported"); return; }
    if (!chosen) return;
    const at = patches.findIndex(p => p.id === chosen.id);
    if (b === "LOAD") { applyPatch(chosen.sound); setMsg("loaded"); }
    else if (b === "OVR") { if (confirm !== "OVR") { setConfirm("OVR"); setMsg("tap OVR again"); return; } const n = patches.slice(); n[at] = { ...capturePatch(getPatch(), chosen.name), id: chosen.id }; if (store(n)) setMsg("overwritten"); setConfirm(""); }
    else if (b === "DEL") { if (confirm !== "DEL") { setConfirm("DEL"); setMsg("tap DEL again"); return; } if (store(patches.filter(p => p.id !== chosen.id))) { setMsg("deleted"); select(Math.max(0, sel - 1)); } setConfirm(""); }
    else if (b === "REN") { const nm = uniqueName(name.trim() || chosen.name, names().filter(x => x !== chosen.name)); const n = patches.slice(); n[at] = { ...chosen, name: nm }; if (store(n)) { setName(nm); setMsg("renamed"); } }
    else if (b === "DUP") { const p = { ...chosen, id: newId(), name: uniqueName(chosen.name, names()), sound: JSON.parse(JSON.stringify(chosen.sound)) }; const n = patches.slice(); n.splice(at + 1, 0, p); if (store(n)) { select(sel + 1); setMsg("copied"); } }
    else if (b === "EXP") { download({ kind: "nad-patch", v: 1, patch: chosen, samples: await pack([chosen]) }, `${chosen.name.replace(/[^\w-]+/g, "_")}.nadpatch.json`); setMsg("exported"); }
  };
  const importFile = async (f?: File) => {
    if (!f) return;
    try { const r = parsePatchFile(JSON.parse(await f.text()), names()); if (!r) throw 0; try { await unpackSamples(r.samples); } catch { /* sounds still import */ }
      if (store([...patches, ...r.patches])) { setAll(true); select(patches.length); setMsg(`+${r.patches.length} imported`); } }
    catch { setMsg("not a patch file"); }
    if (file.current) file.current.value = "";
  };
  const tapRow = (k: number) => { const i = top + k; if (!list[i]) return; const now = Date.now(); if (lastTap.current.i === i && now - lastTap.current.t < 350) { applyPatch(list[i].sound); setMsg("loaded"); } else select(i); lastTap.current = { i, t: now }; };

  const draw = (p: Px) => {
    p.invert(0, 0, 128, 9); p.text("PATCH", 2, 2, false);
    p.text((msg || `${list.length ? sel + 1 : 0}/${list.length}`).slice(0, 13).toUpperCase(), 26, 2, false);
    p.box(104, 0, 24, 9); p.rect(105, 1, 22, 7, false); p.text(all ? "ALL" : TAG[cur.engine], 108, 2);
    for (let k = 0; k < ROWS; k++) { const i = top + k, pt = list[i], y = 11 + k * 9; if (!pt) continue; const on = i !== sel;
      if (!on) p.invert(1, y - 1, 116, 9); p.text(pt.name.slice(0, 20).toUpperCase(), 3, y, on); p.text(TAG[pt.engine] ?? "", 104, y, on); }
    if (!list.length) p.text("NO PATCHES · SAVE", 3, 20);
    p.box(119, 10, 8, 18); p.box(119, 29, 8, 18); for (let r = 0; r < 3; r++) { p.line(123 - r, 17 + r, 123 + r, 17 + r); p.line(123 - r, 39 - r, 123 + r, 39 - r); }
    BTNS.forEach((b, i) => { const x = 1 + i * 21; p.box(x, 46, 20, 8); p.text(b === confirm ? "OK?" : b, x + 2, 47); });
    BTNS2.forEach((b, i) => { const x = 1 + i * 42; p.box(x, 55, 41, 8); p.textC(b, x + 20, 56); });
  };

  return <div className="node-body">
    <div className="px-panel">
      <PixelScreen label="Patch presets screen" draw={draw} deps={[patches, sel, top, all, msg, confirm, cur.engine]}>
        <Tap x={104} y={0} w={24} h={9} label="Patch filter" pressed={!all} onClick={() => { setAll(a => !a); setSel(0); setTop(0); }} />
        {Array.from({ length: ROWS }, (_, k) => <Tap key={k} x={1} y={10 + k * 9} w={116} h={9} label={`Patch row ${k + 1}${list[top + k] ? ` ${list[top + k].name}` : " empty"}`} pressed={top + k === sel} onClick={() => tapRow(k)} />)}
        <Tap x={119} y={10} w={8} h={18} label="Patch list up" onClick={() => list.length && select(Math.max(0, sel - 1))} />
        <Tap x={119} y={29} w={8} h={18} label="Patch list down" onClick={() => list.length && select(Math.min(list.length - 1, sel + 1))} />
        {BTNS.map((b, i) => <Tap key={b} x={1 + i * 21} y={45} w={20} h={9} label={`Patch ${b.toLowerCase()}`} disabled={b !== "SAVE" && !chosen} onClick={() => void act(b)} />)}
        {BTNS2.map((b, i) => <Tap key={b} x={1 + i * 42} y={55} w={41} h={9} label={b === "EXP" ? "Export patch" : b === "BANK" ? "Export patch bank" : "Import patches"} disabled={(b === "EXP" && !chosen) || (b === "BANK" && !patches.length)} onClick={() => void act(b)} />)}
      </PixelScreen>
    </div>
    <div className="gb-seq-tools" style={{ padding: "8px 0 0", flexWrap: "wrap" }}>
      <input className="gb-input" aria-label="Patch name" value={name} maxLength={24} onChange={e => setName(e.target.value)} style={{ width: 140 }} />
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => void importFile(e.target.files?.[0])} />
    </div>
    <span className="patch-small">{msg || "SAVE stores this pad's sound + FX · double-tap a row to load · REN uses the name box · BANK exports all"}</span>
  </div>;
}
