# Redesign hat and clap presets

## What changes for you
- **OPEN HAT → TR-909 style:** a bright, crisp, hissy open hat. Fast clicky attack, a smooth noisy body high in the spectrum, little audible ringing tone, and a decay of roughly 300–400 ms that fades without a gong-like ring.
- **RIDE → TR-909 style:** a glassy, shimmering ride. Sharp "ping" stick attack, dense high metallic wash, and a long decay of about 1.2–1.6 s, bright rather than dark or bell-like.
- **SHORT SNAP → disco snap:** clearly louder and harder hitting. One tight crack with a bright band, a little drive and almost no room.
- **NATURAL:** louder and tighter. Fewer, closer hand bursts and a shorter room tail, so it sounds like a real clap but punchier.
- **SLOPPY:** still loose, but less so. Wider gaps than NATURAL, though no longer a smeared flam, and a shorter tail.
- CLOSED HAT, SHAKER, TR-808 STYLE and all kick and snare presets stay as they are.

## How it behaves
- Picking a preset still changes only the sound. Pad name, volume, effects, rhythm and chokes stay the same.
- Pads that already use these presets keep their saved sound until you pick the preset again. Double-tap reset uses the new sounds.

## Technical details
- Loudness: add an optional drum `gain` field (default 1, filled by `drumDefaults` so old sets are unchanged). It scales the final amplifier, so presets can be louder without touching the pad's LEV. Snap uses about 1.8, Natural about 1.4, capped by the existing limiter path.
- 909 hats in the current hat engine:
  - **Open hat:** noise-heavy (noise ~.7), high band (fltBase ~7000, highpass ~8000), low ring (.15), short transient click, spread ~1.25 for an inharmonic metal edge, decay ~.38 s.
  - **Ride:** lower noise (~.25), high pitch (~520) with spread ~1.35, fm ~2 for wash, cutoff ~5500, ring ~.35 at ~3800 Hz for the ping, stronger transient (.5), decay ~1.4 s.
- Claps:
  - **Snap:** bursts 1, tone2 ~3, noiseTone ~1800, drive ~.3, tail ~.04, d ~.07.
  - **Natural:** bursts 3, burstGap ~.006, tail ~.25, d ~.14.
  - **Sloppy:** bursts 4, burstGap ~.014, tail ~.4, d ~.24.
- Values are tuned by offline renders: peak/RMS checks for loudness and decay-time checks, with a listening pass in the browser. Existing preset tests are updated.
