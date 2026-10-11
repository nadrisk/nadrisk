# Two-view desktop hardware layout

## Direction
Use the illustrations as the layout authority: modules touch edge-to-edge with one shared 1px divider, no padded outer boxes, no floating columns, and no unused space between devices.

The drum rack remains full width above this area. The selected instrument row remains visible in both views.

```text
[ DRUM RACK — full width ]

[ SLOT          ][ INSTRUMENT    ][ INSERT       ]
[ CHORD         ][ LIBRARY*      ][               ]

[ DEVICES ][ SEQ / PERF ]

DEVICES view
[ FX            ][ MASTER + VIS  ][ MEMORY       ]
[ PHRASE        ][ TAPE          ][ MIDI         ]
[ MIXER — all 16 channels, full width             ]

SEQ / PERF view
[ STEPSEQ                       ][ PERFORM        ]
[ A ][ B ][ C ][ D                               ]
[ 01 ][ 02 ] ... [ 16 ][ RST                     ]
[ FULL-WIDTH STEP GRID                            ]
```

`*` Library and chord appear only for instruments that use them; the surrounding devices keep their column positions rather than stretching unpredictably.

## Navigation recommendation
Replace the ten-button desktop selector with only two large hardware keys:

- **DEVICES** — FX, Master/Visualizer, Memory, Phrase, Tape, MIDI, and the full-width mixer.
- **SEQ / PERF** — step controls, performance controls, pattern/mute strip, and full-width sequencer.

Recommendation: use **DEVICES** rather than “RACK,” because the drum rack and instrument row remain visible in both views. This makes the key describe exactly what changes.

The existing ten-button selector remains on phones, as requested, so the phone page does not become excessively long.

## Instrument row
- Remove padding and enclosing panel gaps around SLOT, the selected instrument, INSERT, CHORD, and LIBRARY.
- Use three equal desktop columns with shared borders, matching the first illustration.
- Keep each 128×64 display at crisp integer scale; the chassis joins tightly instead of enlarging a small screen to fill empty space.
- For sampler/poly extras, place CHORD below SLOT and LIBRARY below the instrument. Other engines leave those lower cells absent without changing the top-row alignment.

## Devices view
- Build a fixed three-column, two-row matrix matching the second illustration.
- Row 1: FX, MASTER with VIS attached in the same column, MEMORY.
- Row 2: PHRASE, TAPE, MIDI.
- Put the 16-channel mixer directly below across the complete width.
- Treat MASTER and VIS as one connected device column with a shared edge, not separate floating panels.
- Preserve every existing control and state; this is placement only.

## Sequencer/performance view
- Match the third illustration: STEPSEQ and PERFORM touch side by side at the top.
- Place the shared A–D bank row and 16 mute keys directly below as one full-width live strip.
- Place the full-width step grid immediately below the strip.
- Keep RESET · DROP with performance controls and the mute RST with the live strip; they remain independent.

## Responsive behavior
- Apply the illustrated two-view system only on fine-pointer desktop/laptop layouts.
- Keep the current phone selector, stacked modules, touch sizes, and ordering unchanged.
- At narrower laptop widths, preserve the three-column geometry and reduce only the integer pixel scale; do not introduce gutters or horizontal page scrolling.

## Scope and verification
- Change only desktop presentation and view selection; audio, sequencing, saved sets, MIDI labels, raw-touch handling, and screen drawings remain unchanged.
- Update the desktop architecture note from the current utility-selector arrangement to the two-view device surface.
- Verify both desktop views at 1111×724 and 1440×900, including instruments with CHORD/LIBRARY.
- Confirm DEVICES/SEQ switching retains state; test FX, memory, MIDI, mixer, A–D, mutes, RESET · DROP, and step editing.
- Confirm the current 390×844 phone layout remains unchanged and the preview builds cleanly.
