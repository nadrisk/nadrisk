import MonkeSprite from "./MonkeSprite";
import type { useMonke } from "@/hooks/useMonke";
export default function MonkeVisitor({ monke }: { monke: ReturnType<typeof useMonke> }) {
  const v = monke.visit;
  if (!v) return null;
  if (v.phase !== "work") return <div className="monke-flash" aria-hidden="true"><MonkeSprite laughing={v.phase === "exit"} /></div>;
  return <div className={`monke-hunt monke-pos-${v.position}`} aria-hidden="true"><MonkeSprite body pose={v.reaction} /></div>;
}
