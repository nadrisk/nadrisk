import MonkeSprite from "./MonkeSprite";
import { Button } from "./ui/button";
import type { useMonke } from "@/hooks/useMonke";
export default function MonkeVisitor({ monke }: { monke: ReturnType<typeof useMonke> }) {
  const v = monke.visit;
  if (!v) return null;
  if (v.phase !== "raid") return <div className="monke-flash" aria-hidden="true"><MonkeSprite laughing /></div>;
  return <div className={`monke-hunt monke-pos-${v.position}`}>
    <Button variant="ghost" className="monke-catch" aria-label={v.mode === "periodic" ? "Catch Monke" : "Summoned Monke"} aria-disabled={v.mode === "summon"} onClick={monke.catchMonke}>
      <MonkeSprite key={v.mutations} laughing={v.mutations > 0} />
      {v.mode === "periodic" && <span className="monke-catches" aria-label={`${v.catches} of 5 catches`}>{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < v.catches ? "caught" : ""} />)}</span>}
    </Button>
  </div>;
}
