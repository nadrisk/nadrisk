# NADRISK malfunction mode (easter egg)

## What the user experiences
1. Typing `nadrisk` anywhere (not inside a text box) starts the malfunction.
2. The screen fades out in steps, like old Pokemon transitions, with a small shake.
3. A black screen shows the word NADRISK in pixel letters, glitching (shifted rows, flicker, broken letters) for about 2 seconds.
4. The groovebox returns in a new NADRISK theme: toxic green on black, still 1-bit pixel hardware, with light glitch touches (occasional row offsets on screens, a corrupted header blink). No gradients or glow, so the visual identity holds.
5. While active:
   - DISP (theme change) is locked and shows `LOCK`.
   - Saving sets (SAVE, overwrite) and saving patches (SAVE, OVR, DUP, REN, import) are blocked with a short `NADRISK LOCK` message. Loading and exporting still work.
   - A heavy OTT squash sits on the master; the clipper uses a harder, nastier curve. Saturation and other effects still work normally.
6. Typing `nadrisk` again plays the same fade back, restores the previous theme, removes the master squash, and returns the clipper to normal.
7. A reload always starts in normal mode (nothing is stored).

## Safety
- Typing the letters must never play pads: `r` and `i` are pad keys. Only the final `k` completes the code, and pad presses for earlier letters still happen as usual (no input delay added to normal playing). This matches how the rest of the keyboard works today.
- Audio changes ramp in over about 50 ms and out the same way, so there are no clicks or volume jumps; the safety limiter stays last in the chain, so the squash cannot exceed the current ceiling.
- The master OTT is built once at startup and stays bypassed (fully dry) until needed, so turning it on never builds audio parts mid-play.
- The fade/glitch overlay never blocks audio, transport or MIDI; it only covers the screen for about 3 seconds and ignores taps.
- Phone: no keyboard, so the code is also accepted by tapping the ABOUT key 7 times quickly (optional; can be dropped).
- Native app gets the same behavior.

## Technical details
- `src/hooks/useNadriskCode.ts`: rolling 7-char buffer on keydown (skips inputs), returns a toggle callback.
- `src/lib/displayTheme.ts`: add a hidden `nadrisk` theme not included in the DISP cycle; `src/index.css` adds its `[data-lcd="nadrisk"]` palette tokens and a reduced-motion-safe glitch class.
- Page shells (`Index.tsx`, `NativeGroovebox.tsx`) own `malfunction` state plus the theme to restore; Groovebox receives `locked` to disable DISP.
- `src/components/MalfunctionOverlay.tsx`: stepped opacity fade + shake, pixel-canvas NADRISK glitch, then fade in.
- `SetBank.tsx` / `PatchBank.tsx`: `locked` prop blocks write actions.
- Master chain: insert a pre-built OTT stage after Clipper, before Limiter, wet ramped by mode; clipper curve swaps to a cached hard/asymmetric curve. Master screen order shown unchanged except a `NAD` flag.
- Record in AGENTS.md: malfunction mode is session-only and uses pre-built bypassed master stages.
- Verify: typecheck/tests, browser run of typing the code (fade, overlay, theme, DISP lock, save blocked, toggle back), and a level check that output stays under the limiter ceiling.
