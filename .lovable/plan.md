# Monke 2.0 — the "stuck? ask Monke" button

## What you get
- The monkey button in the top bar becomes a one-press trigger (no more arming, no random visits, no catching, no `monke` typing needed — typing can stay as a shortcut that does the same thing).
- Press it: the big grinning Monke face flashes over the screen, then the animated monkey scampers across the step grid doing mischief while the pattern changes in front of you (about 4–6 seconds, edits land on the beat while playing, instantly-but-staged when stopped).
- While he works the button is greyed out and can't be pressed again; when he's done he laughs, the face flashes once more and the button comes back.
- One UNDO reverts his whole job.
- Silent: he never plays sounds himself, only changes the pattern.

## How the changes stay musical
Works on the whole current pattern bank, but each track is treated by its role (kick, snare, hats, bass, synth/pad):
1. Anchor rule — kick on beat 1 and snare backbeats are never removed; your main hits stay recognisable.
2. Small dose — each press makes 3–6 tasteful changes spread over 2–4 tracks, never a rewrite.
3. Kick: syncopated pickup before beat 3 or the bar end.
4. Snare: soft ghost notes in off-beat pockets, occasional flam/ratchet before the backbeat.
5. Hats: velocity swell (accented off-beats), slight push/pull nudges, a 2x/3x roll near the bar end.
6. Bass: in-key octave jumps, merging two neighbouring notes into one long note (slide feel), rest added to create space.
7. Synth/pad: call-and-response — copy a phrase from the first half into the second with one note moved in key; or lengthen a note into a held tone.
8. Turnaround fill: on the last steps of the pattern, a fill that only plays every 2nd or 4th loop (using the existing conditional steps), so the loop evolves without getting busier.
9. Everything snaps to the current key/scale; empty patterns get a small musical starter rather than chaos.

## Technical details
- `src/audio/monke.ts`: replace `mangleSequence/manglePattern` with `inspirePattern(bank, slots, bankIndex, harmony, random)` returning an ordered list of role-aware edits (pure, seeded random for tests). Remove periodic/catch constants.
- `src/hooks/useMonke.ts`: state machine idle → enter(face) → work(apply edits one by one, beat-timed when playing) → exit(laugh + face) → idle; `busy` flag locks the button; one undo snapshot at begin via existing `beginMonke/mutateMonke/endMonke`.
- `MonkeVisitor`/`MonkeSprite`: keep face overlay and animated sprite; drop catch hit-zone and bonk frame; button gets `disabled` + `aria-busy` while working.
- `Groovebox.tsx`: button calls `monke.trigger()`; remove armed/periodic wiring and Ctrl+Shift+M arming.
- Tests (`src/test/monke.test.ts`): anchors preserved, change count 3–6, notes stay in key, fills use conditions, button locked while busy, one undo restores pattern.
- Update `src/hooks/AGENTS.md` Monke rule and roadmap.
