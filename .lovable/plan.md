# Next batch: poly fix, phaser, vibrato, trance gate, metal, spectral gate, SP crusher

## Credits
You have about 7.3 credits left this month, plus 5 free daily credits that reset at 02:00 your time. The whole list is too much for that. A big change like this usually costs a few credits per item, so 7.3 should cover the first two or three groups below. The rest can carry on as daily credits come back, or after a top-up.

## Order (bugs first, then cheapest wins)
1. **Poly retrigger bug.** Right now, hitting the pad again while the chord is still ringing out goes silent until the tail nearly ends. Fix: each new hit always plays straight away, and the old tail fades out using the current release.
2. **Phaser doesn't work.** Find out why it's silent or has no effect, then fix it so RATE, DEPTH, MAN, FDBK and MIX are all clearly audible.
3. **Vibrato cleanup + LOFI.** Remove MIX, since it does the same job as DEPTH. Add a **LOFI** switch for a tape-style warble: slow wow plus faster random flutter, with a little tape tone and saturation. It learns from open-source wow/flutter designs such as the ChowDSP tape model.
4. **Trance gate.**
   - **TIGHT** knob: shortens each gate and adds a decay, so four lit steps in a row still sound like separate hits.
   - **PRESET** picker with classic trance patterns: straight 16ths, offbeat, 3-3-2, gallop, stutter and others. You can still edit each step afterwards.
   - The fastest synced speed goes up from 1/16 to 1/32.
5. **Metal: tape-style time changes.** Turning TIME should glide the delay smoothly, so you hear the pitch bend the way you do on a tape delay, instead of a jump.
6. **Spectral gate (one knob).** Replace the band-bank with a real spectral gate: it splits the sound into many frequency bands and keeps only the loudest ones. One **AMOUNT** knob takes it from clean to sparse and glassy, with MIX kept. Saved sets that use the old spectral effect still load.
7. **Bitcrusher SP mode.** Adds an **SP** switch for the SP-1200 / MPC60 sound: a low sample rate (26 kHz or 40 kHz), 12-bit, aliasing with no smoothing filter, plus the SP-1200's output filter and a little grit.

## Not changed
Other effects, instruments, sequencing, layout and themes. Old sets keep loading.

## Checks
For each change: typecheck, tests and build, plus measurements in a test browser. I can't listen to any of this, so it needs your ear test.

## Technical details
- Poly: look at the held-voice and ring-list path in `useGroovebox.ts`/`voices.ts`. A retrigger probably reuses or blocks the releasing voice; give each hit a fresh voice and call `release()` on the old ones.
- Phaser: check the node wiring for type "phaser" in `effects.ts`.
- Vibrato: drop the `mix` param (hydration ignores it), add `lofi`, add a smoothed random LFO into the delay time plus a lowpass and soft clip.
- Gate: add `tight`, change the per-step envelope to attack plus exponential decay scaled by tight, add `preset` as an index into a mask table, and extend `SYNC_DIVS` to 1/32 for the gate only.
- Metal: use `setTargetAtTime` on `delayTime` with a time constant of about 80–150 ms.
- Spectral: a worklet doing an FFT (512 points with overlap), keeping the bins above a percentile set by AMOUNT; give it a load cost.
- SP: a worklet that does sample-and-hold to 26.04k or 39.0k, quantises to 12 bits, then a fixed lowpass (SP-1200 style).
