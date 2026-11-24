// 1-bit hardware dropdown: replaces native selects so menus match the groovebox look.
import { useEffect, useRef, useState } from "react";

export function PxSelect<T extends string | number>({ value, options, onChange, label, className = "" }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const cur = options.find(o => o[0] === value)?.[1] ?? String(value);
  return <div ref={ref} className={`px-select ${className}`}>
    <button type="button" className="px-select-btn" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(v => !v)}><span>{cur}</span><i aria-hidden>▾</i></button>
    {open && <div className="px-select-menu" role="listbox" aria-label={label}>{options.map(([v, name]) => <button type="button" role="option" aria-selected={v === value} key={String(v)} className={v === value ? "on" : ""} onClick={() => { onChange(v); setOpen(false); }}>{name}</button>)}</div>}
  </div>;
}
