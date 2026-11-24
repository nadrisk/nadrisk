import { Plus, X } from "lucide-react";
import { Button } from "./ui/button";
import { PxSelect } from "./PxSelect";
import { FX_DEFS, type FxUnit } from "@/audio/effects";
import { macroParamsOf, type FxMacroMapping } from "@/audio/fxMacro";

export type MacroOwner = { id: string; label: string; fx: FxUnit[] };
export function FxMacroRack({ owners, mappings, onChange }: { owners: MacroOwner[]; mappings: FxMacroMapping[]; onChange: (m: FxMacroMapping[]) => void }) {
  const targets = owners.flatMap(o => o.fx.filter(f => f.on).flatMap(f => macroParamsOf(f.type).map(param => ({ owner: o.id, fx: f.id, param, key: `${o.id}:${f.id}:${param}`, label: `${o.label} · ${FX_DEFS[f.type].label.replace("~", "")} · ${param.toUpperCase()}` }))));
  const make = (t: typeof targets[number], axis: "x" | "y"): FxMacroMapping => ({ id: crypto.randomUUID(), owner: t.owner, fx: t.fx, param: t.param, axis, depth: .5 });
  const edit = (id: string, p: Partial<FxMacroMapping>) => onChange(mappings.map(m => m.id === id ? { ...m, ...p } : m));
  return <div className="fx-macro-rack" role="group" aria-label="Effect macro assignments">
    <div className="fx-macro-head"><span>X {mappings.filter(m => m.axis === "x").length} · Y {mappings.filter(m => m.axis === "y").length}</span>
      <Button variant="ghost" className="rune-edit-btn" disabled={!targets.length} aria-label="Auto assign effect macros" onClick={() => {
        const added: FxMacroMapping[] = [];
        for (const o of owners) for (const f of o.fx.filter(f => f.on)) {
          const space = ["reverb", "delay", "digi", "reverseDelay", "chorus", "flanger", "phaser"].includes(f.type);
          const param = (space ? ["mix", "send", "depth"] : ["metal", "drive", "sweep", "morph", "short", "amt", "depth", "mix"]).find(p => macroParamsOf(f.type).includes(p));
          const t = targets.find(t => t.owner === o.id && t.fx === f.id && t.param === param);
          if (t && !mappings.some(m => m.owner === t.owner && m.fx === t.fx && m.param === t.param)) added.push(make(t, space ? "y" : "x"));
        }
        onChange([...mappings, ...added]);
      }}>AUTO</Button>
      <Button variant="ghost" className="rune-edit-btn" disabled={!targets.length} title="Add effect target" aria-label="Add effect macro target" onClick={() => { const t = targets.find(t => !mappings.some(m => m.owner === t.owner && m.fx === t.fx && m.param === t.param)) ?? targets[0]; if (t) onChange([...mappings, make(t, "x")]); }}><Plus size={14} /></Button>
    </div>
    {!targets.length && <div className="fx-macro-empty">NO ACTIVE EFFECTS</div>}
    <div className="fx-macro-rows">{mappings.map((m, i) => <div className="fx-macro-row" key={m.id}>
      <Button variant="ghost" className="rune-edit-btn" aria-label={`Macro ${i + 1} axis ${m.axis.toUpperCase()}`} onClick={() => edit(m.id, { axis: m.axis === "x" ? "y" : "x" })}>{m.axis.toUpperCase()}</Button>
      <PxSelect label={`Macro ${i + 1} target`} value={`${m.owner}:${m.fx}:${m.param}`} options={[[`${m.owner}:${m.fx}:${m.param}`, "UNAVAILABLE"], ...targets.map(t => [t.key, t.label] as [string, string])].filter((t, j, a) => j !== 0 || !a.slice(1).some(v => v[0] === t[0])) as [string, string][]} onChange={v => { const t = targets.find(t => t.key === v); if (t) edit(m.id, { owner: t.owner, fx: t.fx, param: t.param }); }} />
      <Button variant="ghost" className="rune-edit-btn" aria-label={`Macro ${i + 1} polarity`} title="Invert direction" onClick={() => edit(m.id, { depth: -m.depth })}>{m.depth < 0 ? "−" : "+"}</Button>
      <PxSelect label={`Macro ${i + 1} depth`} value={String(Math.abs(m.depth))} options={[.25, .5, .75, 1].map(v => [String(v), `${v * 100}%`])} onChange={v => edit(m.id, { depth: Number(v) * (m.depth < 0 ? -1 : 1) })} />
      <Button variant="ghost" className="rune-edit-btn" title="Remove mapping" aria-label={`Remove macro ${i + 1}`} onClick={() => onChange(mappings.filter(x => x.id !== m.id))}><X size={14} /></Button>
    </div>)}</div>
  </div>;
}