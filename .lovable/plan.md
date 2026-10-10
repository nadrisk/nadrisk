# Prevent text selection while playing the groovebox

## Change
- Disable text selection and the iOS long-press callout across the entire groovebox workspace, not just the 16 pads.
- Keep text selection and the caret available inside real text fields, including the slot rename window.
- Preserve the existing pad gestures, repeat-velocity drag, sequencer editing, scrolling, and audio behavior.

## Verification
- Rapidly tap and drag across pads in a touch-enabled browser and confirm no labels become highlighted.
- Check momentary repeat and its vertical velocity gesture.
- Check sequencer controls and page scrolling still respond normally.
- Open slot rename and confirm keyboard entry, caret placement, and text selection still work.

## iOS app behavior
A native iOS wrapper would not reliably disable this by itself because the groovebox would still be rendered as web content. The same explicit selection rule should remain in place for both the website and a future iOS app. Fully native controls commonly avoid browser-style highlighting, but converting this project through Capacitor does not automatically guarantee that behavior.

## Technical scope
This is a presentation-only CSS change scoped to `.instrument-workspace`, with an exception for editable inputs. No audio, scheduling, rack, or saved-set code will change.
