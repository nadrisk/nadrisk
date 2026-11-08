import { memo } from "react";
import type { Slot } from "@/hooks/useGroovebox";
import WispdiskPanel, { type LiveProps } from "@/components/WispdiskPanel";
import CyberspacePanel from "@/components/CyberspacePanel";
import DrumkitPanel from "@/components/DrumkitPanel";
import IdmPanel from "@/components/IdmPanel";
import PadPanel from "@/components/PadPanel";
import Sub808Panel from "@/components/Sub808Panel";
import XyScreen from "@/components/XyScreen";
import { SlotScreen, ChordScreen, ChannelEqScreen } from "@/components/SlotScreens";
import LibraryScreen from "@/components/LibraryScreen";
import DevicePanel from "@/components/DevicePanel";
import ScopeScreen, { type GetWave } from "@/components/ScopeScreen";
import SpectrumScreen, { type GetSpectrum } from "@/components/SpectrumScreen";
import { cleanOf } from "@/audio/clean";

function SlotEditor({ slot, index = 0, getWave, getSpectrum, getSlices, peaks, onChange, onLoad, onLoadId, onLoadFolder, onCopyBuffer, live }: { onCopyBuffer?: (from: number) => void; live?: LiveProps; slot: Slot; index?: number; getWave?: GetWave; getSpectrum?: GetSpectrum; getSlices?: (i: number, sm: Slot["sampler"]) => number[]; peaks: number[] | null; onChange: (p: Partial<Slot>) => void; onLoad: (f: File) => void; onLoadId: (id: string, name: string) => void; onLoadFolder: (f: File[]) => Promise<{ total: number; matched: number }> }) {
  const sm = slot.sampler, chords = slot.engine === "sampler" || slot.engine === "pad" || (slot.engine === "synth" && cleanOf(slot.synth).voices > 1);
  return <div className="node-body gb-editor-body">
    <DevicePanel className="gb-ed-slot" label="Slot"><SlotScreen slot={slot} index={index} onChange={onChange} onCopyBuffer={onCopyBuffer} /></DevicePanel>
    <DevicePanel className="gb-ed-main gb-ed-device" label={slot.engine === "808" ? "bass" : slot.engine}>
      {slot.engine === "drum" && <DrumkitPanel slot={slot} onChange={onChange} />}
      {slot.engine === "idm" && <IdmPanel slot={slot} onChange={onChange} />}
      {slot.engine === "pad" && <PadPanel slot={slot} onChange={onChange} />}
      {slot.engine === "synth" && <CyberspacePanel slot={slot} onChange={onChange} />}
      {slot.engine === "808" && <Sub808Panel slot={slot} index={index} getWave={getWave} onChange={onChange} />}
      {slot.engine === "sampler" && <WispdiskPanel slot={slot} peaks={peaks} onChange={onChange} getSlices={getSlices ? sm => getSlices(index, sm) : undefined} live={live} />}
    </DevicePanel>
    <DevicePanel className="gb-ed-insert gb-ed-device" label="EQ"><ChannelEqScreen slot={slot} onChange={onChange} index={index} getSpectrum={getSpectrum} noSpectrum={!chords} /></DevicePanel>
    <DevicePanel className="gb-ed-xy gb-ed-device" label="XY"><XyScreen slot={slot} onChange={onChange} /></DevicePanel>
    {slot.engine !== "sampler" && <DevicePanel className="gb-ed-scope gb-ed-device" label="Scope"><ScopeScreen slot={index} name={slot.name} getWave={getWave} /></DevicePanel>}
    {!chords && <DevicePanel className="gb-ed-spectrum gb-ed-device" label="Spectrum"><SpectrumScreen slot={index} name={slot.name} getSpectrum={getSpectrum} /></DevicePanel>}
    {chords && <DevicePanel className="gb-ed-chord gb-ed-device" label="Chord"><ChordScreen slot={slot} onChange={onChange} /></DevicePanel>}
    {slot.engine === "sampler" && <DevicePanel className="gb-ed-library gb-ed-device" label="Library"><LibraryScreen value={sm.sampleId} onPick={onLoadId} onFolder={onLoadFolder} onLoad={onLoad} /></DevicePanel>}
  </div>;
}

export default memo(SlotEditor);
