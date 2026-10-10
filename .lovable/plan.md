# Finish the pixel-hardware look across the rest of the groovebox

The slot screens are done. This plan covers everything that still looks like a web page, using the same 128×64 pixel screens, square keys and module frame. The sound, sequencing, MIDI learn, saved sets and touch behaviour stay exactly as they are.

## 1. Sample library (sampler pads)
- A **LIBRARY** screen replaces the dropdown: a scrolling pixel list of built-in and your saved samples, a stepped scrollbar, and LOAD, FOLDER and IMPORT keys. FOLDER and IMPORT still open the normal file chooser.

## 2. Master, tape deck, performance rack
- **MASTER** screen with pages OUT / DYN / EQ: level meter ladder, clipper/limiter knobs, the five mastering EQ bands as a stepped curve, glue compressor.
- **TAPE** screen: two drawn reels that turn while recording, a time counter, and REC / PLAY / STOP / WAV / MP3 keys.
- **PERFORM** screen: DJ filter knob with a curve, and repeat, offset and loop keys arranged as a key grid.

## 3. Effects and phrase sequencer
- **FX** screen: the pad's effect chain as a numbered pixel list (add, remove, move up/down), with one knob page per selected effect.
- **PHRASE** screen: steps drawn as pixel bars (pitch and velocity), with pages for scale/root/octave, rate/length and gate/glide.

## 4. Pads, step grid, mixer, visualizers, transport
- **Pads:** square pixel pads with a solid fill while held and a small name label; multi-touch unchanged.
- **Step grid:** pixel cells with velocity bars, roll counts and the playhead as an inverted column.
- **Mixer:** 16 ladder meters with MUTE/SOLO keys and a pixel channel-EQ page.
- **Visualizers:** scope and spectrum drawn on the same 128×64 grid.
- **Transport and top bar:** PLAY / STOP / REC / BPM / A-B / THEME as pixel keys and readouts.
- Leftover browser dropdowns, rounded buttons and window frames are removed from these areas.

## Technical details
- New screens built on `PixelScreen` + `Zone`/`Tap` and the shared helpers in `pixelScreens.tsx`. They keep the existing aria-labels so MIDI learn, arrow keys and double-click reset carry on working.
- Pads and the step grid stay as DOM elements, so multi-touch and drag rolls aren't affected, but they're restyled as hard-edged pixel cells. Visualizers move onto the 128×64 canvas.
- Each area's old web-control styles are deleted from `index.css` when it's replaced, rather than being overridden.
- No changes to `src/audio` or `useGroovebox` logic.

## Order and checks
- Built in the order above. After each area: the app builds without errors, plus a browser check at desktop and phone widths that values change, pages switch, recording/export and saved sets still work.
