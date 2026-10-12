# LASER starting patch and short pitch attack

## Starting patch
Use your settings whenever LASER is selected for the first time on a pad:

| Control | Default |
|---|---:|
| Detune | 25 cents |
| Tone | 12 kHz |
| Level | 80% |
| Pitch amount | +24 semitones |
| Pitch decay | 750 ms |
| Pitch curve | 4.80 |
| Amp attack | 1 ms |
| Amp sustain | 100% |
| Amp release | 300 ms |

Keep SAW as the starting waveform and retain the pad’s NOTE. Amp decay was not specified: leave it at 180 ms; with sustain at 100%, it does not reduce the held level.

Double-click/tap resets return the LASER controls to these starting values. Switching DUB → LASER again must restore that pad’s edited LASER sound, not overwrite it. Existing saved sounds keep their explicit values; missing fields receive defaults. Set the shared pad level to 80% only when first initializing LASER, not on every mode switch.

## Short pitch attack
- Add ATK to the PEN page alongside AMT, DEC and CRV, within the same screen and frame.
- Limit pitch attack to **0–100 ms**, with fine adjustment near zero and a **10 ms** starting/reset value for new LASER patches.
- At a nonzero attack, pitch starts at the root, moves to the signed AMT peak, then follows the existing curved decay back to the root. No overshoot beyond AMT and no repeating LFO.
- At zero attack, retain the immediate pitch jump and decay behavior.
- Draw the rise and fall from the same trajectory used by the sound. Positive and negative amounts mirror one another; zero amount stays flat.
- Old saved LASER patches lacking pitch attack use **0 ms**, preserving their existing sound.
- Envelope edits affect the next hit without restarting the current sweep. Keep the existing live tone, detune and level editing.

## Technical details
- Update defaults and the pitch-trajectory helper in `src/audio/laser.ts`.
- Add the optional attack field to the LASER settings, fill it safely during hydration, and schedule attack/decay on the shared audio clock in `playLaser`.
- Keep pitch interpolation musical in semitones; the time control must handle zero explicitly and give short times adequate travel. Preserve labelled MIDI mapping and explicit resets.
- Update `SirenPanel` with the fourth PEN knob and matching graph; initialize LASER defaults only when no LASER patch exists yet.
- Record the updated architecture rule and save your chosen defaults as project requirements during implementation.

## Verification and checkpoint
- Test defaults, reset values, first selection versus mode recall, and saved-set round trips.
- Test attack at 0, 10 and 100 ms with amounts −24, 0 and +24: bounded pitch, exact root return, no invalid samples or stuck tails.
- Check rapid hits, held pads, sequence playback, MIDI endpoints, and desktop/phone screen fit.
- Run tests and check preview errors; leave DUB, other instruments, effects and the overall layout untouched.
- Pause for your listening test: compare the new hopping attack at short settings against zero attack before further sound changes.