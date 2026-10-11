# Uniform framed device grid and visualizer removal

## Goal
Make the desktop groovebox read as one neat hardware assembly: every device sits inside the same light rectangular chassis frame shown around the uploaded SLOT screen, with aligned edges and consistent cell sizes. Remove the dedicated VIS device for now.

## Device framing
- Give SLOT, INSTRUMENT, INSERT, CHORD and LIBRARY the same outer light bezel treatment: a crisp 1-pixel frame extending around the black screen area, square corners, and no gaps between neighbouring devices.
- Use one shared desktop device-cell rule rather than separate borders per panel, so adjacent frames meet cleanly without doubled or uneven lines.
- Keep the three-column instrument geometry. The top row uses equal rectangular cells; CHORD and LIBRARY use matching cells beneath their assigned columns when present.
- Apply the same frame and sizing rule to FX, MASTER, MEMORY, PHRASE, TAPE and MIDI. Keep the utility area as a uniform 3×2 matrix, with aligned row heights and no panel stretching caused by its contents.
- Keep the full-width mixer and SEQ / PERF composition below their respective framed control rows; their wide working areas remain wide rather than being forced into small device rectangles.
- Preserve the existing 128×64 pixel drawings, fixed desktop scale, controls and monochrome theme behavior. This change is to the surrounding chassis and alignment, not the screen artwork.

## Remove the visualizer device
- Remove VIS from the utility list, phone selector and desktop device surface.
- Stop importing and mounting the dedicated VisualizerRack so its canvases and audio analyser taps cannot run in this layout.
- Remove the now-unused MASTER/VIS joining wrapper and related layout styles.
- Keep MASTER's own level, dynamics and loudness metering. Its small built-in waveform/scope remains part of MASTER unless it is already hidden by the current desktop layout.
- Leave the VisualizerRack source file available for a future iteration; it will simply have no active route or mounted instance.

## Responsive behavior
- Apply the equal device-grid sizing and joined outer frames to the desktop two-view surface.
- Keep the current phone stacking, touch targets and functional order, while removing the VIS selector there as requested.
- Ensure missing optional CHORD/LIBRARY devices do not cause the other top-row devices to resize or shift.

## Verification
- Check sampler and non-sampler instruments at laptop and wide-desktop sizes to confirm every frame aligns and optional lower devices stay in their columns.
- Check the DEVICES view for a clean 3×2 grid with six equally framed devices and no empty VIS area.
- Confirm MASTER, FX, MEMORY, PHRASE, TAPE, MIDI, mixer, and SEQ / PERF still open and operate.
- Check phone layout after VIS removal and confirm there is no horizontal overflow.
- Confirm the preview remains responsive with no VIS canvases or analyser listeners mounted and no build/runtime errors.

## Technical details
- Introduce a shared desktop chassis class for instrument and utility cells, using semantic foreground/background tokens for the bezel.
- Replace content-driven utility row sizing with explicit equal grid tracks and stable containment so canvases cannot feed dimensions back into the grid.
- Remove `vis` from the utility type/labels/panel map and delete the VisualizerRack import from the active groovebox composition.
