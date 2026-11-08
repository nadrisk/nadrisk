# Dedicated Performance Mode + Linked Decks

## Goal
Move the live performance tools out of the sequencer into their own full-screen PERF mode (like AV), give the sequencer the freed space, then let phones link to an iPad that crossfades between them for a full live set.

## Stage 1 - Streamline the sequencer
- Remove the performance rack (FX screen, dub echo, loops, holds, mute/bank strip) from the sequencer frame.
- Step grid and sequencer screen take the full width; wider note bars and readable pitch labels.
- Mobile tabs drop the duplicate PERF tab; desktop switch stays DEVICES | SEQUENCER.
- Pattern bank keys A-D stay on the sequencer screen so nothing is lost while sequencing.

## Stage 2 - Dedicated PERF mode
- New PERF key next to AV opens a full-screen 1-bit performance window (`/?perf=1`), same pixel look.
- Contains everything moved from the sequencer: performance FX screen, dub echo throws, step loops, holds, 16 mute/solo keys, bank launcher, STUT/REV/STOP.
- Larger touch keys, laid out for iPad landscape and phone.
- Opened on the same device it drives the local groovebox directly (no link needed).

## Stage 3 - Link: iPad mixer with two phone decks
- Each device makes its own sound (plug each into its own mixer input, or the iPad's output if wanted later).
- iPad in PERF mode shows a two-channel mixer: Deck A / Deck B, each with LOW/MID/HIGH kill EQ, LP-HP filter, channel fader, and a centre crossfader.
- Phones join with a short room code and pick Deck A or B; the iPad's faders, EQ and filter control each phone's master output remotely.
- Shared tempo: the iPad sets BPM and bar start; phones snap to it so crossfades land on the beat.
- Set workflow: load a saved set on the idle deck, press play (it waits for the next bar), crossfade over.
- Needs Lovable Cloud for real-time messaging between devices (no accounts needed, room code only).

## Stage 4 - Jam / 64-step chaining (later)
- Two linked phones can chain into one long pattern (32+32 = 64 steps, playhead hands off between devices) or jam separately on the same clock.

## Technical notes
- Stage 1: delete `gb-seq-performance` from `seqPerformancePanel` in `Groovebox.tsx`, remove `perf` utility, clean related CSS in `index.css`.
- Stage 2: new `src/perf/` page shell mirroring `src/vj` routing; reuses `PerformanceRack` and `useGroovebox` performance state; when opened as a separate window, controls go over the existing BroadcastChannel bus pattern used by AV.
- Stage 3: Cloud realtime channel per room; messages carry absolute mixer state (idempotent, heartbeat-repeated). Deck EQ/filter/fader are applied in a new deck stage placed before the safety limiter. Clock sync via timestamped beat anchors with latency estimate; start quantised to bar.
- Tests: crossfader gain law, bar quantisation, deck state hydration.
