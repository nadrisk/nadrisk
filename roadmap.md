# Roadmap

## Sharp VJ models (2026-10-24)
- [x] Keep POLY/WIRE; replace radial sculpts with TESSERACT, KNOT, STELLA and vector SMILEY
- [x] Restrict orbiting satellites to POLY; test model switching and real object scaling
- [x] Verify desktop and phone-sized rendering plus real kick-pad event reactions; five regression tests pass

## Recording and input fixes (2026-10-18)
- [x] Preserve tape recording across Devices / SEQ / PERF and utility switches; browser capture survives switching and WAV remains available
- [x] Verify performance routing and enforce the enabled master limiter's peak ceiling; stereo peak guard regression tests pass
- [x] Harden sampler microphone arming and show actionable failures; simulated microphone arms and saves REC 01 in the browser
- [ ] Confirm microphone arming on user's iPhone (requires the user's device)

- [x] Allow nadrisk.com and www.nadrisk.com without weakening unknown-host copy protection; covered by origin regression tests

- [x] Anchor Performance SET to TIME's shared layout column; verified matching centers, clearances and SET interaction at 320/393/768/1280px

- [x] Combine desktop Memory/Patches, hide Memory scrollbar and relocate Performance Reset; verified save/load, scrolling, Reset and desktop/mobile spacing

- [x] Restore drum header values beside six tabs; verify knobs, resets, MIDI and phone/desktop framing

- [x] Add sixteen complete drum presets; browser-check all selections, preset resets and recall; offline renders finite with distinct tails
- [x] Add compact ACID voice and sound-reactive 303 display; verify saw/square sweeps, bounded resonance, release silence, mode recall, MIDI and phone canvas
- [ ] User listening and real-iPhone ACID response check; complete phrase-slide/velocity integration and comparable POLY/REESE performance measurements (6x-throttled rapid taps were heavily busy with both 303 and SET visible)

- [x] Replace rejected REESE hands with dark interference waves; verify controls, bounds, sound reaction and screen performance (real iPhone responsiveness remains unverified)

- [x] Verify all-partial previews and silent empty additive oscillators

- [x] Correct and verify synth waveform preview sampling without audio changes

- [x] Apply chosen LASER defaults and short pitch attack; verify resets, recall, audio and screen

- [x] Add LASER siren mode, signed pitch envelope, detune and fixed resets
- [x] Verify LASER audio, mode recall and pixel-screen interactions
- [ ] User listening test of short LASER pitch attack (waiting on user)

- [x] Make groovebox compact and tidy on laptop/desktop: capped pixel-screen scale, centered 1150px workspace, flatter pads
- [x] Give desktop devices uniform inner and outer frames without cropping their screens
- [x] Replace competing device shells with shared grid-owned framing and verify rendered alignment

## Groovebox update program (2026-10-15)
- [x] Space play/stop (KEYS), STOP resets phrases, pad COPY/PASTE, offset step taps
- [x] Cutoff readout, EFM knob, WET on FLT page (LFO depths already default 0)
- [x] 3 mod lanes (M1-M3), poly pitch mod, sampler start mod, RAND exclude/solo per row
- [x] Empty sampler pads silent until loaded
- [x] New DnB/dubstep/hip-hop/IDM kicks and snares, tighter 808 clap
- [x] MORPH OPPOSE, vibrato VIB/TAPE (wow, flutter, azimuth drift, BUMP, OXIDE), NADRISK logo flash, ACID easter egg
- [ ] Factory patch bank (next turn)
- [ ] Cyberspace SPEC mode (next turn)
- [ ] NADRISK Failure stage (next turn)
- [ ] MIDI keyboard on selected pad, STEP REC, chord grouping (next turn)

## Master plan (2026-10-15, grouped by size)
- [x] A: drum DRV 0, blank empty sampler, 808/ACID + Siren mode keys, Siren knob tidy, tap wave key
- [x] B: LASER mono, page-aware CLEAR, 4 kick/4 snare presets from uploaded patches
- [x] C: VIB/LOFI key + cassette, reverse-delay arrows, acid pedal screen
- [x] D: Big Muff fuzz sound (needs ear test)
- [x] E: Phrase TRANCE mode (TRNC page)
- [ ] F: Trippy acid visual
- [ ] G: factory patches, NADRISK failure, MIDI keyboard, SPEC mode

## Mono release, FX screens, Da Funk drive, sequencer RND (2026-10-15)
- [x] Siren/DUB joins 808, ACID, REESE, LASER mono tail cut
- [x] acid.drive~ rebuilt as Da Funk drive + compressor (needs ear test)
- [x] Live acid pedal, still LOFI cassette, live reverse arrows
- [ ] Restore dedicated, aligned ·/X/S row keys and LEN header; verify phone/desktop RAND and editing flows
- [ ] Factory patches (item 4 of earlier plan)

## Destination labels and 303 pops (2026-10-15)
- [ ] Destination-name instrument switches, preserving settings
- [ ] Diagnose sequenced 303 pops with acid drive; targeted audio fix and regression checks

## Accent onset check (2026-10-16)
- [ ] Test short accent-scaled cutoff/VCA rises, preserving ordinary attacks and Da Funk drive
- [ ] User listening comparison of accented sequencer playback with acid drive (waiting on user)
- [x] SPEC synth: true FFT GATE (peak-relative), TIGHT = band width, SHIFT glides live

## Chorus/flanger rebuild (2026-10-16)
- [x] Juno-60 chorus (MODE I/II/I+II, MAN, ENV, NOIS, WDTH) and ADA flanger (MAN, RNGE, ENH ±, ENV, WDTH)
- [ ] Ear test (waiting on user)

- [x] Sampler IN page: arm mic/instrument through pad FX, FREE/SYNC recording into the pad
- [x] Sequencer X2: per-bank 16/32 steps with half paging

- [x] LIVE/PROD buffer key on MASTER OUT (needs ear test on laptop)
