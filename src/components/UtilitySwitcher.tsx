import { useRef } from "react";
import { Button } from "@/components/ui/button";

export const UTILITY_BANKS = {
  sound: ["fx", "phrase", "seq", "mixer", "master"],
  sys: ["tape", "sets", "patch", "midi"],
} as const;
export const UTILITIES = [...UTILITY_BANKS.sound, ...UTILITY_BANKS.sys];
export type Utility = typeof UTILITIES[number];
export const INITIAL_UTILITY: Utility = "fx";
type Bank = keyof typeof UTILITY_BANKS;
export const UTILITY_LABELS: Record<Utility, string> = { fx: "FX", phrase: "PHRASE", seq: "SEQ", mixer: "MIX", master: "MASTER", tape: "TAPE", sets: "MEM", midi: "MIDI", patch: "PATCH" };
export function utilityBank(value: Utility): Bank {
  return UTILITY_BANKS.sound.some(item => item === value) ? "sound" : "sys";
}

export default function UtilitySwitcher({ value, onChange, perfOpen, onPerformance }: {
  value: Utility; onChange: (value: Utility) => void; perfOpen: boolean; onPerformance: () => void;
}) {
  const bank = utilityBank(value);
  const last = useRef<Record<Bank, Utility>>({ sound: "fx", sys: "tape" });
  last.current[bank] = value;
  return <nav className="gb-utility-switcher" aria-label="Utility workspace" data-midi-ui>
    <div className="gb-utility-bankbar">
      <span className="gb-utility-current">{UTILITY_LABELS[value]}</span>
      <div className="gb-utility-banks" role="group" aria-label="Utility bank">
        {(["sound", "sys"] as const).map(key => <Button key={key} variant="outline" aria-pressed={bank === key} onClick={() => onChange(last.current[key])}>{key.toUpperCase()}</Button>)}
      </div>
      <Button variant="outline" className="gb-perf-launch" aria-label="Performance mode" aria-pressed={perfOpen} onClick={onPerformance}>PERF <span aria-hidden="true">▶</span></Button>
    </div>
    <div className={`gb-utility-nav gb-utility-nav-${bank}`}>
      {UTILITY_BANKS[bank].map(key => <Button variant="outline" key={key} aria-pressed={value === key} onClick={() => onChange(key)}>{UTILITY_LABELS[key]}</Button>)}
    </div>
  </nav>;
}