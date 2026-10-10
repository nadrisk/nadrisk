# Native iOS groovebox app

## Goal
Create a Capacitor-based iOS app named **nadrisk** that opens directly into the existing groovebox. The website will remain unchanged in a normal browser: the native app will omit the navigation, masthead, news, about section, and footer.

## Implementation
1. Add Capacitor’s core, command-line, iOS, and Android packages, then initialize the native wrapper with:
   - App ID: `app.lovable.p35eeb48f310a4425937949d83cc32d9f`
   - App name: `nadrisk`
   - Web output: the existing Vite production build
2. Configure the supplied Lovable preview URL for live reload while testing the native wrapper.
3. Add a native-app entry view that renders only the existing `Groovebox` component. Detect the Capacitor environment at launch so the ordinary website and `/news` continue to work exactly as they do now.
4. Give the native view a full-screen dark canvas with iPhone safe-area spacing. Keep the current groovebox layout and existing narrow-screen stacking rather than redesigning it.
5. Preserve the groovebox’s audio engine, timing, sets, samples, effects, MIDI logic, and controls unchanged. Retain the no-selection/no-callout behavior for finger drumming and normal keyboard editing in the rename window.
6. Verify the native-only branch at iPhone dimensions: initial launch, audio starting after the first tap, pads, repeat velocity drag, transport, utility switching, slot rename, scrolling, safe areas, and absence of all website sections. Also rerun the existing tests and production build.

## Native project handoff
The project will contain the Capacitor configuration and dependencies, but generating and running Apple’s native project requires a Mac with Xcode. After exporting to GitHub and pulling locally:

```text
npm install
npx cap add ios
npx cap update ios
npm run build
npx cap sync
npx cap run ios
```

For App Store packaging, the testing server URL must be removed so the app uses its bundled production files, then the final icon, signing team, bundle settings, privacy details, and App Store listing are completed in Xcode/App Store Connect.

## Technical note
This keeps one groovebox implementation shared by web and iOS, avoiding a separate copy that could drift or behave differently. No backend or account system is added.
