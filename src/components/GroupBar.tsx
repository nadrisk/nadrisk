import type { GroupBus } from "@/audio/groups";
/** FX target strip: route the selected pad to master or a group bus; grouped pads edit the group's rack. */
export default function GroupBar({ group, bus, onAssign, onBus }: { group: number; bus?: GroupBus; onAssign: (g: number) => void; onBus: (p: Partial<GroupBus>) => void }) {
  const step = (k: "level" | "pan", d: number) => bus && onBus({ [k]: k === "level" ? Math.max(0, Math.min(150, bus.level + d * 5)) : Math.max(-1, Math.min(1, Math.round((bus.pan + d * .1) * 10) / 10)) });
  return <div className="gb-groupbar" role="group" aria-label="Pad output">
    <span className="gb-groupbar-label">OUT</span>
    {["MST", "G1", "G2", "G3", "G4"].map((n, k) => <button key={n} className="gb-cycle" aria-pressed={group === k} aria-label={k ? `Send pad to group ${k}` : "Send pad direct to master"} onClick={() => onAssign(k)}>{n}</button>)}
    {bus && <span className="gb-groupbar-bus">
      <button className="gb-cycle" aria-label={`Group ${group} level down`} onClick={() => step("level", -1)}>◀</button><b>LVL {bus.level}</b><button className="gb-cycle" aria-label={`Group ${group} level up`} onClick={() => step("level", 1)}>▶</button>
      <button className="gb-cycle" aria-label={`Group ${group} pan left`} onClick={() => step("pan", -1)}>◀</button><b>PAN {bus.pan === 0 ? "C" : bus.pan < 0 ? `L${Math.round(-bus.pan * 10)}` : `R${Math.round(bus.pan * 10)}`}</b><button className="gb-cycle" aria-label={`Group ${group} pan right`} onClick={() => step("pan", 1)}>▶</button>
    </span>}
    {bus && <p className="gb-groupbar-note">PAD FX LOCKED · EDITING G{group} RACK</p>}
  </div>;
}
