import MonkeSprite from "./MonkeSprite";
import { useRef } from "react";
import { Button } from "./ui/button";
import type { useMonke } from "@/hooks/useMonke";
export default function MonkeVisitor({ monke }: { monke: ReturnType<typeof useMonke> }) {
  const lastTouch = useRef(0);
  const v = monke.visit;
  if (!v) return null;
  if (v.phase !== "raid") return <div className="monke-flash" aria-hidden="true"><MonkeSprite laughing /></div>;
  return <div className={`monke-hunt monke-pos-${v.position}`}>
    <Button variant="ghost" className="monke-catch" aria-label={v.mode === "periodic" ? "Catch Monke" : "Summoned Monke"} aria-disabled={v.mode === "summon"} onPointerDown={e => { if (e.pointerType !== "mouse") { e.preventDefault(); e.stopPropagation(); lastTouch.current = Date.now(); monke.catchMonke(); } }} onClick={e => { if (e.detail === 0 || Date.now() - lastTouch.current > 800) monke.catchMonke(); }}>
      <MonkeSprite body pose={v.reaction} />
      {v.mode === "periodic" && <span className="monke-catches" aria-label={`${v.catches} of ${v.requiredCatches} catches`}>{Array.from({ length: v.requiredCatches }, (_, i) => <i key={i} className={i < v.catches ? "caught" : ""} />)}</span>}
    </Button>
  </div>;
}
