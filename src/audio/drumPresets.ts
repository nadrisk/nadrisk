import { DRUM_INIT, drumDefaults, type DrumKind, type DrumParams } from './voices';
export type DrumPreset = { id: string; name: string; sound: DrumParams };
const recipe = (kind: DrumKind, id: string, name: string, patch: Partial<DrumParams>): DrumPreset => ({ id, name, sound: { ...drumDefaults(kind), ...DRUM_INIT[kind], ...patch, kind, preset: id, env: { ...DRUM_INIT[kind].env, ...patch.env } } });
export const DRUM_PRESETS: Record<DrumKind, readonly DrumPreset[]> = {
 kick: [
 recipe('kick','ukg','PUNCHY UKG',{pitch:52,pitchEnv:40,pitchDecay:.022,transient:.8,drive:.28,fm:.7,env:{a:.001,d:.22,s:0,r:.04}}),
 recipe('kick','soft','SOFT',{pitch:47,pitchEnv:18,pitchDecay:.055,transient:0,drive:0,noise:0,fm:0,cutoff:650,env:{a:.004,d:.38,s:0,r:.07}}),
 recipe('kick','dusty','DUSTY HIP HOP',{pitch:56,pitchEnv:27,pitchDecay:.04,transient:.25,noise:.09,fm:.35,drive:.35,cutoff:2300,fltBase:32,fltWidth:7,env:{a:.002,d:.27,s:0,r:.06}}),
 recipe('kick','idm','IDM',{pitch:65,pitchEnv:46,pitchDecay:.012,pCurve:.45,fm:3.4,fmRatio:2.17,fmDecay:.035,transient:.65,drive:.22,env:{a:.001,d:.14,s:0,r:.03}})],
 snare: [
 recipe('snare','tight','TIGHT',{pitch:235,pitchEnv:12,noise:.6,noiseDecay:.085,bodyDecay:.055,env:{a:.001,d:.11,s:0,r:.025}}),
 recipe('snare','fat','DEEP FAT',{pitch:155,pitchEnv:9,tone2:1.42,fm:1.1,noise:.75,noiseTone:2800,noiseDecay:.24,bodyDecay:.18,drive:.3,fltBase:75,env:{a:.001,d:.29,s:0,r:.06}}),
 recipe('snare','ringy','RINGY',{pitch:220,pitchEnv:4,tone2:2.06,fm:.3,noise:.3,noiseDecay:.1,bodyDecay:.42,drive:.1,fltBase:100,env:{a:.001,d:.46,s:0,r:.08}}),
 recipe('snare','pitchy','PITCHY SNAPPY',{pitch:280,pitchEnv:33,pitchDecay:.026,pCurve:.55,fm:2,noise:.65,noiseTone:5500,noiseDecay:.07,bodyDecay:.075,env:{a:.001,d:.12,s:0,r:.025}})],
 hat: [recipe('hat','closed','CLOSED HAT',{}),
 recipe('hat','open','OPEN HAT',{pitch:440,noise:.48,ring:.6,transient:.2,cutoff:6800,fltBase:4800,fltWidth:1.8,env:{a:.001,d:.55,s:0,r:.14}}),
 recipe('hat','ride','RIDE',{pitch:390,pitchEnv:0,spread:.86,fm:1.2,ring:.9,ringFreq:2450,noise:.12,transient:.2,cutoff:3800,fltBase:2500,fltWidth:2.6,drive:.05,env:{a:.001,d:.95,s:0,r:.2}}),
 recipe('hat','shaker','SHAKER',{pitchEnv:0,fm:0,noise:1,ring:0,transient:0,drive:.05,filter:'bandpass',cutoff:6200,res:.8,fltBase:2200,fltWidth:2,env:{a:.013,d:.13,s:0,r:.03}})],
 clap: [recipe('clap','snap','SHORT SNAP',{noiseTone:2100,cutoff:2100,tone2:4,bursts:1,burstGap:.004,tail:.07,drive:.12,env:{a:.001,d:.055,s:0,r:.02}}),
 recipe('clap','natural','NATURAL',{noiseTone:1600,cutoff:1800,tone2:1.3,bursts:4,burstGap:.007,tail:.38,drive:.08,env:{a:.001,d:.18,s:0,r:.04}}),
 recipe('clap','808','TR-808 STYLE',{noiseTone:1050,cutoff:1450,tone2:2.6,bursts:3,burstGap:.011,tail:.6,drive:.18,env:{a:.001,d:.26,s:0,r:.06}}),
 recipe('clap','sloppy','SLOPPY',{noiseTone:1200,cutoff:1700,tone2:1.1,bursts:6,burstGap:.023,tail:.55,pitchEnv:-5,pitchDecay:.07,drive:.16,env:{a:.001,d:.32,s:0,r:.08}})]
};
export const drumPreset = (kind: DrumKind, id?: string) => DRUM_PRESETS[kind].find(p => p.id === id);
export const copyDrumPreset = (p: DrumPreset): DrumParams => ({ ...p.sound, env: { ...p.sound.env } });
export function drumPresetEdited(sound: DrumParams, preset: DrumPreset) {
 const actual = { ...drumDefaults(sound.kind), ...sound };
 return Object.entries(preset.sound).some(([key,value]) => key !== 'preset' && (key === 'env' ? Object.entries(preset.sound.env).some(([k,v]) => sound.env[k as keyof typeof sound.env] !== v) : actual[key as keyof typeof actual] !== value));
}
