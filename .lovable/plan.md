# Make the groovebox the website focus

## Direction
Turn the public website into a focused NAD Groovebox experience. The instrument becomes the first and dominant part of the homepage; artist material becomes a small supporting About section.

## Changes
1. **Groovebox-first homepage**
   - Remove the current artist masthead above the instrument so the groovebox is the immediate first screen.
   - Keep the groovebox itself, its controls, visualizer rack, audio behavior, saved sets, and native iOS view unchanged.
   - Keep the existing dark pixel-hardware styling and NAD identity.

2. **Simplify the website around it**
   - Remove the homepage updates/news section and the separate public News page.
   - Remove the News navigation link and decorative artist imagery that is not part of the groovebox.
   - Replace the current site navigation with a minimal NAD Groovebox identity and a direct About link.

3. **Compact About section**
   - Show the existing NADRISK logo prominently but compactly.
   - Condense the current biography into a short introduction to Nadir Čajić, Nadrisk, and the groovebox project.
   - Keep only the most relevant artist/project context rather than the full list of releases and achievements.

4. **Finish and verify**
   - Tighten the footer so it supports the groovebox-first identity.
   - Check the full experience at the current iPhone viewport and desktop width, especially the transition from instrument to About.
   - Verify the groovebox still starts, plays, and retains its existing controls without regressions.

## Technical scope
- Frontend presentation and routing only.
- Reuse the existing `nadrisk-logo.png`; no new imagery or backend work.
- Remove public News routing and references, while leaving the historical source data untouched unless it is genuinely unused after the change.
- Preserve the dedicated Capacitor/native groovebox path exactly as it is.

## Assumptions
- “Visuals” means the artist-site imagery and update presentation, not the groovebox’s functional visualizer rack.
- The smaller About section will use a concise edit of the existing biography.
