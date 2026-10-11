# Sequencer: KICK ties, row faders, remove RST

## 1. KICK row can't tie
- **What I checked:** on a simulated phone, KICK behaves like every other row. Tap a step after a hit and it becomes a hit, tap it again and it becomes a tie. So I haven't found the cause yet.
- **Leading suspects:**
  1. On your iPhone, a tie on the KICK row may be drawn as a solid block, so it looks like a hit. In your video some KICK blocks span several steps.
  2. Or each touch on that row might reach the step twice, so it jumps straight from hit to off.
- **Plan:**
  - First, re-check KICK at your iPhone's screen size with real touch taps, and compare what is stored in each step against what is drawn.
  - Then fix whichever it turns out to be: make ties always look striped on every row, or stop the double toggle.
  - If neither shows up here, I'll add a temporary tap counter on the SEQ screen so your iPhone can show what happens.

## 2. Row faders for VEL, CHNC and ROLL
- On the VEL, CHNC and ROLL pages, each row gets a small fader on the left, next to the row name. The mod-target box moves out of the way on those pages; it stays on the MOD page.
- Moving a row's fader sets that value on every hit in the row:
  - **VEL:** 5–100%
  - **CHNC:** 0–100%
  - **ROLL:** x1–x8
- The fader shows the row's current value, or the highest one if the steps differ. Drag it up for full velocity or chance on the whole row.
- Double-tap the fader to reset it: 100% for VEL and CHNC, x1 for ROLL.
- You can still drag single steps afterwards to fine-tune them.
- Faders affect the current bank only (A or B). MIDI learn works on them like on other controls.

## 3. Remove RST
- RST is removed from the SEQ screen, because it loads the startup sequence. RAND, CLR and CPY stay where they are.

## Checks
- Typecheck, tests and build.
- Simulated-phone check: ties on KICK, each fader changing its whole row, and RST gone.
- Your iPhone test.

## Technical details
- `Groovebox.tsx` StepGrid: in vel/chance/roll views, render a vertical pointer fader in the mod-column slot (aria-label "<row> row velocity/chance/roll"), calling a new `setRowValue(kind, row, v)` in `useGroovebox.ts` that maps over cells where pattern !== 0 in the current bank.
- `HwScreens.tsx` SeqScreen: drop the RST key and its `reset` prop wiring.
