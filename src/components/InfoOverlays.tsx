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
  ["FIRST BEAT IN 60 SECONDS", ["1. Tap a pad. The first tap wakes the audio.", "2. Tap steps in its sequencer row to light them, then press ▶ PLAY.", "3. Pick another pad, choose DRM and a preset (HOUSE KICK, UKG SNARE…), and add a snare row.", "4. Press GEN for a groove, or RAND to scatter hits. UNDO steps back.", "5. Set tempo with − / + or by tapping the BPM."]],
  ["INSTRUMENTS", ["DRM: kick, snare, hat and clap machines with presets.", "PRC: two modular percussion synths (NOIS, VCO), six routings each.", "PAD: ambient pads and keys. Choose a sound on PRST; shape attack and release on ENV. It follows the pad's CHORD device.", "PAD MIDI GRAND uses the Salamander Grand Piano by Alexander Holm (CC-BY).", "SYN: clean synth. VOICES 1 = mono with glide, 2–8 = chords.", "BAS: 808 sub, ACID 303 line or REESE bass.", "SMP: load a WAV/MP3; slice breaks (BRK), make clouds (GRN), record input (IN).", "IN: press REC. With GATE up, recording starts when you play; AUTO stops after a short silence, MAN waits for STOP. NOTE records for the length of a sequencer note. MNTR lets you hear yourself.", "SMP ENV keeps each hit at full punch briefly, so short DEC tightens the tail without losing volume.", "PAD MIDI GRAND: left/right goes FELT → BRIGHT; down is tight, up rings longer."]],
  ["CHORDS AND PHRASES", ["CHORD ON plays a chord from one pad: BLOCK, STRUM or ARP.", "KEY follows the master key and scale; FREE keeps your chosen chord shape on every note.", "Arp order and rate show only in ARP mode.", "PHRASE plays a melody while you hold the pad. CHRD locks it to the chord notes.", "RAND writes a new 303-style acid line: syncopated, root on the downbeats, octave jumps and slides."]],
  ["XY PAD", ["Each instrument has its own XY mapping; the screen names both axes.", "PAD: left/right changes DARK ↔ BRT; LONG ↔ SHRT changes attack and release. Held notes follow your moves.", "SET writes the dot's adjustments into the sound controls; CENTER clears the offsets.", "REC: arm, then move the dot to record a loop. LFO: pick a shape, RATE and DPTH."]],
  ["SEQUENCER", ["Each row is a pad, each column a step. Tap a step to add or remove a note.", "Drag a note's right-edge grip to change its length. Tap its starting cell to remove the whole note.", "Hold the edge, then drag to absorb nearby notes into one long note.", "Row keys · / X / S guide GEN and RAND: · normal, X leave alone, S only this row.", "LEN sets row length, X2 shows 32 steps. A–D are pattern banks that switch on the bar."]],
  ["EFFECTS AND MASTER", ["Every pad has an FX rack: reverb, DLAY tape delay, HACK and more.", "HACK: GEN draws a step pattern, and each step plays exactly what you see. DPTH sets how much it moves. Any knob at 0 turns that part off.", "MIX blends dry and effect; the dry stays full up to the middle.", "MASTER runs EQ → GLUE → CLIP → LIMIT. EQ's SCP tab shows the spectrum."]],
  ["PLAYING LIVE", ["PERF opens the separate performance console; the sequencer keeps its own full space.", "FLTR/ECHO: left/right sweeps LP ↔ HP; up adds echo. TENS/TIME changes sound length and tension.", "Release the XY pad to return to dry. HOLD keeps your position; turn HOLD off to release it.", "LOOP 8 · 4 · 2 · 1 under the XY pad: tap to lock a loop of that many steps, tap again for the full pattern; hold to loop only while pressed.", "Mutes and A–D keys switch parts on the live strip. SHFT turns mutes into solos; RST unmutes all.", "The PERF tape deck records this groovebox's output, including its live effects. Export the take as WAV or MP3.", "AV has editable SPACE and PLASMA visuals, an optional CODE overlay and AV OUT for another screen."]],
  ["LINK AND TWO-DECK MIXING", ["Any screen can host the mixer. Each linked deck makes its own audio; LINK sends controls, not sound.", "For three tabs on the same site: choose LOCAL TABS, then HOST MIXER in one tab. Enter its four-character code in the others and JOIN A / JOIN B. Linking needs no cloud connection.", "DEVICES uses the online room service for separate phones or computers; select DEVICES on every participant.", "Load sets on the deck tabs. Start them locally once to enable audio, then use the mixer's ▶ BAR to launch on a bar; ■ stops that deck.", "HI / MID / LOW shape each deck; × kills a band. FILTER sweeps LP / HP, LEVEL sets volume, and the crossfader blends A / B with BLEND or CUT.", "Each channel shows its current step (1–16) and the active loop: FULL, or LOOP 8/4/2/1 with the looped steps boxed.", "ONE DEVICE · CRATE plays two saved projects in one tab: load to A or B, KEY SYNC matches keys, BPM ⇢ MST sets the tempo.", "Mutes, banks and XY target A, BOTH or B with the bar above them.", "Double-tap filter or crossfader to centre; double-tap EQ or LEVEL to restore flat or full level. ↺ resets the filter in one tap."]],
  ["MIXER MIDI", ["Connect your controller, open PERF, host the mixer, and press MIDI to enable the input.", "Turn LEARN on, tap a mixer control, then move the matching knob or fader on your Mixtour or other controller. Repeat, then turn LEARN off to mix.", "EQ, filters, channel faders, crossfader and transport keys can be mapped. Mappings stay saved in this browser.", "Browser MIDI requires a supported browser such as desktop Chrome or Edge. iPhone and iPad Safari do not support it.", "Headphone cue and audio streaming to the mixer are not provided. The mixer tape records its local groovebox, not a combined recording of the linked decks."]],
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
