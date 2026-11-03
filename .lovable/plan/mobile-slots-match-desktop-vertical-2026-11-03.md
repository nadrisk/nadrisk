# Mobile slots match desktop (vertical)

## Goal
On phones, the slot editors, effects and step-sequencer controls should look like the desktop rack, just stacked vertically: no black bars at the left and right of each screen and no extra divider lines between or inside slots.

## What changes
1. **Screens fill their slot width**: each pixel screen on phones scales to the full slot width (integer scale where it fits, otherwise the nearest crisp fit), so there are no black side bars.
2. **No extra divider lines**: remove the mobile-only top/bottom borders and separators on slot sections, including the step-seq controls slot. Each device keeps one clean frame, the same as on desktop.
3. **Same frame on both**: use the desktop device frame rules (outer border, inset, header) on phones too, so every module looks the same as on desktop.
4. **Tight vertical stack**: modules sit flush in one column with the same small gap desktop uses between them, and they line up with the screen edges the way desktop does.
5. **Touch stays intact**: knob, pad and hit-zone sizes don't change; only framing and spacing change.

## Technical details
- In `src/index.css`, take the `.device-panel` frame styles out of the `(min-width:1024px) and (pointer:fine)` gate so they apply everywhere; keep desktop-only layout (grid columns) gated.
- Remove the mobile `.px-wrap` full-width centering and the mobile border/divider rules on slot sections and the stepseq control block.
- In `PixelScreen`, on narrow viewports, compute scale from the container width (ResizeObserver already present) and let the canvas width match the wrapper, so it doesn't pillarbox.
- Check at 390px and 430px widths with Playwright screenshots against a desktop crop.
