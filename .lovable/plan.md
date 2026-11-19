# 20 built-in wavetables, cloud removed, import kept

## What you get
- The synth LIBRARY lists BASIC WAVES followed by 20 factory tables, then your own imported tables.
- The CLOUD button and the online archive are removed. The app makes no network requests for wavetables.
- IMPRT and deleting your own tables work as they do now.
- Every factory table sweeps the same smooth way BASIC WAVES does, with the knob, the WT envelope and LOOP.

## The 20 tables
Analog: JUNO PWM, ACID 303, MINI FAT SAW, PROPHET VS
Digital: PPG RESO, MICROWAVE, CZ RESO SAW, CZ RESO TRAP
FM: FM BASS, FM BELL, FM GROWL, BUCHLA FOLD
Keys: B3 DRAWBARS, RHODES TINE, WURLY REED, CLAVINET
Vocal/spectral: VOWEL TALK, CHOIR VOX, GLASS HARM, LO-FI 8BIT

The tables are built from the published descriptions of these sounds: pulse widths, CZ phase-distortion formulas, FM index sweeps, Hammond drawbar registrations, vowel formant frequencies and bit depths. They aim at each instrument's character. They are not copies of samples from the original instruments.

## How smoothness is guaranteed
- Each factory table has 4 hand-set shapes, the same number BASIC WAVES uses.
- Each shape is stored as a list of overtone strengths. Every overtone starts at the same point in its cycle in every shape, so blending two shapes can't cancel sound out.
- Factory tables use the same playback path as BASIC WAVES: built-in browser oscillators that crossfade between neighbouring shapes. They do not use the per-frame engine that buzzed on cloud tables.
- Imported tables keep the current engine.

## Saved sets
Sets that point to a cloud table load BASIC WAVES and keep every other setting. Cloud tables already saved on a device are not deleted, but the library hides them.

## Technical details
- New `src/audio/wtFactory.ts` holds 20 definitions `{id:"fx:<slug>", name, shapes: 4 x Float32Array(64 harmonic amplitudes)}`. The amplitudes are computed from formulas: pulse Fourier series, CZ phase distortion and the folder sampled then run through an FFT, Bessel sidebands for FM, sums of drawbar partials, and Gaussian formant weighting for vowels. All shapes use sine phase and are normalized to equal RMS.
- `wavetable.ts`: `loadTable` resolves `fx:` ids synchronously. Tables gain a `keys?: PeriodicWave spec` so `clean.ts` takes the BASIC branch, which builds a `PeriodicWave` for each shape instead of using the native types. The crossfade math stays as it is. The view uses the shapes rendered to time-domain.
- `clean.ts`: generalize the BASIC 4-oscillator crossfade to accept custom PeriodicWaves (created once per context and cached).
- Remove `wtCloudList.ts`, `loadCloudTable`, `cloudId` and the cloud UI in `WavetableLibrary.tsx`. LOAD/IMPRT then share the button row. `listTables` filters out `wt:*-0` cloud ids, and the hydration fallback maps them to BASIC.
- Tests: there are exactly 20 factory tables, each with 4 shapes, finite and equal-RMS. The midpoint blend between neighbouring shapes keeps at least 90% energy. A cloud id resolves to BASIC.
- Update the AGENTS.md wavetable rule and the roadmap.
