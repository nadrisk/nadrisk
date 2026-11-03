# Plan: Sound fixes, IDM rework, rhythm generators and visuals

## 1. Hat drum fix
- Bring the hat back to full volume and give it a bright, open tone again (remove the doubled high filtering and the reduced level).
- XY pad on the hat: OPEN lets the hat ring long like an open hat; TIGHT chokes it into a closed tick.

## 2. TIGHT = plucky on every XY pad
- Dragging toward TIGHT shortens decay and release, lowers sustain and speeds up the attack on every instrument, so sounds turn short and plucky.
- OPEN, DARK and BRIGHT stay exactly as they are now.

## 3. IDM drums: short, percussive hits
- Keep METL as it is, just shorter at most.
- Replace PING and rework CLIK and SHRD with better-known experimental percussion types: a short FM/zap blip (ZAP), a noise snap/crackle (NOIS), a glitch click with a pitch drop (CLIK), a bit-crushed tick (SHRD).
- Every IDM sound is capped at short lengths (about 5–250 ms) so nothing turns into a big, long sound.

## 4. IDM screens redesigned
- Visuals in the same style as the DRM synth: one clear picture per page that changes as you turn the knobs.
- ENV page gets special attention: a single clean hit shape (attack, decay, bend, grit) drawn large with labelled points, no overlapping lines.

## 5. Empty sampler pads by default
- First load and NEW start with 16 silent, empty sampler pads instead of 16 kicks.

## 6. Euclidean in the phrase sequencer
- New EUCL page with HITS, STPS, ROTN, GATE and a pulse ring picture.
- The rhythm decides which steps play; the phrase notes stay the same.

## 7. LATN in the sequencer generator
- One LATN style that generates a whole drum arrangement (kick, snare/rim, hats, open hat, percussion), randomly mixing cumbia, Afro-Cuban and bossa/samba feels. Works with the existing DENS/FILL/VARY knobs and undo.

## 8. Two-note trance rhythms (TRNC)
- Replace the old trance patterns with four two-note rhythms named after their shape: 332 (a b · a b · a b), PUSH, GALL, ROLL.
- INTV knob picks the upper note: octave, 5th, minor 7th or minor 3rd.

## 9. Metal effect picture reacts again
- Keep the current METAL picture, but connect it to the five knobs: TUNE, RING, CLNG, DAMP and MIX all visibly change it.

## Technical details
- Hat: drum voice hat branch and output filter defaults in src/audio/voices.ts; hat entries in xyMaps.
- TIGHT: shared tight-axis curve in src/audio/xyMaps.ts scaling decay/release/sustain per engine.
- IDM: src/audio/idm.ts models + decay clamps; IdmPanel.tsx redrawn with PixelScreen in the DrumkitPanel style; legacy PING sets map to ZAP on load.
- Default pads: blankSlots() in useGroovebox → empty sampler slots.
- Euclidean: Bjorklund helper in src/audio/arp.ts, EUCL page in ArpEditor.tsx, stored per slot.
- LATN: new entry in the break generator styles with role-aware templates.
- TRNC: two-note pattern tables + INTV in arp.ts / ArpEditor.tsx.
- Metal: FxChain.tsx graphic reads metal/feedback/decay/tone/mix instead of drive.
- Tests: Bjorklund output, IDM decay caps, TIGHT shortens decay, empty default pads, 332 pattern steps.
