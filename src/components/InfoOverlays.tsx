import { useState } from "react";
import { LINKS } from "@/lib/welcome";

export function WelcomeContent({ onGuide, onClose }: { onGuide: () => void; onClose: () => void }) {
  return <section className="about-section">
    <header className="about-header"><span>WELCOME</span><span>NADRISK GROOVEBOX</span></header>
    <div className="about-copy info-copy">
      <p>The Nadrisk Groovebox is a free instrument in your browser: drums, synths, samplers, effects and a sequencer you can perform live. No installs, no accounts.</p>
      <p>It stays free. If you enjoy it and want to support its development, consider donating on Ko-fi.</p>
      <div className="about-links">
        <a className="gb-cycle about-kofi" href={LINKS.kofi} target="_blank" rel="noopener noreferrer">♥ SUPPORT ON KO-FI</a>
        <button className="gb-cycle" onClick={onGuide}>QUICK GUIDE</button>
        <button className="gb-cycle" onClick={onClose}>START PLAYING</button>
      </div>
    </div>
  </section>;
}

const PAGES: [string, string[]][] = [
  ["FIRST BEAT IN 60 SECONDS", ["1. Tap a pad. The first tap wakes the audio.", "2. Tap steps in its sequencer row to light them, then press ▶ PLAY.", "3. Pick another pad, choose DRM and a preset (909 HOUSE KICK, UKG SNARE…), and add a snare row.", "4. Press GEN for a groove, or RAND to scatter hits. UNDO steps back.", "5. Set tempo with − / + or by tapping the BPM."]],
  ["INSTRUMENTS", ["DRM: kick, snare, hat and clap machines with presets.", "PRC: experimental percussion for glitchy IDM hits.", "SYN: clean synth. VOICES 1 = mono with glide, 2–8 = chords.", "BAS: 808 sub, ACID 303 line or REESE bass.", "SMP: load a WAV/MP3; slice breaks (BRK), make clouds (GRN), record input (IN)."]],
  ["CHORDS AND PHRASES", ["CHORD ON plays a chord from one pad: BLOCK, STRUM or ARP.", "KEY follows the master key and scale; FREE keeps your chosen chord shape on every note.", "Arp order and rate show only in ARP mode.", "PHRASE plays a melody while you hold the pad. CHRD locks it to the chord notes."]],
  ["XY PAD", ["Drag the dot: left/right = tight ↔ open, down/up = dark ↔ bright.", "Held notes and chords follow the dot as you move.", "SET keeps the sound where the dot is; CENTER goes back to it.", "REC: arm, then move the dot to record a loop. LFO: pick a shape, RATE and DPTH."]],
  ["SEQUENCER", ["Each row is a pad, each column a step.", "Double-click a later step to tie a long note to the one before it.", "Row keys · / X / S guide GEN and RAND: · normal, X leave alone, S only this row.", "LEN sets row length, X2 shows 32 steps. A–D are pattern banks that switch on the bar."]],
  ["EFFECTS AND MASTER", ["Every pad has an FX rack: reverb, DLAY tape delay, HACK and more.", "HACK: GEN draws a step pattern, and each step plays exactly what you see. DPTH sets how much it moves. Any knob at 0 turns that part off.", "MIX blends dry and effect; the dry stays full up to the middle.", "MASTER runs EQ → GLUE → CLIP → LIMIT. EQ's SCP tab shows the spectrum."]],
  ["PLAYING LIVE", ["PERF holds live tools. TENS builds tension: SWEEP, WHITEOUT or the CYBER riser.", "Mutes and A–D keys on the live strip switch parts instantly.", "VJ shows sound-reactive visuals; pop it out to a TV.", "Record your jam on the tape deck and download it as WAV.", "LIVE / PROD: LIVE responds fastest, PROD gives busy sets more headroom."]],
  ["SAVING AND MIDI", ["Sets store the whole groovebox; patches store one pad's sound.", "Export files to back them up or share them.", "MIDI keyboards play pads; MIDI learn maps knobs to your controller.", "Keys 1–8 and Q–I play pads. SHIFT + key mutes, ALT + key solos.", "Z X C V switch banks A–D. SPACE plays and stops."]],
];

export function HelpContent() {
  const [i, setI] = useState(0);
  const [title, lines] = PAGES[i];
  return <section className="about-section">
    <header className="about-header"><span>QUICK GUIDE</span><span>{i + 1} / {PAGES.length}</span></header>
    <div className="about-copy info-copy">
      <h2>{title}</h2>
      <ul className="help-list">{lines.map(l => <li key={l}>{l}</li>)}</ul>
      <div className="about-links">
        <button className="gb-cycle" disabled={i === 0} onClick={() => setI(i - 1)}>◀ PREV</button>
        <button className="gb-cycle" disabled={i === PAGES.length - 1} onClick={() => setI(i + 1)}>NEXT ▶</button>
      </div>
      <p className="help-note">VIDEO TUTORIALS COMING SOON.</p>
    </div>
  </section>;
}
