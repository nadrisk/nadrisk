# Phrase sequencer: stronger chord sync, simpler loop, random interval dial

## 1. CHRD that you can actually hear in TRNC and EUCL
Right now CHRD only snaps each note to the closest chord note. TRNC and EUCL mostly use the root and octave/fifth, and those are already chord notes, so nothing changes.
- With CHRD on, TRNC and EUCL **walk through the chord**: every time the phrase plays a note, it moves to the next chord note (root → 3rd → 5th → 7th, with the octave going up on the next round).
- TRNC keeps its a/b rhythm: "a" walks up the chord, and "b" plays the chord note one INTV step above "a".
- EUCL hits go through the chord notes in order. ROTN also shifts which chord note the walk starts on.
- RAND phrases keep picking chord notes, but they go through the new SPRD dial (see 3).

## 2. Simpler LOOP
Today LOOP has three parts that work together (X1–X4 repeats, FIRST/LAST and LEN1–8). They repeat a few steps inside the phrase, and that is confusing.
- Replace all of it with one **DIR** setting: FWD, REV, P-P (ping-pong) and RND (random step order).
- Remove the FIRST/LAST and LEN keys and the repeat marks on the screen.
- Old sets: saved loop settings are ignored and load as FWD, so the notes play straight through.

## 3. SPRD dial for RAND
Add a new knob, **SPRD** (spread), that sets how far apart neighbouring random notes can be.
- Low: small steps between neighbouring scale notes, always moving, never stuck repeating one note.
- High: big jumps across up to two octaves.
- Rule: the next note never repeats the last one more than twice, and a phrase always uses at least 3 different notes (at least 2 when the chord only has 2).

## Technical details
- `src/audio/arp.ts`: add `chordWalk(order, chordTones, i)` for the TRNC/EUCL paths when `chordSync` is on. Replace `PhraseLoop` with `dir: "fwd"|"rev"|"pp"|"rnd"` in `phraseOrder`, and hydrate legacy `loop` to fwd. In `randomizeArp`, add `spread` (0–1) to scale the step range from ±1 to ±(span), plus the anti-repeat and minimum-distinct-notes rules.
- `src/components/ArpEditor.tsx`: the LOOP knob becomes DIR, remove the FIRST/LAST and LEN keys and the loop marks, and add an SPRD knob on the page with RAND.
- `src/hooks/useGroovebox.ts`: pass the chord-walk index (counter per pad, reset on transport start or set load).
- Tests: chord walk goes through each chord note in order for TRNC and EUCL; REV/P-P give the correct order; with low SPRD, neighbouring notes are at most 1 scale step apart; a phrase never gets stuck on 2 notes when the chord has 3 or more; a legacy loop loads as FWD.
