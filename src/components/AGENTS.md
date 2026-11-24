# Component architecture

- Groovebox top controls use two fixed grouped rows with the existing shell callbacks, so presentation changes never duplicate transport or harmony state.- Phase 4 retirements are flags (SEQ_RETIRED in Groovebox, CHORD_RETIRED in SlotEditor; PHRASE hidden from the switcher), never deletions, so they can be re-engaged and old sets still play.
- Pad pitch UI is OCT (-2..+2) behind NOTE_RETIRED in harmonyKnob.tsx; slot.note stays the stored value so old sets keep their exact pitch. Rune Bass/Arp pitch lanes target roleRegister() (bass C1, arp C4 + OCT) with range 48, exact (no scale snap).
