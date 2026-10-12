# Move ACID from POLY to the 808

Final layout of mode keys:

```text
POLY  : POLY <-> REESE
SIREN : DUB  <-> LASER
808   : 808  <-> ACID
```

## What changes for you
- The POLY mode key now toggles only POLY / REESE.
- The 808 screen gets the same mode key in its top-right corner, toggling 808 / ACID.
- In ACID mode the 808 shows the existing ACID pages (303: CUT/RES/ENV/DEC, SET: NOTE/ACC/DRV/wave/mode) and the reactive `303` display, unchanged in sound.
- 808 and ACID keep separate settings, so switching never overwrites either sound.
- Old saved sets with a POLY pad in ACID mode open as an 808 pad in ACID mode with the same ACID settings, so nothing is lost.

## Technical details
- `Bass808Params` gains `mode?: "808" | "acid"` and `acid?: Partial<AcidParams>`; `PolyParams.mode` drops `"acid"`.
- Move the ACID panel branch from `EnsemblePanel.tsx` into `Sub808Panel.tsx` (mode key + drawMode, same `drawAcidDisplay`); remove the ACID cycle from the Poly mode key.
- `useGroovebox.ts` trigger: when `engine === "808" && bass.mode === "acid"` call `playAcid` (mono cut, decay scaled by factor, phrase slide kept); move `relOf`, single-note, chord-arp exclusion and live `mono.update({acid})` checks from poly to 808.
- `voices.ts`: remove the acid branch from `playPoly`.
- `SlotEditor.tsx`: drop the poly-acid voice-screen exception (POLY voice screen shows again for POLY/REESE only).
- Set hydration: a slot with `poly.mode === "acid"` migrates to `engine: "808"`, `bass.mode: "acid"`, `bass.acid = poly.acid`, `poly.mode = "poly"`.
- Update tests and the AGENTS.md ACID rule; run tests and a browser check of mode switching, playback and recall.
