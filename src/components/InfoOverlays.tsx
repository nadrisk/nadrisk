import { useState } from "react";
import { LINKS } from "@/lib/welcome";

export function WelcomeContent({ onGuide, onClose }: { onGuide: () => void; onClose: () => void }) {
  return <section className="about-section">
    <header className="about-header"><span>WELCOME</span><span>NADRISK GROOVEBOX</span></header>
    <div className="about-copy info-copy">
      <h2>A GROOVEBOX BUILT TO BE PLAYED.</h2>
      <p>The Nadrisk Groovebox is a free instrument in your browser: drums, synths, samplers, effects and a sequencer you can perform live. No installs, no accounts.</p>
      <p>It stays free, but hosting, upkeep and new features cost money. If you enjoy it, chip in on Ko-fi: pay what you want once, or join the monthly plan that covers hosting and upkeep.</p>
      <p>If we reach the donation goal, the groovebox becomes a full-fledged app.</p>
      <div className="about-links">
        <a className="gb-cycle about-kofi" href={LINKS.kofi} target="_blank" rel="noopener noreferrer">♥ SUPPORT ON KO-FI</a>
        <button className="gb-cycle" onClick={onGuide}>QUICK GUIDE</button>
        <button className="gb-cycle" onClick={onClose}>START PLAYING</button>
      </div>
    </div>
  </section>;
}

const PAGES: [string, string[]][] = [
  ["GETTING STARTED", ["Tap any pad to hear it. The first tap wakes the audio.", "▶ PLAY starts the sequencer. − / + or tap the BPM to set tempo.", "TUNE shifts every pitched pad. KEY and SCL keep notes in a key.", "DISP changes the screen colours."]],
  ["PADS AND SOUNDS", ["Each pad is a slot: drum, synth, sampler, 808, ACID and more.", "Select a pad to edit it in its device panel. Screen tabs switch pages.", "Turn knobs by dragging; double-click a knob to reset it.", "The sampler loads WAV/MP3, slices breaks (BRK), grains (GRN) and records input (IN)."]],
  ["SEQUENCER", ["Each row is a pad, each column a step. Tap steps to light them.", "Row keys · / X / S guide RAND and GEN: · = normal, X = exclude the row, S = solo it so only that row changes.", "LEN sets row length, X2 shows 32 steps.", "A–D are pattern banks; the next bank queues on the bar.", "GEN builds breaks and phrases, RAND scatters hits, UNDO / REDO step back."]],
  ["EFFECTS AND MASTER", ["Every pad has an FX rack: reverb, tape delay, chorus, flanger and more.", "MIX keeps the dry sound full to 50%, then brings the effect in full.", "MASTER runs EQ → Glue → Clipper → Limiter.", "LIVE / PROD sets the audio buffer size, like a DAW. LIVE = small buffer, fastest response for finger drumming. PROD = large buffer, a little delay but far more headroom before busy sets crackle."]],
  ["PERFORMANCE", ["The PERF page holds live tools for playing a set.", "TENS builds tension: SWEEP, WHITEOUT or the CYBER riser.", "Mutes and A–D keys on the live strip switch parts instantly.", "Record your jam with the tape deck and download it as WAV."]],
  ["SAVING AND MIDI", ["Sets store the whole groovebox; patches store one pad's sound.", "Export files to back them up or share them.", "Plug in a MIDI keyboard to play pads; MIDI learn maps knobs to your controller.", "Computer keyboard: 1–8 play pads 1–8, Q–I play pads 9–16.", "Hold SHIFT + a pad key to mute that pad, ALT + a pad key to solo it.", "Z X C V switch pattern banks A–D. SPACE starts and stops playback."]],
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
