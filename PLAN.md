# Project Summary: The Wizarding World Spellcaster

## What It Is
An interactive, browser-based digital installation for a campus Halloween open house (theme: The Wizarding World). A visitor stands in front of a screen holding a physical wand. When they say a spell (e.g. "Expecto Patronum") and wave the wand, a real-time particle effect for that spell follows their hand/wand position on screen. The screen shows the visitor's own mirrored camera image.

Inspiration: a demo video of a Harry Potter exhibition where a kid waved a wand and a Patronus appeared on screen. This project goes further by combining gesture tracking and voice recognition.

## How It Works
Everything runs in one web page in a Chromium browser.
* **Hand tracking:** the webcam feeds **MediaPipe Tasks Vision `HandLandmarker`**, which finds 21 landmarks on the hand. The **index fingertip (landmark 8)** is the effect emission point. Its position is smoothed and converted to canvas pixels.
* **Voice:** the browser's **Web Speech API** listens continuously. Spoken text is matched against each spell's phrase list (with common mishearings and a small fuzzy match). A match fires a `spell` event.
* **Rendering:** an HTML5 Canvas overlay sits above the mirrored video. Currently it only draws a test glow at the fingertip, which changes color for 3 seconds after a spell. The particle engine is built in Phase 3.
* **Fallbacks:** keys **1, 2, 3** and on-screen buttons trigger spells, in case the microphone or internet fails.

## Files (folder `spellcaster/`)
* `index.html`: the page, styles, start screen, status panel, spell banner.
* `app.js`: all logic (ES module). Key parts: `initHandTracking()`, `loop()` and `draw()`, `SPELLS` config, `matchSpell()`, `triggerSpell()`, `startSpeech()`.
* Shared state for later phases: `window.hand = { visible, x, y, landmarks }` (canvas pixels), `window.triggerSpell(id, source)`, and the browser event `spell` (`detail: { id, name, source }`).

## How to Run
Camera access needs `localhost` or HTTPS, so do not open the file directly.
1. Put both files in one folder and run `python3 -m http.server 8000` (or `npx serve`).
2. Open `http://localhost:8000` in **Google Chrome** or Edge and click **Begin**.
3. Keys: **D** hides/shows the status panel, **F** toggles fullscreen, **L** shows all 21 landmarks, **1/2/3** cast spells. Add `?cpu` to the URL to skip the GPU for hand tracking.

## Decisions Made
| Topic | Decision |
|---|---|
| Voice | Web Speech API plus keyboard and on-screen fallback triggers |
| MediaPipe loading | CDN links now; switch to local files in Phase 5 for offline reliability |
| MediaPipe API | Tasks Vision `HandLandmarker` (not the legacy Hands solution) |
| Emission point | Index fingertip first; wand-tip extension only if time allows |
| Display | Mirrored (video and canvas mirrored together with CSS) |
| Browsers | Chromium-based, but see the Brave note below |

## Project Timeline (7 Days)
* **Phase 1: Planning and Scoping (COMPLETED)**
* **Phase 2: Prototyping and Core Logic (COMPLETED, with open items below)**
  * 2A Setup, permissions, mirrored camera, status panel (confirmed working)
  * 2B Hand tracking with fingertip glow (built; see open items)
  * 2C Voice recognition, spell matching, fallbacks (built; see open items)
* **Phase 3: Visuals and Graphics (UP NEXT)**: build the Canvas particle engine and design unique effects for 2 to 3 spells; final spell choice is a decision for the user.
* **Phase 4: Integration and State Management**: connect `spell` events to the effects at the hand position, add sound effects, optionally add the wand-tip extension.
* **Phase 5: Polish and Deployment**: test in open-house lighting and noise, add a reset state between users, host tracking files locally, set up fullscreen kiosk mode.

## Current Status
**Point in Timeline:** End of Phase 2, start of Phase 3.

### Open items (not confirmed working; check these first)
1. **Hand tracking in Chrome** was stuck on "loading model..." while it worked in Brave. The loader was rewritten with staged status, timeouts, and a GPU-to-CPU fallback, but it has **not yet been confirmed** in Chrome. If it fails, try `?cpu`, Incognito (to rule out extensions), and enable hardware acceleration in Chrome settings.
2. **Voice in Brave does not work** (Brave blocks the speech service, which shows as a "network" error), so Chrome or Edge is needed for voice. Hand tracking and voice must run in the same browser, so the demo machine needs **one browser where both work**. Verify this early.
3. **Not yet tested:** speech accuracy with the user's accent (change `SPEECH_LANG` to `en-GB` or `en-ID` if poor), noise tolerance, and holding a real wand (does it block the fingertip?).
4. The spells (Expecto Patronum, Lumos, Incendio) are placeholders in the `SPELLS` config.
5. The Web Speech API needs internet in Chrome. Use a reliable connection (wired or a phone hotspot) plus the fallback keys.

## How to Continue
Start Phase 3. First confirm open item 1 and 2 (one browser where hand tracking and voice both work), then ask the user to choose the final 2 to 3 spells and the visual style. Build a Canvas particle engine that draws at `window.hand.x/y`, one effect per spell, and hook it to the `spell` event in Phase 4.
