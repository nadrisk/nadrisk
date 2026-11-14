import MonkeSprite from "./MonkeSprite";
import type { useMonke } from "@/hooks/useMonke";
/** Full-screen face on enter/exit only; while working, Monke lives inside the step grid next to the note he edits. */
export default function MonkeVisitor({ monke }: { monke: ReturnType<typeof useMonke> }) {
  const v = monke.visit;
  if (!v || v.phase === "work") return null;
  return <div className="monke-flash" aria-hidden="true"><MonkeSprite laughing={v.phase === "exit"} /></div>;
}
