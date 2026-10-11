import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Grid-owned chassis; the pixel screen retains its header and unique controls. */
export default function DevicePanel({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return <section className={cn("device-panel", className)} aria-label={`${label} device`}>
    <div className="device-panel-content">{children}</div>
  </section>;
}