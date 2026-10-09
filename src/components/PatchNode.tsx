import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function PatchNode({ label, children, className, tag }: { label: string; children: ReactNode; className?: string; tag?: string }) {
  return <section className={cn("patch-node", className)}>
    <div className="node-ports node-inlets"><i /><i /></div>
    <header className="node-heading"><span>{label}</span>{tag && <span className="node-tag">{tag}</span>}</header>
    {children}
    <div className="node-ports node-outlets"><i /><i /></div>
  </section>;
}