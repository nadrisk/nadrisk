# Redesign hat and clap presets (909-informed)

## What the research shows
- **909 hats and ride are not synthesized.** On the real TR-909, the hi-hat, ride and crash play 6-bit recordings of real cymbals stored on chips. Each recording runs through a simple level fader (open and closed hats have separate decay knobs), then a low-pass filter that removes the digital whine.
- **What gives them their character:**
  - a dense, hissy, non-tonal metal wash, not a ringing tone;
  - a slightly gritty, crunchy edge from the 6-bit data;
  - a soft top end from that low-pass filter (around 15 kHz rather than glassy air);
  - a smooth, clean fade.
- **909 claps are synthesized**, almost exactly like the 808: band-passed noise through about three or four fast back-to-back hits, a few milliseconds apart, then a separate noise "room" tail. They sit in roughly the 1–4 kHz band, which is why they cut through a mix.
- We can't ship Roland's original recordings, so the hats are recreated in our existing hat sound, plus one new ingredient: a 6-bit grit stage.

## What changes for you
- **OPEN HAT → TR-909 style:** a dense, hissy, slightly crunchy wash with a quick tick at the start, little ringing tone, a softened top end and a smooth fade of about 350 ms.
- **RIDE → TR-909 style:** a bright, glassy, shimmering wash with a clear stick "ping" and a little 6-bit grit, fading smoothly over about 1.4 s. Bright rather than dark or bell-like.
- **SHORT SNAP → disco snap:** clearly louder. One hard, bright crack in the upper mids, a touch of drive and almost no room.
- **NATURAL:** louder and tighter, built like the 909: three close hits about 5 ms apart and a short room tail.
- **SLOPPY:** still loose, but no longer smeared. Four hits with moderate gaps and a shorter tail.
- **Unchanged:** CLOSED HAT, SHAKER, TR-808 STYLE and all kick and snare presets.
- **Picking a preset** still changes only the sound. Pad name, volume, effects, rhythm and chokes stay the same. Pads already using these presets keep their saved sound until you pick the preset again.

## Technical details
- New optional drum fields, filled by `drumDefaults()` so old sets play exactly as before:
  - `gain` (default 1) scales the final amplifier, so presets can be louder without changing the pad's LEV.
  - `grit` (default 0, hats only) runs a 6-bit staircase waveshaper with a cached curve (no per-hit buffers) into a ~14 kHz lowpass, to recreate the ROM character.
- Recipes, as starting values tuned by offline renders:
  - **Open:** noise ~.75, ring ~.1, spread ~1.3, fm ~3, highpass ~7500, grit ~.6, transient .3, d ~.35.
  - **Ride:** pitch ~520, spread ~1.35, fm ~2, noise ~.3, ring ~.3 at ~3800 Hz, cutoff ~5000, grit ~.4, transient .5, d ~1.4.
  - **Snap:** bursts 1, noiseTone ~1800, tone2 ~3, drive ~.3, tail ~.04, d ~.07, gain ~1.8.
  - **Natural:** bursts 3, burstGap ~.005, tail ~.25, d ~.14, gain ~1.4.
  - **Sloppy:** bursts 4, burstGap ~.013, tail ~.4, d ~.24.
- Checks:
  - offline renders checking peak/RMS loudness against the TR-808 STYLE clap, decay times, and that the sound fades to silence;
  - preset tests updated;
  - a browser check of preset selection and recall.
