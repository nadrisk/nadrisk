import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default function MemoryWorkspace({ sets, patches }: { sets: ReactNode; patches: ReactNode }) {
  const [page, setPage] = useState<"sets" | "patches">("sets");
  return <div className="gb-memory-workspace">
    <nav className="gb-memory-tabs" aria-label="Memory bank view">
      <Button variant="ghost" aria-pressed={page === "sets"} onClick={() => setPage("sets")}>SETS</Button>
      <Button variant="ghost" aria-pressed={page === "patches"} onClick={() => setPage("patches")}>PATCHES</Button>
    </nav>
    <div hidden={page !== "sets"}>{sets}</div>
    <div hidden={page !== "patches"}>{patches}</div>
  </div>;
}