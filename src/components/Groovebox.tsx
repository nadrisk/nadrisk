import MainFaceplate from "./MainFaceplate";
import { defaultSurface, hydrateSurface, type SurfaceState } from "@/audio/surfaceState";
import { useSurfaceBuses } from "@/hooks/useSurfaceBuses";
import { TOPO_DEFAULT, type Topo } from "@/audio/topomap";
import type { GrooveSet } from "@/hooks/useGroovebox";
import { gatedLoop, pokeAudio, setTransportPlaying } from "@/lib/frameGate";
import AboutSection from "@/components/AboutSection";
import StartupFlash from "@/components/StartupFlash";
import { HelpContent, WelcomeContent } from "@/components/InfoOverlays";
import { markWelcomeSeen, readWelcomeSeen, shouldShowWelcome } from "@/lib/welcome";
import MalfunctionOverlay from "@/components/MalfunctionOverlay";
import AcidOverlay from "@/components/AcidOverlay";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { isLicensedHost } from "@/lib/origin";
import { inputSignal } from "@/lib/fingerprint";
import { totalFxLoad, groupOf } from "@/audio/groups";
import GroupBar from "./GroupBar";
import { memo, useCallback, useContext, useEffect, useMemo, useRef, useLayoutEffect, useState } from "react";
import { targets, type DeckId, type Target } from "@/link/deck";
import { defaultPerformance, type PerformanceParams } from "@/audio/performance";
import { useMidi } from "@/hooks/useMidi";
import type { MutableRefObject } from "react";
import { AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResetScope } from "@/components/ui/slider";
import TapeDeck from "./TapeDeck";
import { useTapeRecorder } from "@/hooks/useTapeRecorder";
import { useGroovebox } from "@/hooks/useGroovebox";
import type { FxUnit } from "@/audio/effects";
import { phraseCharacter } from "@/audio/arp";
import { MasterScreen, MidiScreen } from "@/components/HwScreens";
import SlotEditor from "./SlotEditor";
import DevicePanel from "./DevicePanel";
import FxChain from "./FxChain";
import ArpEditor from "./ArpEditor";
import { HarmonyContext } from "./harmonyKnob";
import { HARMONY_SCALES, phraseSemi, modPitchNote, modPitchOffset, degreeLabel } from "@/audio/harmony";
import { noteName } from "@/audio/arp";
import { useQwerty } from "@/hooks/useQwerty";
import { NOTE_NAMES } from "@/audio/arp";
import type { ArpParams } from "@/audio/arp";
import Waveform from "./Waveform";
import PatchBank from "@/components/PatchBank";
import SetBank from "./SetBank";
import PerfXY from "@/components/PerfXY";
import PerformanceRack from "./PerformanceRack";
import PerfLink from "./PerfLink";
import { useLink } from "@/link/useLink";
import { useCrate, CrateEngines } from "./CrateDecks";
import { tapeBus } from "@/audio/tapeBus";
const noopPlay = () => {};
import { FX_DEFS, MOD_LABEL, modParamsOf } from "@/audio/effects";
import type { StepVal } from "@/hooks/useGroovebox";
import { DisplayThemeContext } from "@/pixel/PixelScreen";
import VjOverlay from "@/vj/VjOverlay";
import { vjListen, vjSend } from "@/vj/bus";
import { DISPLAY_THEMES, nextDisplayTheme, type DisplayTheme } from "@/lib/displayTheme";

export default function Groovebox({ theme, onThemeChange }: { theme: DisplayTheme; onThemeChange: (theme: DisplayTheme) => void }) {
  const g = useGroovebox();
  const [surface, setSurface] = useState<SurfaceState>(defaultSurface);
  const [plate, setPlate] = useState<null | "sound" | "fx" | "master" | "sets" | "midi" | "tape">(null);
  const plateRef = useRef<HTMLDivElement>(null);
  useSurfaceBuses(g.engine, g.playing, surface, g.bpm);
  useEffect(() => {
    if (!plate) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = plateRef.current; el?.querySelector<HTMLElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlate(null);
      if (e.key !== "Tab" || !el) return;
      const nodes = Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled), select, input:not([type="hidden"]), [tabindex="0"]')).filter(n => n.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", key); return () => { window.removeEventListener("keydown", key); prev?.focus(); };
  }, [plate]);
  const rootRef = useRef<HTMLElement>(null);
  const perfRef = useRef<HTMLDivElement>(null);
  const [acid, setAcid] = useState(false);
  const gHit = g.hit;
  const hit = useCallback((...args: Parameters<typeof gHit>) => { pokeAudio(); return gHit(...args); }, [gHit]) as typeof gHit;
  // Row-name audition: a short tap of the pad (held engines release after 250 ms).
  const gRelease = g.release;
  const audition = useCallback((i: number) => { hit(i); setTimeout(() => gRelease(i), 250); }, [hit, gRelease]);
  useEffect(() => { setTransportPlaying(g.playing); }, [g.playing]);
  const [vj, setVj] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const localPads = useMemo(() => g.slots.map(x => ({ name: x.name, mute: x.mute, solo: x.solo })), [g.slots]);
  const crate = useCrate();
  const netLink = useLink({ playing: g.playing, bpm: g.bpm, setBpm: g.setBpm, setDeckOut: g.setDeckOut, out: () => g.getMasterDyn()?.out ?? -60,
    ensure: g.ensure, startAt: g.startAt, stop: g.stopLinked, nudgeTempo: g.nudgeTempo, stepNow: g.stepNow,
    pads: localPads, bank: g.bank, queued: g.queued, performance: g.performance, toggleMute: g.toggleMute, toggleSolo: g.toggleSolo, unmuteAll: g.unmuteAll, selectBank: g.selectBank, setPerformance: g.setPerformance });
  const link = crate.on ? crate.link : netLink;
  // Mixer role: mutes/banks act on one chosen deck, XY + FX on A, B or BOTH; solo/deck roles keep the local groovebox.
  const [muteDeck, setMuteDeck] = useState<DeckId>("A");
  const [fxTarget, setFxTarget] = useState<Target>("A");
  const isMixer = link.role === "mixer";
  const localRack = { value: g.performance, onChange: g.setPerformance, bank: g.bank, queued: g.queued, selectBank: g.selectBank, pads: localPads, toggleMute: g.toggleMute, toggleSolo: g.toggleSolo, unmuteAll: g.unmuteAll };
  const muteSt = link.decks[muteDeck];
  const muteRack = isMixer ? { value: muteSt?.perf ?? defaultPerformance(), onChange: (p: PerformanceParams) => muteSt && link.setRemotePerf(muteDeck, p, muteSt.perf), bank: muteSt?.bank ?? 0, queued: muteSt?.queued ?? null, selectBank: (b: number) => link.ctl(muteDeck, "bank", b), pads: muteSt?.pads.length ? muteSt.pads : localPads.map(p => ({ name: p.name, mute: false, solo: false })), toggleMute: (i: number) => link.ctl(muteDeck, "mute", i), toggleSolo: (i: number) => link.ctl(muteDeck, "solo", i), unmuteAll: () => link.ctl(muteDeck, "unmute") } : localRack;
  const fxBase = targets(fxTarget).map(d => link.decks[d]).find(Boolean) ?? null;
  const fxRack = isMixer ? { ...muteRack, value: fxBase?.perf ?? defaultPerformance(), onChange: (p: PerformanceParams) => fxBase && link.setRemotePerf(fxTarget, p, fxBase.perf) } : localRack;
  const targetBar = (opts: Target[], v: Target, set: (t: Target) => void, what: string) => <div className="lk-target" role="group" aria-label={`${what} target`}>{opts.map(t => <button key={t} className="gb-cycle" aria-label={`${what} target ${t}`} aria-pressed={v === t} disabled={t !== "BOTH" && !link.decks[t as DeckId]} onClick={() => set(t)}>{t}</button>)}</div>;
  useEffect(() => { if (!perfOpen) return; document.body.classList.add("perf-lock"); return () => document.body.classList.remove("perf-lock"); }, [perfOpen]);
  // Feed the VJ (overlay or TV window): theme on request, master level at ~30 Hz.
  useEffect(() => { vjSend({ t: "theme", theme }); return vjListen(m => { if (m.t === "hello") vjSend({ t: "theme", theme }); }); }, [theme]);
  useEffect(() => {
    let sm = 0; const id = window.setInterval(() => {
      const a = g.engine.current?.analyser; if (!a) return;
      const d = a.getValue() as Float32Array; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * d[i];
      sm = Math.max(Math.min(1, Math.sqrt(s / (d.length / 4)) * 2.5), sm * 0.85); vjSend({ t: "level", v: sm });
    }, 33); return () => window.clearInterval(id);
  }, [g.engine]);
  // Mount only the layout actually shown, so hidden desktop/phone trees don't run duplicate monitors.
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_MQ).matches);
  useEffect(() => { const m = window.matchMedia(DESKTOP_MQ), on = () => setDesktop(m.matches); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, []);
  const midi = useMidi(rootRef, hit, g.release, g.keyOn, g.keyOff, perfRef, perfOpen);
  const [qwerty, setQwerty] = useState(false);
  useQwerty(qwerty, { hit, release: g.release, mute: g.toggleMute, solo: g.toggleSolo, bank: g.selectBank, play: g.togglePlay, pads: g.slots.length });
  const pf = g.performance, setPf = (p: Partial<typeof pf>) => g.setPerformance({ ...pf, ...p });
  const s = g.slots[g.selected];
  const onFx = useCallback((fx: FxUnit[]) => g.updateSelected({ fx }), [g.updateSelected]);
  const [native] = useState(() => Capacitor.isNativePlatform() || new URLSearchParams(location.search).has("native"));
  const [info, setInfo] = useState<null | "about" | "help" | "welcome">(null);
  const about = info === "about";
  const setAbout = (on: boolean) => setInfo(on ? "about" : null);
  const [booting, setBooting] = useState(true);
  const endBoot = useCallback(() => { setBooting(false); if (!native && isLicensedHost(location.hostname, location.protocol, false) && shouldShowWelcome(Date.now(), readWelcomeSeen())) setInfo("welcome"); }, [native]);
  const closeInfo = useCallback(() => { setInfo(v => { if (v === "welcome") markWelcomeSeen(); return null; }); }, []);
  // NADRISK malfunction: session-only hidden mode toggled by typing the code (or 7 quick taps on the rack name).
  const [nad, setNad] = useState(false), [glitching, setGlitching] = useState(false);
  const prevTheme = useRef<DisplayTheme>(theme), nadNext = useRef(false);
  const [forcedNad] = useState(() => !isLicensedHost(location.hostname, location.protocol, Capacitor.isNativePlatform()));
  useEffect(() => { if (forcedNad) { onThemeChange("nadrisk"); setNad(true); g.setMalfunction(true); } }, [forcedNad]); // eslint-disable-line react-hooks/exhaustive-deps
  const fireNad = useCallback(() => { if (glitching || forcedNad) return; nadNext.current = !nad; setGlitching(true); }, [nad, glitching, forcedNad]);
  const nadBlack = useCallback(() => { const on = nadNext.current; if (on) { prevTheme.current = theme === "nadrisk" ? "oled" : theme; onThemeChange("nadrisk"); } else onThemeChange(prevTheme.current); setNad(on); g.setMalfunction(on); }, [theme, onThemeChange, g.setMalfunction]);
  const fireRef = useRef(fireNad); fireRef.current = fireNad;
  useEffect(() => { let buf = ""; const k = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; if (e.key.length !== 1) return; buf = (buf + e.key.toLowerCase()).slice(-7); const signal = inputSignal(buf); if (signal === 1) { buf = ""; fireRef.current(); } else if (signal === 2) { buf = ""; setAcid(a => !a); } };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAcid(false); }; window.addEventListener("keydown", esc); window.addEventListener("keydown", k); return () => { window.removeEventListener("keydown", k); window.removeEventListener("keydown", esc); }; }, []);
  const taps = useRef<number[]>([]);
  const tapName = () => { const now = Date.now(); taps.current = [...taps.current.filter(t => now - t < 2500), now]; if (taps.current.length >= 7) { taps.current = []; fireRef.current(); } };
  useEffect(() => { if (!info) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") closeInfo(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [info, closeInfo]);
  const onArp = useCallback((arp: ArpParams) => g.updateSelected({ arp }), [g.updateSelected]);
  const tapSource = useCallback(async () => { const e = await g.ensure(); return { ctx: e.ctx, node: tapeBus(e.ctx) }; }, [g.ensure]);
  const tapeRecorder = useTapeRecorder(tapSource, crate.on ? false : g.playing, g.step, crate.on ? crate.link.mix.bpm : g.bpm, crate.on ? noopPlay : g.togglePlay);

  type SurfaceProject = GrooveSet & { topo?: Topo; surface?: SurfaceState; midiMaps?: Record<string, string> };
  const getProject = (name: string): SurfaceProject => ({ ...g.getSet(name), v: 3, topo: g.topo, surface, midiMaps: midi.maps });
  const applyProject = (raw: GrooveSet) => {
    const project = raw as SurfaceProject;
    g.applySet(project); g.setTouch(null); g.setTopo(() => ({ ...TOPO_DEFAULT, ...project.topo }));
    setSurface(hydrateSurface(project.surface));
    if (project.midiMaps) { midi.clear(); midi.preset(project.midiMaps); }
  };
  const utilityPanels = {
    fx: <div><GroupBar group={groupOf(s)} bus={groupOf(s) ? g.groups[groupOf(s) - 1] : undefined} onAssign={k => g.assignGroup(g.selected, k)} onBus={p => g.setGroup(groupOf(s) - 1, p)} /><FxChain key={groupOf(s) ? `g${groupOf(s)}` : "pad"} slotIndex={g.selected} slots={g.slots.map(x => x.name)} slotName={groupOf(s) ? `GROUP ${groupOf(s)}` : s.name} fx={groupOf(s) ? g.groups[groupOf(s) - 1].fx : s.fx} onChange={groupOf(s) ? (fx => g.setGroup(groupOf(s) - 1, { fx })) : onFx} getLevels={g.getFxLevels} load={nad ? 0 : totalFxLoad(g.slots, g.groups)} /></div>,
    phrase: <ArpEditor arp={s.arp} slotName={s.name} onChange={onArp} character={phraseCharacter(s.engine, s.note)} {...(s.engine === "drum" || s.engine === "idm" || s.engine === "siren" ? {} : { note: s.note, onNote: (note: number) => g.updateSelected({ note }), noteOf: (deg: number) => s.note + phraseSemi(g.harmony, s.note, s.arp.scale, deg) })} />,
    seq: <></>,
    mixer: <></>,
    master: <div className="node-body"><MasterScreen playing={g.playing} step={g.step} onPlay={g.togglePlay} bpm={g.bpm} setBpm={g.setBpm} swing={g.swing} setSwing={g.setSwing} volume={g.volume} setVolume={g.setVolume} eco={g.eco} setEco={g.setEco} buffer={g.buffer} setBuffer={g.setBufferMode} latency={g.latency} pf={pf} setPf={setPf} meter={g.meter} resetMeter={g.resetMeter} getMasterDyn={g.getMasterDyn} /><div className="scope-node gb-scope"><Waveform analyser={g.engine.current?.analyser ?? null} playing={!!g.engine.current} eco={g.eco} theme={theme} /></div></div>,
    tape: <TapeDeck recorder={tapeRecorder} />,
    midi: <div className="node-body gb-midi" data-midi-ui><MidiScreen devices={midi.devices} learn={midi.learn} target={midi.target} mapCount={Object.keys(midi.maps).length} status={midi.status} connect={midi.connect} setLearn={midi.setLearn} qwerty={qwerty} setQwerty={setQwerty} keys={midi.keys} setKeys={midi.setKeys} canUnmap={!!midi.target && Object.values(midi.maps).includes(midi.target)} unmap={() => midi.target && midi.unmap(midi.target)} clear={midi.clear} /></div>,
    sets: <SetBank getSet={getProject} applySet={applyProject} locked={nad} />,
    patch: <PatchBank getPatch={g.getPatch} applyPatch={g.applyPatch} locked={nad} />,
  };
  return <HarmonyContext.Provider value={g.harmony}><DisplayThemeContext.Provider value={theme}><section id="groovebox" ref={rootRef} data-lcd={theme} className={`instrument-workspace ${midi.learn ? "midi-learn" : ""} ${acid ? "acid-trip" : ""}`} aria-label="Nadrisk groovebox">{booting && !forcedNad && <StartupFlash onDone={endBoot} />}{info && <div className="about-overlay" role="dialog" aria-modal="true" aria-label={info === "about" ? "About Nadrisk" : info === "help" ? "Quick guide" : "Welcome"} onClick={e => { if (e.target === e.currentTarget) closeInfo(); }}><div className="about-dialog">{info === "about" ? <AboutSection native={native} /> : info === "help" ? <HelpContent /> : <WelcomeContent onGuide={() => { markWelcomeSeen(); setInfo("help"); }} onClose={closeInfo} />}<button className="gb-cycle about-close" aria-label="Close" onClick={closeInfo}>CLOSE</button></div></div>}
    {perfOpen && createPortal(<div ref={perfRef} className={`site-shell perf-overlay ${midi.learn ? "midi-learn" : ""}`} data-lcd={theme} role="dialog" aria-label="Performance"><div className="perf-head"><span className="perf-title"><b>NAD</b> PERF<i>LIVE CONSOLE</i></span><span className={`perf-rec ${tapeRecorder.state === "rec" ? "on" : ""}`}>{tapeRecorder.state === "rec" ? "● REC" : "○ TAPE"}</span>{!crate.on && <button className="gb-cycle" aria-label={g.playing ? "Stop transport" : "Play transport"} onClick={g.togglePlay}>{g.playing ? "■ STOP" : "▶ PLAY"}</button>}<span className="perf-bpm">{crate.on ? crate.link.mix.bpm : g.bpm} BPM</span><button className="gb-cycle" aria-label="AV visuals" aria-pressed={vj} onClick={() => setVj(true)}>AV</button><button className="gb-cycle" aria-label="Close performance" onClick={() => setPerfOpen(false)}>CLOSE</button></div><div className="perf-body instrument-workspace" data-lcd={theme}><div className="perf-console"><section className={`perf-mod perf-mod-link ${link.role === "mixer" ? "with-mutes" : ""}`}><header><span>00</span>LINK · {link.role === "mixer" ? "2-DECK MIXER" : link.role === "solo" ? "DEVICES" : `DECK ${link.role}`}</header><div className="perf-link-body"><PerfLink link={link} midi={midi} onCrate={() => { if (g.playing) void g.togglePlay(); netLink.leave(); crate.open(); }} crate={crate.on ? crate : undefined} center={isMixer ? <>{targetBar(["A", "B"], muteDeck, t => setMuteDeck(t as DeckId), "Mutes")}<PerformanceRack part="live" eight {...muteRack} /></> : undefined} /></div></section><section className="perf-mod perf-mod-main"><header><span>01</span>XY · PERFORM{isMixer && targetBar(["A", "BOTH", "B"], fxTarget, setFxTarget, "FX")}</header><PerfXY value={fxRack.value} onChange={fxRack.onChange} step={isMixer ? undefined : g.step} /></section><section className="perf-mod perf-mod-tape"><header><span>02</span>TAPE · RECORD SET</header>{isMixer && !crate.on && <p className="lk-tape-note">Each deck plays in its own tab or device, so record the tape on each deck.</p>}{utilityPanels.tape}</section><section className="perf-mod perf-mod-fx"><header><span>03</span>PERFORM · FX DETAIL{isMixer && <i className="lk-target-note">→ {fxTarget === "BOTH" ? "A+B" : `DECK ${fxTarget}`}</i>}</header><PerformanceRack part="panel" {...fxRack} /></section>{link.role !== "mixer" && <section className="perf-mod perf-mod-deck"><header><span>04</span>PATTERNS · MUTES</header><PerformanceRack part="live" value={g.performance} onChange={g.setPerformance} bank={g.bank} queued={g.queued} selectBank={g.selectBank} pads={g.slots.map(x => ({ name: x.name, mute: x.mute, solo: x.solo }))} toggleMute={g.toggleMute} toggleSolo={g.toggleSolo} unmuteAll={g.unmuteAll} /></section>}</div></div></div>, document.body)}<CrateEngines crate={crate} />{vj && <VjOverlay theme={theme} onClose={() => setVj(false)} />}{acid && createPortal(<AcidOverlay />, document.body)}{glitching && <MalfunctionOverlay root={rootRef.current} onBlack={nadBlack} onDone={() => setGlitching(false)} />}<div className="workspace-heading gb-topbar">
      <div className="gb-top-identity"><span className="gb-top-brand" onClick={tapName}><span className="status-dot" /> NADRISK GROOVEBOX</span></div>
      <div className="gb-top-clock" role="group" aria-label="Transport and timing">
        <Button variant="ghost" className="gb-cycle gb-top-transport" aria-label={g.playing ? "Stop transport" : "Play transport"} aria-pressed={g.playing} onClick={g.togglePlay}>{g.playing ? "■ STOP" : "▶ PLAY"}</Button>
        <div className="gb-top-segment gb-top-tempo" role="group" aria-label="Tempo"><Button variant="ghost" className="gb-cycle" aria-label="Top tempo down" onClick={() => g.setBpm(Math.max(60, g.bpm - 1))}>−</Button><Button variant="ghost" className="gb-cycle" aria-label="Type tempo (top bar)" onClick={() => { const v = window.prompt("Tempo (60–180 BPM)", String(g.bpm)); const n = v == null ? NaN : Math.round(Number(v)); if (Number.isFinite(n)) g.setBpm(Math.max(60, Math.min(180, n))); }}>{g.bpm} BPM</Button><Button variant="ghost" className="gb-cycle" aria-label="Top tempo up" onClick={() => g.setBpm(Math.min(180, g.bpm + 1))}>+</Button></div>
        <div className="gb-top-segment gb-top-tune" role="group" aria-label="Global tuning"><Button variant="ghost" className="gb-cycle" aria-label="Global tune down" onClick={() => g.setTune(Math.max(-12, g.tune - 1))}>−</Button><Button variant="ghost" className="gb-cycle" aria-label="Global tune reset" title="Double-tap to reset" onDoubleClick={() => g.setTune(0)}>TUNE {g.tune > 0 ? "+" : ""}{g.tune}</Button><Button variant="ghost" className="gb-cycle" aria-label="Global tune up" onClick={() => g.setTune(Math.min(12, g.tune + 1))}>+</Button></div>
      </div>
      <div className="gb-top-system" role="group" aria-label="Key and system">
        <div className="gb-top-segment gb-top-harmony" role="group" aria-label="Harmony"><Button variant="ghost" className="gb-cycle" aria-label="Global key" title="Tap: next key · moves every pitched pad" onClick={() => g.setHarmony({ ...g.harmony, key: (g.harmony.key + 1) % 12 })}>KEY {NOTE_NAMES[g.harmony.key]}</Button><Button variant="ghost" className="gb-cycle" aria-label="Global scale" aria-pressed={g.harmony.scale !== "off"} onClick={() => g.setHarmony({ ...g.harmony, scale: HARMONY_SCALES[(HARMONY_SCALES.indexOf(g.harmony.scale) + 1) % HARMONY_SCALES.length] })}>SCL {g.harmony.scale.toUpperCase()}</Button></div>
        <Button variant="ghost" className="gb-cycle" aria-label="Display theme" disabled={nad || glitching} onClick={() => { if (!nad && !glitching) onThemeChange(nextDisplayTheme(theme)); }}>DISP: {nad ? "LOCK" : DISPLAY_THEMES.find(([value]) => value === theme)?.[1]}</Button>
        <div className="gb-top-segment gb-top-links" role="group" aria-label="Information and visuals"><Button variant="ghost" className="gb-cycle" aria-label="About" aria-pressed={about} onClick={() => setAbout(true)}>ABOUT</Button><Button variant="ghost" className="gb-cycle" aria-label="Quick guide" aria-pressed={info === "help"} onClick={() => setInfo("help")}>HELP</Button></div>
      </div>
    </div>
    <MainFaceplate g={g} surface={surface} setSurface={setSurface} inspect={(i, page) => { g.setSelected(i); setPlate(page); }} open={setPlate} onLink={() => setPerfOpen(true)} onAv={() => setVj(true)} />
    {plate && <div className="face-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setPlate(null); }}><div ref={plateRef} className="face-modal" role="dialog" aria-modal="true" aria-label={plate === "sound" || plate === "fx" ? `${s.name} inspector` : `${plate} utility`}><header><b>{plate === "sound" || plate === "fx" ? s.name : plate === "sets" ? "MEMORY" : plate.toUpperCase()}</b>{(plate === "sound" || plate === "fx") && <><Button variant="ghost" className="face-key" aria-pressed={plate === "sound"} onClick={() => setPlate("sound")}>INSPECT</Button><Button variant="ghost" className="face-key" aria-pressed={plate === "fx"} onClick={() => setPlate("fx")}>COLOR</Button><Button variant="ghost" className="face-key" aria-label={`Play ${s.name}`} onClick={() => audition(g.selected)}>▶</Button></>}<Button variant="ghost" className="face-key" aria-label="Close inspector" onClick={() => setPlate(null)}>CLOSE</Button></header><div className="face-modal-content"><ResetScope.Provider value={`slot${g.selected}`}>
    {plate === "sound" ? <SlotEditor slot={s} index={g.selected} getWave={g.getSlotWave} getSpectrum={g.getSlotSpectrum} getSlices={g.getSlices} peaks={g.peaks[g.selected]} onChange={g.updateSelected} onLoad={g.loadSelected} onLoadId={g.loadSelectedId} onLoadFolder={g.loadFolder} /> : plate === "fx" ? <FxChain slotIndex={g.selected} slots={g.slots.map(x => x.name)} slotName={s.name} fx={s.fx} onChange={onFx} getLevels={g.getFxLevels} load={totalFxLoad(g.slots, g.groups)} /> : utilityPanels[plate]}
    </ResetScope.Provider></div></div></div>}
    {tapeRecorder.url && <audio ref={tapeRecorder.audio} src={tapeRecorder.url} onEnded={tapeRecorder.ended} hidden />}
    <div className="workspace-footer"><span><AudioLines size={13} />{forcedNad ? "UNLICENSED COPY - NADRISK.LOVABLE.APP" : g.error || (g.rec && g.playing ? "● RECORDING INTO PATTERN" : g.queued != null ? `PATTERN ${"ABCD"[g.queued]} QUEUED · NEXT BAR` : g.playing ? "SEQUENCER RUNNING" : "READY")}</span><span>DRM / PRC / SYN <span className="footer-separator">/</span> WEB AUDIO</span><span className="workspace-index">NADRISK © 2026</span></div>
  </section></DisplayThemeContext.Provider></HarmonyContext.Provider>;
}
