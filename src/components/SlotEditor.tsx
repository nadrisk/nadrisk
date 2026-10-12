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
import DevicePanel from "@/components/DevicePanel";

function SlotEditor({ slot, peaks, onChange, onLoad, onLoadId, onLoadFolder }: { slot: Slot; peaks: number[] | null; onChange: (p: Partial<Slot>) => void; onLoad: (f: File) => void; onLoadId: (id: string, name: string) => void; onLoadFolder: (f: File[]) => Promise<{ total: number; matched: number }> }) {
  const sm = slot.sampler;
  return <div className="node-body gb-editor-body">
    <DevicePanel className="gb-ed-slot" label="Slot"><SlotScreen slot={slot} onChange={onChange} /></DevicePanel>
    <DevicePanel className="gb-ed-main gb-ed-device" label={slot.engine}>
      {slot.engine === "drum" && <DrumkitPanel slot={slot} onChange={onChange} />}
      {slot.engine === "synth" && <CyberspacePanel slot={slot} onChange={onChange} />}
      {slot.engine === "808" && <Sub808Panel slot={slot} onChange={onChange} />}
      {slot.engine === "siren" && <SirenPanel slot={slot} onChange={onChange} />}
      {slot.engine === "poly" && <EnsemblePanel slot={slot} onChange={onChange} />}
      {slot.engine === "sampler" && <WispdiskPanel slot={slot} peaks={peaks} onChange={onChange} />}
    </DevicePanel>
    <DevicePanel className="gb-ed-insert gb-ed-device" label="EQ"><ChannelEqScreen slot={slot} onChange={onChange} /></DevicePanel>
    {(slot.engine === "sampler" || slot.engine === "poly") && <DevicePanel className="gb-ed-chord gb-ed-device" label="Chord"><ChordScreen slot={slot} onChange={onChange} /></DevicePanel>}
    {slot.engine === "sampler" && <DevicePanel className="gb-ed-library gb-ed-device" label="Library"><LibraryScreen value={sm.sampleId} onPick={onLoadId} onFolder={onLoadFolder} onLoad={onLoad} /></DevicePanel>}
  </div>;
}

export default memo(SlotEditor);
