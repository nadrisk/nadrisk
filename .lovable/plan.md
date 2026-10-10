# Rebuild the drum engine: kick, snare, hat and a new clap

## Why the hat pitch controls do nothing
All three drum types share one generic voice: a single oscillator plus noise through one filter. On the hat:
- The pitch sweep only moves that one oscillator. The metallic parts (FM and ring) stay at fixed pitches and don't follow the pitch or the sweep.
- That oscillator is only 30% of the mix, behind a 7 kHz high-pass filter, so most of what you hear is noise.
- The default hat pitch sweep amount is 0, so pitch decay has nothing to shape.

Kick and snare have the same limits: one oscillator, one shared decay for body and noise, and no separate click or snap.

## Recommendation: one dedicated model per drum
Each model follows a proven analog drum-machine design, the same circuits behind the 808, 909 and 707.

1. **KICK:** a sine body with its own pitch sweep (amount and decay), plus a short click transient (level and tone) and soft drive. Separate decay controls for the body and the click.
2. **SNARE:** two tuned body oscillators (the classic 808 design) plus a "snappy" noise layer. The noise has its own filter and decay, so body and rattle can be balanced. The pitch sweep moves both body tones.
3. **HAT:** six square oscillators at the classic 808 metallic ratios, through a band-pass and a high-pass filter. Pitch and pitch sweep move the whole set, so the controls are clearly audible. A tone/noise blend and separate decays support closed, open and ride sounds.
4. **CLAP (new):** three or four very short noise bursts about 10 ms apart, then a longer filtered tail. Controls: number of bursts, spread, tail length, filter tone and resonance.

## On screen
- The drum screen shows each model's own controls on the same pixel pages: SOURCE, PITCH, NOISE, FILTER and ENV.
- The kind selector gains a fourth option: KICK / SNR / HAT / CLAP.
- The CLAP pad switches to the new clap model.
- Envelope pages keep the draggable ADSR graph.
- Each model's visual reacts to its own controls: the pitch-sweep curve, the burst pattern for the clap, and the oscillator set for the hat.

## Kept as-is
- Saved sets still load. Older drum settings are carried into the new models, and any missing values get defaults.
- MIDI learn, the sequencer, effects, choke groups and recording are unchanged.

## Check
- For each kind, move every control, confirm the sound clearly changes, and look at the waveform.
- On the hat specifically, confirm pitch and pitch decay are clearly audible.
- Check that an old saved set still loads and sounds close to before.

## Technical details
- `src/audio/voices.ts`:
  - `DrumParams.kind` gains `"clap"`.
  - Add optional fields: `click`, `clickTone`, `bodyDecay`, `noiseDecay`, `noiseTone`, `tone2` (snare second-oscillator ratio), `bursts`, `spread`, `tail`.
  - `playDrum` dispatches to `playKick`, `playSnare`, `playHat` and `playClap`, all on the shared raw context.
  - Hat: 6 square oscillators at the ratios 1, 1.304, 1.466, 1.787, 1.932, 2.536 times `pitch`, with `pitchEnv`/`pitchDecay` ramps applied to every oscillator.
  - Clap: noise bursts scheduled as gain spikes, then a tail decay, through a band-pass filter.
- `src/hooks/useGroovebox.ts`: default values for the new fields, update the CLAP preset, and fill in missing fields when older sets load.
- `src/components/DrumkitPanel.tsx`: per-kind pages, knobs and visuals. Labelled hit zones are kept so MIDI learn still works.
