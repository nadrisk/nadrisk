# Diagnosis: why the groovebox doesn't look like the reference

## What the reference actually is
Each reference screen (MEMORY, KIT, WISPDISK, CYBERSPACE, WAXSAFETY) is a **tiny fixed-resolution display** (about 128x64 pixels) **scaled up by a whole number**. Every letter, icon, knob, fader and waveform sits on the same coarse pixel grid. One screen = one panel showing roughly 6 parameters: a header bar (`A01 NAME  tempo`), a row of icons/graphs, and a row of 4-5 tiny controls with 3-4 letter labels underneath (LEV STRT LEN LOOP).

## What the current UI does differently
1. **It is a web page, not a screen.** Panels are made of flexible boxes, grids, inputs and buttons that resize freely. Text and lines land on fractional positions, so edges blur and nothing shares a pixel grid. The reference has one grid, everything snapped to it.
2. **Fonts are pixel-looking, not pixel-exact.** Silkscreen and VT323 are vector fonts. They only look crisp at their native size multiples (8/16 px for Silkscreen); at 9-11 px with dpr 2 they render soft and uneven. `font-smooth: never` is ignored by most browsers. Older rules in `src/index.css` still force JetBrains Mono / Michroma on pads, groups, uploads, mixer, banks (lines ~210-600), and the pixel override fights them with `!important`.
3. **Controls are drawn at screen resolution.** `HwKnob.tsx` draws smooth SVG circles and needles at full device resolution, so they look like thin modern vector icons, not chunky 1-pixel-stroke bitmap knobs. `image-rendering: pixelated` does nothing to SVG/DOM.
4. **Density and hierarchy are wrong.** `SlotEditor.tsx` stacks every parameter (up to ~30 knobs, named fieldsets, selects, buttons) in one long scroll. The reference shows a few parameters per page with paging.
5. **Web primitives remain.** HTML `<select>`, shadcn `Button` and `Slider` (in `SlotEditor`, `PerformanceRack`, `Groovebox`) bring browser rendering, focus rings and spacing the reference never has.
6. **Waveform is close but not on the grid.** `SampleView` draws at half resolution, but the half is relative to whatever width the box has, so the pixel size varies per device.

## Can CSS alone do it?
No. CSS restyling has been tried three times and keeps landing on "dark web UI with a pixel font". To match the reference, the panel must be **rendered as pixels**:
- a fixed logical resolution canvas (e.g. 128x64 per screen) drawn with a **bitmap font** (glyphs as pixel arrays, 5x7 and 3x5 sizes) and pixel-drawn icons/knobs/faders,
- scaled up by an integer factor (2x/3x/4x) with nearest-neighbour, so every pixel is identical on phone, iPad and desktop.
Interaction stays normal: invisible hit-zones over the canvas handle tap, drag, double-click reset and keep the existing labels so MIDI learn still works.

## Proof of concept: ONE panel — the sampler as "WISPDISK"
Only the sampler engine's editor changes. Everything else (audio, pads, sequencer, other engines, performance rack, themes) is untouched.

What you'll see when the sampler pad is selected:
```text
+--------------------------------------------+
|[A01] WISPDISK            [tempo 120.0]     |  inverted header
| SMP  [rev] [loop] [grain]   [ A 05 ]       |  pixel icons
| 13   |||||-waveform-||||:|||||:            |  2-lane stepped wave,
| [#]  |||||-----------||||:|||||:           |  dotted STRT/LEN cursors
| LEV  STRT   LEN   LOOP   PTCH               |  3-letter labels
+--------------------------------------------+
  page 1: sample  ·  page 2: ADSR  ·  page 3: grain   (pixel tabs)
```
- Bitmap-font text, pixel knobs (1 px ring, stepped needle), segmented fader, pixel ADSR graph on page 2.
- Drag the knobs/cursors, double-click to reset, same parameters as today.
- Uses the current theme colours (white on black by default).

## Technical section
- New `src/pixel/font.ts`: hand-built 3x5 and 5x7 bitmap glyph tables (A-Z, 0-9, symbols).
- New `src/pixel/PixelScreen.tsx`: canvas at fixed logical size, integer scale from container width via ResizeObserver, `imageSmoothingEnabled=false`, redraws only when values change (no animation loop).
- New `src/pixel/draw.ts`: `text`, `rect`, `invert`, `knob`, `fader`, `wave`, `adsr`, `icon` primitives on a 1-bit buffer.
- New `src/components/WispdiskPanel.tsx`: draws the 3 pages; transparent hit-zones with the existing aria-labels (Start, Pitch, Volume, A/D/S/R, Grain size...) so MIDI learn and reset keep working.
- `SlotEditor.tsx`: only the `slot.engine === "sampler"` branch renders `WispdiskPanel` instead of the current groups. No changes to `useGroovebox.ts` or audio files.
- Approved direction would then be applied panel by panel (CYBERSPACE synth, WAXSAFETY drum, KIT modal, MEMORY set list).
