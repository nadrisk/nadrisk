# Component architecture

- Groovebox top controls use two fixed grouped rows with the existing shell callbacks, so presentation changes never duplicate transport or harmony state.
- MainFaceplate owns the unified playing surface; sound/COLOR and system editors open in-shell overlays so MIDI targets share one root and transport keeps running.
- Surface bus and joystick configuration is included in the shell's project snapshot, so Memory recalls the complete playing faceplate.