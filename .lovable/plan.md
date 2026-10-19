# Welcome, About, Help and startup animation

## 1. Startup animation (website and iPhone app)
- Every time the groovebox opens: short black screen, your NADRISK logo flashes in 1-bit pixels (same style as NADRISK mode, but in the current theme colour, no glitch shake), then fades into the groovebox.
- About 1.5 seconds total. A tap skips it. Nothing plays during it.

## 2. Welcome message (website only, once a day)
- Shows after the startup animation, as a pixel hardware screen over the groovebox.
- Short text: what the NAD Groovebox is (a free instrument for making and performing music live in the browser), that it is free to use, and that hosting, upkeep and new features cost money.
- Ko-fi call to action: pay what you want, or a monthly plan that covers hosting and upkeep. Mentions that reaching the goal means turning it into a full app.
- Keys: SUPPORT ON KO-FI (opens ko-fi.com/nadrisk), QUICK GUIDE, START PLAYING.
- After closing, it stays hidden for 24 hours on that device.

## 3. New About screen (website)
- Opened from the ABOUT key, as now.
- Rewritten bio: Nadir Čajić is Nadrisk, a sound designer and producer from Bosnia and Herzegovina (mentioned once). "Tinkerer" removed.
- Project paragraph: why the groovebox exists — to step out of DAWs and perfectionism and have a tool built for performing, not just producing; to inspire new and seasoned musicians to express ideas in a new, fun way and perform them live.
- Link keys: Instagram, SoundCloud, Apple Music, YouTube, plus a clear Ko-fi support call to action.

## 4. Quick guide / help (website and iPhone app)
- New HELP key next to ABOUT, opening a paged pixel screen with short sections:
  1. Getting started (tap a pad, PLAY, BPM, KEY)
  2. Pads and sounds (drums, synths, sampler, 808, ACID)
  3. Sequencer (steps, ·/X/S keys, length, A–D banks, GEN, RAND, UNDO)
  4. Effects and master (FX rack, reverb/delay MIX, master chain, LIVE/PROD)
  5. Performance (perf page, TENS, mutes, live strip)
  6. Saving (sets, patches, export) and MIDI / keyboard
- PREV / NEXT keys and Escape to close. Placeholder line noting video tutorials are coming.
- iPhone app: shows HELP but no Ko-fi or welcome prompts (Apple donation rules).

## Technical details
- New `src/components/StartupFlash.tsx` reusing the logo-threshold logic from MalfunctionOverlay, theme-coloured; skipped when the forced-NAD lock is active.
- New `WelcomeOverlay.tsx`, `HelpOverlay.tsx`; rewrite `AboutSection.tsx` with links (target _blank, rel noopener). Shared overlay frame like the existing About dialog.
- Once-a-day: localStorage timestamp `nad-welcome-seen`; pure helper `shouldShowWelcome(now, last)` with a test (shows after 24h, hidden within 24h).
- Groovebox gets a `native` flag to hide welcome/Ko-fi in the Capacitor shell.
- Update AGENTS.md site-layout rule; save links and donation direction to memory.
