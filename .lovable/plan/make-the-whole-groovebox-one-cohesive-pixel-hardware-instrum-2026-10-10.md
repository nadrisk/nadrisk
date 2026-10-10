# Make the whole groovebox one cohesive pixel-hardware instrument

Everything — including the slot boxes the instruments live in — moves to the same 128×64 pixel-screen look as WISPDISK. The audio engine, sequencing, MIDI learn, sets and rack behaviour stay untouched. Work runs in four steps, each checked in the browser before the next.

## Step 1 — Slot chassis (the "windows")
- Replace the patcher window look (inlet/outlet dots, OS-style title bar) with a flat hardware module: 1-pixel border, inverted name strip, no rounded corners, no shadows.
- The slot's top controls move onto a pixel **SLOT screen**: name (tap to edit, letter wheel), MUTE key, instrument selector (DRM / SYN / SMP / PLY / 808 / SRN keys), VOL and PAN knobs, CHOKE 0–4 key.
- The chord-pad group becomes a **CHORD screen** (ON, voicing, inversion, spread, block/strum/arp, order, rate, strum time).
- The sample picker becomes a **LIBRARY screen**: scrolling pixel list of library + your samples, LOAD FOLDER and IMPORT keys (the real file chooser opens behind them).
- No browser dropdowns, text boxes or shadcn buttons remain in the slot.

## Step 2 — Master, tape deck, performance rack
- Master output, clipper/limiter and mastering EQ as one pixel screen with pages.
- Reel-to-reel recorder as a pixel screen with drawn reels, REC/PLAY/STOP, WAV/MP3 export keys.
- Performance rack keys (DJ filter, repeat, offset/loop) as pixel keys and knobs.

## Step 3 — Effects and phrase sequencer
- Per-pad effect chain as a pixel list screen (add/remove/reorder, one page per effect).
- Phrase sequencer (ArpEditor) as a pixel step screen with scale/root/rate pages.

## Step 4 — Pads, step grid, mixer, visualizers, transport
- Pads and step grid drawn as pixel blocks with velocity bars and roll counts (touch and multi-touch behaviour unchanged).
- Mixer as pixel ladder meters with mute/solo keys.
- Visualizers rendered on the same 128×64 grid; transport rail as pixel keys.
- Every outer section uses the same module chassis as the slots.

## Technical details
- New shared `ModuleChassis` replaces `PatchNode` styling (keeps the same props so all sections switch at once).
- New screens built on `PixelScreen` + `Zone`/`Tap` with aria-labels, so MIDI learn, arrow keys and double-click reset keep working.
- Text entry (slot name) uses a pixel letter-wheel `Zone`; file pickers stay as hidden inputs triggered by `Tap`.
- Legacy patcher/web-control CSS is removed from `index.css` as each step lands, not layered over.
- Themes stay as they are (1-bit OLED default, LCD, acid).

## Check after each step
- Build passes; Playwright check at desktop and phone widths: change values, switch pages, confirm sound and saved sets still work.
