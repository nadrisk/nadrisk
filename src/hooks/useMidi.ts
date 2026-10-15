import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** MIDI learn: any labelled control inside the groovebox can be bound to a CC or note. Unmapped notes 36-51 play pads 1-16. */
type Maps = Record<string, string>;
const KEY = "nadrisk.midi.v1";
type MidiIn = { name?: string | null; onmidimessage: ((e: { data: Uint8Array }) => void) | null };
type MidiAccess = { inputs: Map<string, MidiIn>; onstatechange: (() => void) | null };

// Synthetic pointer events: pointer capture is stubbed so the control's own handlers accept them.
function fire(el: HTMLElement, type: string, x: number, y: number) {
  const holder = el as unknown as { setPointerCapture: () => void }; holder.setPointerCapture = () => {};
  const focus = HTMLElement.prototype.focus; HTMLElement.prototype.focus = function (o?: FocusOptions) { focus.call(this, { ...o, preventScroll: true }); };
  try { el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 77, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerdown" ? 1 : 0 })); }
  finally { delete (holder as Partial<typeof holder>).setPointerCapture; HTMLElement.prototype.focus = focus; }
}
const isSlider = (el: HTMLElement) => el.hasAttribute("data-orientation") && !!el.querySelector('[role="slider"]');
const isHold = (el: HTMLElement) => el.classList.contains("gb-pad") || /^Hold /.test(el.getAttribute("aria-label") ?? "");

export function useMidi(root: RefObject<HTMLElement>, hit: (i: number) => void, release: (i: number) => void, keyOn?: (note: number, v: number) => void, keyOff?: (note: number) => void) {
  const [keys, setKeys] = useState(() => localStorage.getItem(KEY + ".keys") === "1");
  const [maps, setMaps] = useState<Maps>(() => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } });
  const [learn, setLearn] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [devices, setDevices] = useState<string[] | null>(null);
  const [status, setStatus] = useState("");
  const st = useRef({ maps, learn, target, hit, release, keys, keyOn, keyOff, last: {} as Record<string, number> });
  st.current = { ...st.current, maps, learn, target, hit, release, keys, keyOn, keyOff };
  useEffect(() => { localStorage.setItem(KEY + ".keys", keys ? "1" : "0"); }, [keys]);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(maps)); }, [maps]);

  // Learn mode: tapping a control selects it instead of using it.
  useEffect(() => {
    const el = root.current; if (!el || !learn) return;
    const pick = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[aria-label]");
      if (!t || !el.contains(t) || t.closest("[data-midi-ui]")) return;
      e.preventDefault(); e.stopPropagation();
      if (e.type === "pointerdown") setTarget(t.getAttribute("aria-label"));
    };
    ["pointerdown", "click"].forEach(ev => el.addEventListener(ev, pick, true));
    return () => ["pointerdown", "click"].forEach(ev => el.removeEventListener(ev, pick, true));
  }, [learn, root]);

  // Outline mapped controls and the one waiting for a MIDI message while learning.
  useEffect(() => {
    const el = root.current; if (!el) return;
    el.querySelectorAll("[data-midi-mapped],[data-midi-target]").forEach(n => { n.removeAttribute("data-midi-mapped"); n.removeAttribute("data-midi-target"); });
    if (!learn) return;
    const labels = new Set(Object.values(maps));
    el.querySelectorAll<HTMLElement>("[aria-label]").forEach(n => { const l = n.getAttribute("aria-label")!; if (labels.has(l)) n.setAttribute("data-midi-mapped", ""); if (l === target) n.setAttribute("data-midi-target", ""); });
  }, [learn, maps, target, root]);

  const act = useCallback((label: string, kind: "cc" | "on" | "off", v: number, key: string) => {
    const el = root.current?.querySelector<HTMLElement>(`[aria-label="${CSS.escape(label)}"]`); if (!el) return;
    const f = v / 127;
    if (el.hasAttribute("data-midi-value")) {
      if (kind !== "off") el.dispatchEvent(new CustomEvent("midivalue", { detail: f }));
    } else if (isSlider(el)) {
      if (kind === "off") return;
      const r = el.getBoundingClientRect(), vert = el.getAttribute("data-orientation") === "vertical";
      fire(el, "pointerdown", vert ? r.left + r.width / 2 : r.left + f * r.width, vert ? r.bottom - f * r.height : r.top + r.height / 2); fire(el, "pointerup", 0, 0);
    } else if (el instanceof HTMLSelectElement) {
      if (kind !== "cc" || !el.options.length) return;
      const idx = Math.round(f * (el.options.length - 1)); if (el.selectedIndex === idx) return;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(el, el.options[idx].value);
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      const prev = st.current.last[key] ?? 0; st.current.last[key] = v;
      const down = kind === "on" || (kind === "cc" && v >= 64 && prev < 64), up = kind === "off" || (kind === "cc" && v < 64 && prev >= 64);
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (isHold(el)) { if (down) fire(el, "pointerdown", x, y); else if (up) fire(el, "pointerup", x, y); }
      else if (down) el.click();
    }
  }, [root]);

  const onMsg = useCallback((e: { data: Uint8Array }) => {
    const [s0, d1, d2 = 0] = e.data, type = s0 & 0xf0, ch = s0 & 0x0f;
    const on = type === 0x90 && d2 > 0, off = type === 0x80 || (type === 0x90 && d2 === 0), cc = type === 0xb0;
    if (!on && !off && !cc) return;
    const key = cc ? `cc:${ch}:${d1}` : `note:${ch}:${d1}`, c = st.current;
    if (c.learn) { if (c.target && (cc || on)) { const t = c.target; setMaps(m => ({ ...m, [key]: t })); setTarget(null); setStatus(`${t} → ${cc ? "CC" : "note"} ${d1}`); } return; }
    const label = c.maps[key];
    if (label) return act(label, cc ? "cc" : on ? "on" : "off", cc ? d2 : on ? d2 : 0, key);
    if (!cc && c.keys && c.keyOn) { if (on) c.keyOn(d1, d2 / 127); else c.keyOff?.(d1); return; }
    if (!cc && d1 >= 36 && d1 <= 51) { if (on) c.hit(d1 - 36); else c.release(d1 - 36); }
  }, [act]);

  const connect = useCallback(async () => {
    const nav = navigator as Navigator & { requestMIDIAccess?: () => Promise<MidiAccess> };
    if (!nav.requestMIDIAccess) { setStatus("This browser has no MIDI support (iPad Safari doesn't). Try Chrome or Edge on a computer or Android."); return; }
    try {
      const a = await nav.requestMIDIAccess();
      const bind = () => { const names: string[] = []; a.inputs.forEach(i => { i.onmidimessage = onMsg; names.push(i.name || "MIDI in"); }); setDevices(names); };
      bind(); a.onstatechange = bind; setStatus("");
    } catch { setStatus("MIDI access was blocked."); }
  }, [onMsg]);

  const unmap = useCallback((label: string) => setMaps(m => Object.fromEntries(Object.entries(m).filter(([, v]) => v !== label))), []);
  return { keys, setKeys, maps, learn, setLearn: (v: boolean) => { setLearn(v); setTarget(null); }, target, devices, status, connect, clear: () => setMaps({}), unmap };
}
