import { memo } from "react";
import type { Slot } from "@/hooks/useGroovebox";
import WispdiskPanel from "@/components/WispdiskPanel";
import CyberspacePanel from "@/components/CyberspacePanel";
import DrumkitPanel from "@/components/DrumkitPanel";
import Sub808Panel from "@/components/Sub808Panel";
import SirenPanel from "@/components/SirenPanel";
import EnsemblePanel from "@/components/EnsemblePanel";
import { SlotScreen, ChordScreen, ChannelEqScreen } from "@/components/SlotScreens";
import LibraryScreen from "@/components/LibraryScreen";

function SlotEditor({ slot, peaks, onChange, onLoad, onLoadId, onLoadFolder }: { slot: Slot; peaks: number[] | null; onChange: (p: Partial<Slot>) => void; onLoad: (f: File) => void; onLoadId: (id: string, name: string) => void; onLoadFolder: (f: File[]) => Promise<{ total: number; matched: number }> }) {
  const sm = slot.sampler;
  return <div className="node-body gb-editor-body">
    <div className="gb-ed-slot"><SlotScreen slot={slot} onChange={onChange} /></div>
    <div className="gb-ed-main gb-ed-device">
      {slot.engine === "drum" && <DrumkitPanel slot={slot} onChange={onChange} />}
      {slot.engine === "synth" && <CyberspacePanel slot={slot} onChange={onChange} />}
      {slot.engine === "808" && <Sub808Panel slot={slot} onChange={onChange} />}
      {slot.engine === "siren" && <SirenPanel slot={slot} onChange={onChange} />}
      {slot.engine === "poly" && <EnsemblePanel slot={slot} onChange={onChange} />}
      {slot.engine === "sampler" && <WispdiskPanel slot={slot} peaks={peaks} onChange={onChange} />}
    </div>
    <div className="gb-ed-insert gb-ed-device"><ChannelEqScreen slot={slot} onChange={onChange} /></div>
    {(slot.engine === "sampler" || slot.engine === "poly") && <div className="gb-ed-chord gb-ed-device"><ChordScreen slot={slot} onChange={onChange} /></div>}
    {slot.engine === "sampler" && <div className="gb-ed-library gb-ed-device"><LibraryScreen value={sm.sampleId} onPick={onLoadId} onFolder={onLoadFolder} onLoad={onLoad} /></div>}
  </div>;
}

export default memo(SlotEditor);
