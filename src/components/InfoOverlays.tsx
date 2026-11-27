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
  ["FIRST BEAT IN 60 SECONDS", ["1. Tap a pad to hear it. The first tap wakes the audio.", "2. Press DRUM, then tap the pads that should be drums. Do the same with BASS and LEAD. Tap the group button again to finish.", "3. Select the DRUMS lane and tap a rune card (EUCLID, FIBO…) to place it, or drag it onto a beat.", "4. Add runes to BASS·LEAD for melody, then press ▶ PLAY.", "5. Set tempo with − / + or by tapping the BPM. NEW starts a blank set."]],
  ["INSTRUMENTS", ["DRM: kick, snare, hat and clap machines with presets.", "PRC: modular percussion synths (NOIS, VCO) with six routings each.", "SYN: wavetable synth. Import your own tables; the screen shows the table moving as you modulate. VOICES 1 = mono with glide.", "TRN: wave-terrain synth. A ring travels over a 2D surface; FREQ, HOLD, SNOW and FOLD reshape the ground.", "SMP: load a WAV/MP3; slice breaks (BRK), make clouds (GRN) or record your input (IN).", "OCT moves a pitched pad up or down; the sequencer decides the notes.", "Each instrument has its own XY pad. SET keeps the dot's changes, CENTER clears them."]],
  ["RUNE SEQUENCER", ["Four lanes: DRUMS, BASS·LEAD, MOD and FLOW. Pick a lane, then add runes from the dock below.", "Each rune is a rule: EUCLID ◎, SHIFT ⇄, ANCHOR ⊥, GIBBS ∿, FIBO Φ, PRIME ℙ, STOCH ∴, BLOOM ✿, SNAKE ⌇.", "Tap a rune to select it and edit speed (2 to 1/32), amount and targets. Double-tap removes it.", "Drag a rune sideways to move it, up or down to change its amount, and its right edge to stretch it.", "Drop a rune onto another to replace it.", "BARS switches 1 or 2 bars. DUP 1 copies bar 1 into bar 2."]],
  ["HARMONY AND GROUPS", ["KEY and SCL set the key and scale for bass and lead.", "PROG sets your chord progression: choose how many chords and which scale degrees (I–VII).", "Bass plays low and follows the progression; lead plays higher and fills around it.", "With several pads in one group, they take turns, giving changing sounds.", "Pads with no group are left alone, so you can play them by hand."]],
  ["MOD AND FLOW", ["MOD runes move up to three sound or effect targets per pad.", "FLOW runes change the order steps play in, like snake paths: RASTER, SERPENT, SPIRAL, DIAG, KNIGHT, STRIDE, WEAVE, BOUNCE, REVERSE.", "FLOW adds no notes; the same runes give new grooves."]],
  ["XY MANGLER", ["The pad under the rune dock mangles the playing sequence.", "CLOCK: left/right changes drum speed, up/down bass and lead speed.", "TIMBRE: left tight, right open; down dark, up bite, on every grouped pad.", "SPLIT: drums on left/right, bass and lead on up/down.", "MACRO: + ADD sends any pad's effect setting to X or Y. Stack as many as you like; − flips direction. AUTO maps them for you.", "SPRING returns to your saved sound on release; HOLD keeps the position. CTR recentres."]],
  ["EFFECTS AND MASTER", ["Every pad has an FX rack: reverb, tape delay, metal, drive, filters, HACK and more.", "MIX blends dry and effect; the dry stays full up to the middle.", "MASTER runs EQ → GLUE → CLIP → LIMIT. EQ's SPC tab shows the spectrum."]],
  ["PLAYING LIVE", ["PERF opens the performance console.", "FLTR/ECHO: left/right sweeps LP ↔ HP; up adds echo. Release to return to dry, or use HOLD.", "LOOP 8 · 4 · 2 · 1 locks a short loop; tap again for the full pattern.", "Mutes on the live strip; SHFT turns mutes into solos, RST unmutes all.", "The tape deck records the groovebox output. Export as WAV or MP3.", "AV has SPACE and PLASMA visuals and AV OUT for another screen."]],
  ["LINK AND MIXING", ["LINK lets one screen host the mixer and other tabs or devices join as decks A and B.", "LOCAL TABS works without internet; DEVICES connects separate phones or computers.", "▶ BAR starts a deck on the next bar. EQ, filter, level and crossfader blend the decks.", "CRATE plays two saved sets in one tab; KEY SYNC matches keys.", "Double-tap a control to reset it."]],
  ["SAVING AND MIDI", ["Sets store the whole groovebox; patches store one pad's sound.", "Export files to back them up or share them.", "MIDI keyboards play pads; LEARN maps knobs and faders to your controller.", "Browser MIDI needs desktop Chrome or Edge; iPhone and iPad Safari don't support it."]],
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
