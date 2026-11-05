# AV: rename VJ, real Depthcore backdrop, convincing live-code editor

## 1. Rename VJ to AV
- The top-bar button, overlay label, pop-out window title ("Nadrisk AV"), on-screen header (`// NAD_AV`) and quick guide text all say AV.
- The pop-out link `/?vj=1` keeps working and `/?av=1` is added, so existing TV setups don't break.

## 2. Depthcore backdrop, closer to the real style
The real Depthcore look (Justin Maller and the collective's chapters) is not a lumpy blob. It is:
- **Sweeping layered ribbons and shards**: long, thin, curved strips that fan out from one point, overlapping in depth like folded paper or glass.
- **Sharp faceted edges**: planes split into thin triangular slivers, with crisp highlight lines along their edges.
- **Strong depth**: bigger, darker shapes in front and finer ones behind, with a single light so faces go bright to dark across the fan.
- **One composition**, centred, with a lot of empty space around it.

How it will look in our 1-bit style:
- A fan of about 24 to 40 twisted ribbons spiralling out from a core. Each ribbon is cut into thin facets, shaded with dither patterns, with a solid 1px highlight on its leading edge.
- Ribbons in front are drawn larger and with denser shading; ribbons behind are thinner and lighter, so the depth reads.
- Sound response: the kick opens the fan wider for a moment, the snare turns the whole piece a quarter step, hats make the edge highlights shimmer, and synths slowly twist the ribbons. The piece always drifts slowly, even when nothing is playing.
- No satellites, particles or other extra objects.

## 3. A live-code screen that passes for the real thing
This is modelled on what a real Strudel or TidalCycles set looks like:
- **Editor layout**: line numbers in a narrow gutter, a top bar like `strudel  ▶ playing  132 bpm  cps 0.55`, and a blinking block cursor.
- **Real-looking code**: `setcps(132/60/4)`, then one `$:` block for each pad that plays, with chained calls on indented lines, for example:
  ```text
  $: s("bd*4").bank("RolandTR909")
    .gain(.9).lpf(sine.range(400,2000).slow(8))
  $: note("<c3 eb3 g3 bb3>").s("sawtooth")
    .room(.4).delay(.25)
  ```
  The patterns are written in compact form (`bd*4`, `[~ sd]*2`, `hh*8?`) and are built from the steps each pad actually plays. Effect values come from that pad's real settings, such as filter, reverb and delay amount.
- **A human typist**: the cursor moves to the spot being changed, deletes the old characters, and types new ones at an uneven speed with short pauses. Sometimes it makes a typo and fixes it. Edits happen when the pattern really changes, and sometimes as small extra tweaks too (for example `.gain(.8)` becomes `.gain(.85)`).
- **Muting like a performer**: when a pad stops, its line gets `_$:` or a `//` comment, like a real performer muting a part. After a while the block is deleted line by line.
- **Playback highlights**: the token that is playing right now gets an outline box, the way Strudel highlights it. A small `.punchcard()` style row of dots sits under the busiest pattern.
- **Evaluation flash**: after each edit, the changed block flashes once, like pressing Ctrl+Enter, and a status line reads `// evaluated`.
- **Readable text**: lines sit on solid blocks over the backdrop, as now. Text size adjusts for phone and TV screens, and long lines wrap with an indent instead of being cut off.

## Technical section
- `src/vj/liveCode.ts` will be rewritten as a document model with a list of lines, a cursor, and a queue of edits that move the cursor, delete and type characters. A typing scheduler adds random but seeded delays. Mini-notation compression (`bd*4`, repeats, `?` for chance) will be a pure function with tests.
- Pad effect values reach the AV window through the existing `hit.pad` payload (`fx` summary fields are added in `useGroovebox.ts`). No new audio routing is added.
- Depthcore will be a new `src/vj/depthcore.ts`, a pure ribbon-geometry generator (fan, twist, facet split) drawn with the existing dither triangle filler. A test checks that it has no satellites and only a bounded number of ribbons.
- The rename touches the labels and the page route only. The internal `vj` folder and message channel names stay the same to avoid breaking the pop-out window.
- The AGENTS.md rule for VJ is updated to describe AV.
- Verification: Playwright screenshots at 1280x720 and 393x706 with simulated hits, before and after an edit.
