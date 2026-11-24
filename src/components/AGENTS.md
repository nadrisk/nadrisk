# Component architecture

- Groovebox top controls use two fixed grouped rows with the existing shell callbacks, so presentation changes never duplicate transport or harmony state.- Phase 4 retirements are flags (SEQ_RETIRED in Groovebox, CHORD_RETIRED in SlotEditor; PHRASE hidden from the switcher), never deletions, so they can be re-engaged and old sets still play.
