# NADRISK rebuild: terrain synth, cadence engine, topomap, performance surface

The groovebox moves from 16 pads + step grid to one focused instrument. The header stays exactly as it is. Everything below it is rebuilt in phases so the app never goes blank between steps.

## Layout (top to bottom, one frame width, shared grid)

```text
HEADER (unchanged: brand, PLAY/STOP, BPM, TUNE, KEY, SCL, DISP, ABOUT, HELP)
CADENCE + LATTICE strip   chord pattern, horizon, rhythm gate, arp controls, screen
TOPOMAP (big)             the main sequencer surface, XY puck
PERF ROW                  VAPOR (echo filter) | SUSPEND (reverb freeze) | FRACTURE (stutter) | MELT (feedback)
QUAD-AXIS ROW             4 joysticks side by side
CHANNELS                  KIK SNR HAT CLP PRC SURF: name (inspect), COLOR, bus V S F M, M/S, fader
```

Phone: same order. PERF row and QUAD-AXIS share one area with a two-position switch below the topomap. Channel strips show name, M/S and fader. Tapping the name opens a plate with COLOR and bus sends. Nothing scrolls sideways.

## Alignment and feedback rules (apply to every element)
- One column grid and spacing scale for every row. Rows share left and right edges with the header. All pixel screens use integer-scaled 128x64 bitmaps, and their hit zones come from layout files.
- Each control has a lit or active state and shows its live value. Moving a knob briefly replaces the screen title with the value. Joysticks show their X and Y targets and positions. Faders have meters. Bus buttons light when the effect is engaged. The topomap draws the puck, the clean beat, and which hits the mangling moved.
- Each new layout gets a test that fails if hit zones overlap, extending the current xyLayout test pattern to the topomap, joysticks and channel strips. A Playwright check at 393x706 and 1280 wide fails on overlap or horizontal overflow.

## Phase 1: SURF terrain synth (a real wave terrain synth)
- New `nad-terrain` AudioWorklet. Each sample, an orbit (x(t), y(t)) crosses a 2D math surface z = f(x, y). The position comes from the XY puck. FREQ, HOLD, SNOW and FOLD reshape the surface itself.
- 2x oversampling with a half-band downsampler. FOLD and SNOW taper with pitch so high notes don't screech. A 5–12 ms pitch slew between GROUND and SURGE.
- Keeps the existing filter, drive (bypassed at 0) and three ADSR envelopes.
- Screen: a 1-bit raster of the actual surface, sampled from the same formula, with the crosshair.
- Delete wavetable.ts, wtFactory.ts, wtOsc.ts, wtEnv.ts, WavetableLibrary.tsx, WavetableView.tsx and their tests. Old sets that used the synth load as SURF with their filter and envelope settings.

## Phase 2: Six fixed channels
- Fixed voices KIK, SNR, HAT, CLP (drum engine), PRC (IDM engine), SURF. Remove the 16-slot model, blank pads, the slot bar, pad badges, the BLNK prompt, chord/choke/phrase-per-pad and pad-hold scheduling.
- Old sets: the first slot of each voice type maps to its channel. Everything else is dropped with a one-line notice.
- Channel strip: inspect opens that voice's existing editor, COLOR is the per-channel insert FX rack (current FxChain), bus sends V S F M, mute/solo, fader, meter. The current Mixer and MASTER (EQ → Glue → Clipper → Limiter) stay at the end.

## Phase 3: Cadence + Lattice (SURF's pitch brain)
- CADENCE: a list of common progressions (i–VI–III–VII, i–iv–v, i–VII–VI, and others). HORIZON crops it to 1–4 chords, RATE sets chord length. A gate pattern (solid to sparse) gives the rhythm.
- GROUND plays the bass note. SURGE windows open on the gate, and SURF then plays whatever note the free-running LATTICE is on at that moment, never restarting it.
- LATTICE: a 4x4 Cartesian engine (René/snake style) with separate X and Y clocks and lengths (polymetric), so pitch and gate cycles drift against each other. TRACK switches between CHORD (follows the current chord) and ROOT (stays on the key).
- The scale is the last step: every note goes through the existing Harmony KEY/SCL snap, so nothing plays out of key.

## Phase 4: Topomap (replaces the step grid)
- The base beat comes from the existing generator styles and plays unchanged with the puck at centre.
- Four math rules mangle it as the puck moves away from centre: affine step warp, torus cat map, Euclid density sieve, Rule 90 automaton. Each is a pure function, so the same input always gives the same output.
- Paths: free touch, recorded path, synced LFO, plus sigil and snake orbit shapes. The existing xyMotion/xyAt timing is reused. Letting go snaps back to the clean beat.
- Remove StepGrid, the pattern banks A–D, MOD lanes, ties, roll/chance/vel lanes, the arranger, and Monke (built on the grid). Their tests go too.

## Phase 5: Performance + Quad-Axis
- Four performance buses with safety built in. MELT is tanh-capped at unity gain. SUSPEND has a 120 Hz high-pass and 8 kHz damping. A channel can feed any of the buses or none.
- Quad-Axis: 4 joysticks, each with an X and a Y target. To assign one, tap the axis label, then touch any knob or fader from any channel. Long-press clears it. The joystick sets targets through the existing knob value events.
- The old PERF overlay and PerformanceRack are removed. Their live tools move into these rows.

## Phase 6: MIDI + project saving
- MIDI learn works on every fader, M/S, bus, joystick axis, topomap X/Y, cadence and terrain knob, using the existing value-event pattern.
- `.nadrisk.json` gets a new version holding terrain, cadence, lattice, topomap rule and path, channels, buses, joystick maps and MIDI maps. It migrates older versions. A set, MIDI map and project round-trip test.

## Residue sweep (closing step)
- rg for every removed file and symbol (sampler, pad, bas/808/acid/reese editors, wavetable, step grid, banks, Monke, PERF overlay, slotState) and delete the unused code. AV visuals, CRATE/link and the theme system stay, rewired to the 6 channels.
- Update HELP and ABOUT, the scoped AGENTS.md files and the project knowledge rules to the new architecture. roadmap.md tracks every phase.
- Full vitest run (acid excluded until it's removed), typecheck, and a live Playwright pass of each flow: play the clean beat, move the puck, hear SURGE, freeze a bus, assign a joystick, save and reload.

## Open decisions (defaults used unless you say otherwise)
- Old sets are partly mapped rather than rejected.
- Phone uses the PERF / QUAD-AXIS switch.
- KIK can be pinned to 4/4 while the rules mangle the rest (ANCHOR toggle, on by default).
