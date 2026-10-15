import { DRUM_INIT, drumDefaults, type DrumKind, type DrumParams } from './voices';
export type DrumPreset = { id: string; name: string; sound: DrumParams };
const recipe = (kind: DrumKind, id: string, name: string, patch: Partial<DrumParams>): DrumPreset => ({ id, name, sound: { ...drumDefaults(kind), ...DRUM_INIT[kind], ...patch, kind, preset: id, env: { ...DRUM_INIT[kind].env, ...patch.env } } });
export const DRUM_PRESETS: Record<DrumKind, readonly DrumPreset[]> = {
 kick: [
 recipe('kick','ukg','PUNCHY UKG',{pitch:52,pitchEnv:40,pitchDecay:.022,transient:.8,drive:.28,fm:.7,env:{a:.001,d:.22,s:0,r:.04}}),
 recipe('kick','soft','SOFT',{pitch:47,pitchEnv:18,pitchDecay:.055,transient:0,drive:0,noise:0,fm:0,cutoff:650,env:{a:.004,d:.38,s:0,r:.07}}),
 recipe('kick','dusty','DUSTY HIP HOP',{pitch:56,pitchEnv:27,pitchDecay:.04,transient:.25,noise:.09,fm:.35,drive:.35,cutoff:2300,fltBase:32,fltWidth:7,env:{a:.002,d:.27,s:0,r:.06}}),
 recipe('kick','idm','IDM',{pitch:65,pitchEnv:46,pitchDecay:.012,pCurve:.45,fm:3.4,fmRatio:2.17,fmDecay:.035,transient:.65,drive:.22,env:{a:.001,d:.14,s:0,r:.03}}),
 recipe('kick','dnb','DNB',{pitch:95,pitchEnv:36,pitchDecay:.014,transient:.9,drive:.3,fm:.5,env:{a:.001,d:.16,s:0,r:.03}}),
 recipe('kick','dubstep','DUBSTEP',{pitch:52,pitchEnv:30,pitchDecay:.03,transient:.85,drive:.2,fm:.2,env:{a:.001,d:.55,s:0,r:.08}}),
 recipe('kick','hiphop','DUSTY HH 65',{pitch:65,pitchEnv:20,pitchDecay:.045,transient:.2,noise:.06,drive:.3,cutoff:1800,env:{a:.003,d:.32,s:0,r:.06}}),
 recipe('kick','glitch','IDM GLITCH',{pitch:120,pitchEnv:48,pitchDecay:.006,pCurve:.3,fm:4,fmRatio:3.1,fmDecay:.02,transient:.7,drive:.25,env:{a:.001,d:.07,s:0,r:.02}})],
 snare: [
 recipe('snare','tight','TIGHT',{pitch:235,pitchEnv:12,noise:.6,noiseDecay:.085,bodyDecay:.055,env:{a:.001,d:.11,s:0,r:.025}}),
 recipe('snare','fat','DEEP FAT',{pitch:155,pitchEnv:9,tone2:1.42,fm:1.1,noise:.75,noiseTone:2800,noiseDecay:.24,bodyDecay:.18,drive:.3,fltBase:75,env:{a:.001,d:.29,s:0,r:.06}}),
 recipe('snare','ringy','RINGY',{pitch:220,pitchEnv:4,tone2:2.06,fm:.3,noise:.3,noiseDecay:.1,bodyDecay:.42,drive:.1,fltBase:100,env:{a:.001,d:.46,s:0,r:.08}}),
 recipe('snare','pitchy','PITCHY SNAPPY',{pitch:280,pitchEnv:33,pitchDecay:.026,pCurve:.55,fm:2,noise:.65,noiseTone:5500,noiseDecay:.07,bodyDecay:.075,env:{a:.001,d:.12,s:0,r:.025}}),
 recipe('snare','dnb','DNB',{pitch:200,pitchEnv:8,tone2:1.5,noise:.55,noiseTone:6000,noiseDecay:.15,bodyDecay:.3,drive:.15,env:{a:.001,d:.3,s:0,r:.05}}),
 recipe('snare','dubstep','DUBSTEP',{pitch:190,pitchEnv:10,noise:.85,noiseTone:3500,noiseDecay:.3,bodyDecay:.14,drive:.35,env:{a:.001,d:.34,s:0,r:.07}}),
 recipe('snare','hiphop','HIP HOP',{pitch:175,pitchEnv:14,pitchDecay:.03,tone2:1.6,noise:.6,noiseTone:3000,noiseDecay:.16,bodyDecay:.15,drive:.25,env:{a:.001,d:.22,s:0,r:.05}}),
 recipe('snare','glitch','IDM GLITCH',{pitch:380,pitchEnv:40,pitchDecay:.008,pCurve:.4,fm:2.6,noise:.5,noiseTone:7000,noiseDecay:.04,bodyDecay:.04,env:{a:.001,d:.06,s:0,r:.015}})],
 hat: [recipe('hat','closed','CLOSED HAT',{}),
 recipe('hat','open','OPEN HAT',{pitch:460,pitchEnv:0,spread:1.3,fm:3,fmRatio:1.41,noise:.75,ring:.1,transient:.3,drive:.05,filter:'highpass',cutoff:7500,fltBase:5500,fltWidth:1.9,grit:.6,env:{a:.001,d:.35,s:0,r:.1}}),
 recipe('hat','ride','RIDE',{pitch:520,pitchEnv:0,spread:1.35,fm:2,fmRatio:1.41,noise:.3,ring:.3,ringFreq:3800,transient:.5,drive:.05,filter:'highpass',cutoff:5000,fltBase:3200,fltWidth:2.2,grit:.4,env:{a:.001,d:1.4,s:0,r:.25}}),
 recipe('hat','shaker','SHAKER',{pitchEnv:0,fm:0,noise:1,ring:0,transient:0,drive:.05,filter:'bandpass',cutoff:6200,res:.8,fltBase:2200,fltWidth:2,env:{a:.013,d:.13,s:0,r:.03}})],
 clap: [recipe('clap','snap','SHORT SNAP',{noiseTone:1800,cutoff:1900,tone2:3,bursts:1,burstGap:.004,tail:.04,drive:.3,gain:1.8,env:{a:.001,d:.07,s:0,r:.02}}),
 recipe('clap','natural','NATURAL',{noiseTone:1500,cutoff:1800,tone2:1.6,bursts:3,burstGap:.005,tail:.25,drive:.12,gain:1.4,env:{a:.001,d:.14,s:0,r:.03}}),
 recipe('clap','808','TR-808 STYLE',{noiseTone:1300,cutoff:1900,tone2:2.6,bursts:3,burstGap:.008,tail:.4,drive:.2,gain:1.3,env:{a:.001,d:.19,s:0,r:.04}}),
 recipe('clap','sloppy','SLOPPY',{noiseTone:1250,cutoff:1700,tone2:1.2,bursts:4,burstGap:.013,tail:.4,pitchEnv:-3,pitchDecay:.06,drive:.15,gain:1.15,env:{a:.001,d:.24,s:0,r:.06}})]
};
export const drumPreset = (kind: DrumKind, id?: string) => DRUM_PRESETS[kind].find(p => p.id === id);
export const copyDrumPreset = (p: DrumPreset): DrumParams => ({ ...p.sound, env: { ...p.sound.env } });
export function drumPresetEdited(sound: DrumParams, preset: DrumPreset) {
 const actual = { ...drumDefaults(sound.kind), ...sound };
 return Object.entries(preset.sound).some(([key,value]) => key !== 'preset' && (key === 'env' ? Object.entries(preset.sound.env).some(([k,v]) => sound.env[k as keyof typeof sound.env] !== v) : actual[key as keyof typeof actual] !== value));
}
