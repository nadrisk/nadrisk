# Reverb: lush, cloudy, Massive-style + a better MIX

## Why it still sounds metallic
In the current design, each echo bounces between plain delay lines with nothing to smear it between bounces. Our wobble is also very shallow (about 0.1–0.5 ms). The ear still hears the repeating pitch of each line, and that's the metallic ring. Making the lines longer didn't remove that pattern.

## The sound we're going for
NI doesn't publish how Massive's reverb works, so we're aiming for its character: dark, soft, chorus-like and cloudy, with no audible echoes or ringing. We'll build our own design to get there.

## New reverb design
- **Smearing inside the loop, not only before it.** Each of the 8 paths gets its own smear stage on every bounce. Echoes keep blurring as they repeat, so no pitch can build up. This is the main fix for the metallic sound.
- **Deeper, chorus-like wobble (about 1–3 ms)** on those in-loop smear stages, each at a different slow rate. It makes a lush, slowly moving cloud, like a chorus spread across the whole tail.
- **Dark by default.** The highs soften with every bounce, and a gentle low cut keeps the low end clean so the bass doesn't get muddy.
- **Soft bloom.** The tail builds up over the first ~50–100 ms instead of starting with a hard first echo.
- Knobs stay the same:
  - **SIZE:** tail length plus room scale.
  - **DENS:** how fast it turns into a cloud, and how deep the chorus wobble goes.
  - **DAMP:** how dark the cloud is.
- The decay stays correct: smooth fade to silence at the SIZE time.

## MIX: what other plugins do
- Most reverb and delay plugins use a −3 dB mix law [4](https://forum-amz.cockos.com/showthread.php?p=2458950). Valhalla, for example, uses a sine/cosine crossfade where 50% is an equal mix [5](https://valhalladsp.com/2015/11/08/valhallaplate-the-controls/). We already use that curve.
- Engineers point out that a reverb's output loudness has to be matched to the dry sound, or the crossfade feels lopsided even with the right curve [1](https://docs.rs/rt-fft-convolver/latest/src/rt_fft_convolver/engine/mixer.rs.html). Our reverb has never been matched, which is why under 50% sounds too quiet.

So the new MIX does two things:
- **Matched wet level:** the reverb's loudness is set so that at 50% the reverb and the dry sound feel equally loud, at any SIZE or DENS.
- **Dry-hold curve** (an alternative mix law some instruments use for built-in effects): the dry sound stays at full level until 50% while the reverb fades in. From 50% to 100% the dry fades out while the reverb stays full. Low settings already add clear reverb without thinning your sound, and 100% is fully wet.

## Checks
- Test that the tail decays smoothly to about −60 dB at the SIZE time and stays bounded at max.
- Test that the tail has no strong repeating pitch peak (the metallic ring).
- Test that wet loudness at 50% stays within a few dB of dry across SIZE and DENS settings.
- Test the MIX curve: dry at full up to 50%, reverb at full from 50%, and 0% and 100% are pure dry and pure wet.
- Browser check for errors on a pad, then your ear test.

## Technical details
- `src/audio/advanced.ts` NadReverb: keep the pre-delay and input diffusers. In each of the 8 FDN lines add a modulated allpass (fractional read, LFO depth ~1–3 ms scaled by DENS, g ≈ 0.5–0.6) before the Householder mix. Add a one-pole HP (~120 Hz) on the wet input, and short attack smoothing on the injection. Compute the output gain from an energy estimate per SIZE/DENS (lookup computed in setup) so wet RMS is about equal to input RMS.
- `src/audio/effects.ts` update(): reverb mix law becomes `dry = min(1, 2·(1−m))`, `wet = min(1, 2·m)` with gentle easing at the corners.
- Update `src/audio/reverb.test.ts` and the reverb rule in `src/audio/AGENTS.md`.
