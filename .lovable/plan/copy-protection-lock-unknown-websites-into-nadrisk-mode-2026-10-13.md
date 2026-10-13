# Copy protection: lock unknown websites into NADRISK mode

## What happens
- On your own addresses the groovebox works normally, exactly like today.
- If someone copies the site and puts it on a different address, it starts straight in NADRISK malfunction mode and stays there:
  - Typing `nadrisk` or the 7 taps cannot switch it off.
  - DISP stays locked, saving sets and patches is blocked, and the heavy master squash stays on.
  - A small line on screen reads `UNLICENSED COPY - NADRISK.LOVABLE.APP`, so people can see where the real one is.
- Exported sets and patch files get a hidden `origin` tag (the address they came from). It proves where they were made and doesn't change any sound.

## Addresses that always work normally
- nadrisk.lovable.app plus the Lovable preview and editor addresses
- localhost, for local testing
- The iOS app
- Your future domain: nadgroovebox.com and www.nadgroovebox.com are on the allowed list now, so they'll work the day you connect them. A future name with a different spelling is a one-line change.

## Limits
- This stops casual copiers. A skilled developer could find and remove the check.
- The check runs in the browser, so you don't need any server.

## Technical details
- `src/lib/origin.ts`: `isLicensedHost()` checks `location.hostname` against exact names and suffixes (`.lovable.app`, `.lovableproject.com`, `localhost`, `127.0.0.1`, `nadgroovebox.com` plus subdomains). It also returns true for Capacitor native and the `capacitor:`/`file:` protocols. Hostname strings are lightly obfuscated (char codes) so a simple text search won't find them.
- Groovebox: new `forcedNad` prop. When it's true, the session starts with nad active, skips the boot overlay, ignores the toggle (keyboard and taps), and draws the footer text in the NAD theme. Index/NativeGroovebox compute the check once.
- Set/patch export adds an `origin: location.hostname` field; import ignores it.
- AGENTS.md (keep under budget): one rule saying unlicensed hosts force a permanent session lock and that new domains must be added to the origin.ts allowlist.
- Verify: tests for allowed and blocked hostnames, plus a browser run with the hostname mocked to confirm the forced lock and that toggling is ignored.
