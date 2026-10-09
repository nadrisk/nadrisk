# Architecture
- Keep the site on React and Vite with shared patcher styling across home and news so navigation remains consistent.
- Use Tone.js for the browser instrument, started only after a user gesture and disposed on unmount, to provide reliable audio synthesis without hosted audio or a backend.
- Keep instrument audio state in a focused hook and render analyser data in a canvas so sound logic is separate from the patch interface.
- Preserve the original news data as the archive's source of truth; the home page may select entries but must not duplicate their content.