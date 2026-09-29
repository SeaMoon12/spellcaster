# Project Summary: The Wizarding World Spellcaster

## What It Is
An interactive, browser-based digital installation for a campus Halloween open house (theme: The Wizarding World). A visitor stands in front of a screen holding a physical wand. They wave the wand to draw a shape in the air, then say a spell (e.g. "Expecto Patronum"). The bigger the drawing, the bigger the resulting particle-effect spell, which plays over the visitor's own mirrored camera image. A recurring challenge: a dementor periodically darkens the screen and the visitor must cast Expecto Patronum within a few seconds or a jumpscare plays.

Inspiration: a demo video of a Harry Potter exhibition where a kid waved a wand and a Patronus appeared on screen. This project goes further with drawing-based sizing, voice recognition, and the dementor challenge.

## How It Works
Everything runs in one web page in a Chromium browser (Google Chrome or Edge; **not** Brave, see Open Items).
* **Hand tracking:** the webcam feeds **MediaPipe Tasks Vision `HandLandmarker`**, which finds 21 landmarks on the hand. The **index fingertip (landmark 8)** is the effect emission point, smoothed and converted to canvas pixels.
* **Drawing and sizing:** the fingertip's last ~3 seconds of movement are always kept as a fading trail (no gesture needed to start/stop). At the moment a spell is cast, the trail's bounding box is compared to the screen size to produce a scale from 0.5x (tiny doodle) to 2.5x (big sweep). Any drawing shape works; only its size matters.
* **Voice:** the browser's **Web Speech API** listens continuously. Spoken text is matched against each spell's phrase list (with common mishearings and a small fuzzy match) and fires a `spell` event carrying the drawing's size data.
* **Particle engine:** a pooled, time-based canvas particle system (`particles.js`) with two helpers: `burst()` (particles flying out from a point) and `emitAlongPath()` (particles born along the drawn path). Both scale with the drawing size. An adaptive-quality watchdog shrinks new effects (not ones already playing) if the frame rate drops.
* **Spell effects (`spells.js`):**
  * *Expecto Patronum* — the drawn path shimmers silver-blue, then a glowing orb grows at its center and breaks into drifting mist (~2.6s).
  * *Lumos* — a warm light attaches to the fingertip and follows the hand for 8s, with drifting embers.
  * *Incendio* — the drawn line catches fire with rising flames and sparks; with no drawing, a fireball fires instead.
* **The dementor challenge:** 10-25 seconds after starting, the screen darkens from the edges with "Cast Expecto Patronum!" and a 4-second countdown. Casting Patronum in time clears it (a new one is scheduled 1.5s later). Missing it plays a jumpscare video (falls back to a red/black flash if no video file is present), then returns to the Begin screen. Losing is allowed and is not treated as a big deal.
* **Fallbacks:** keys **1, 2, 3** and on-screen buttons trigger spells if voice fails. A **Back button** (top-right, camera page) returns to the Begin screen at any time.

## Files (folder `spellcaster/`)
* `index.html` — page structure, styles, start screen, status panel, spell banner, dementor overlay, jumpscare overlay, back button.
* `app.js` — camera/mic setup, hand tracking, drawing trail, voice recognition and spell matching, dementor state machine, main loop. Key exports/state: `window.hand` (`visible, x, y, landmarks`), `window.getTrailSnapshot()`, `window.triggerSpell(id, source)`, `window.particles`, and the `spell` browser event (`detail: { id, name, source, trail }`).
* `particles.js` — the particle engine: `ParticleSystem`, `burst()`, `emitAlongPath()`.
* `spells.js` — the three spell effect functions (`castPatronus`, `castLumos`, `castIncendio`), each called as `fn(particles, trailSnapshot, extra)`.
* `PROJECT_SUMMARY.md` — this file.
* `jumpscare.mp4` — **not yet supplied**; drop a video file with this exact name next to `index.html` to replace the placeholder flash. No code change needed.

## How to Run
Camera access needs `localhost` or HTTPS, so do not open the file directly.
1. Put all files in one folder and run `python3 -m http.server 8000` (or `npx serve`).
2. Open `http://localhost:8000/?cpu` in **Google Chrome** or Edge and click **Begin**. The `?cpu` flag skips a GPU start-up issue seen in Chrome (see Open Items).
3. Keys: **D** hides/shows the status panel, **F** toggles fullscreen, **L** shows all 21 landmarks, **B** shows the drawing's bounding box, **C** clears the trail/particles, **S** runs a particle stress test, **1/2/3** cast spells.

## Decisions Made
| Topic | Decision |
|---|---|
| Voice | Web Speech API plus keyboard and on-screen fallback triggers |
| MediaPipe loading | CDN links now; switch to local files in Phase 5 for offline reliability |
| MediaPipe API | Tasks Vision `HandLandmarker` |
| Emission point | Index fingertip |
| Display | Mirrored |
| Browsers | Chromium-based, but Brave cannot do voice (see Open Items) |
| Drawing | Any shape works; only size matters; always recording (no start/stop gesture); size scales the spell |
| Patronus visual | Orb with drifting mist (not an animated stag — flagged as too time-risky) |
| Dementor challenge | Timed vignette (10-25s random delay, 4s to respond); losing is allowed, no big deal, resolves with a jumpscare then returns to Begin |

## Project Timeline (7 Days)
* **Phase 1: Planning and Scoping (COMPLETED)**
* **Phase 2: Prototyping and Core Logic (COMPLETED, with open items below)**
* **Phase 3: Visuals and Graphics (COMPLETED, with open items below)**
  * 3A Drawing trail and size measurement (confirmed working)
  * 3B Particle engine (confirmed working; stress-test performance flagged, see Open Items)
  * 3C The three spell effects, dementor challenge, and Back button (built; not yet browser-tested)
* **Phase 4: Integration and State Management (UP NEXT)**: add sound effects for each spell and the dementor; tune timings/feel from testing; wire the wand-tip extension if time allows.
* **Phase 5: Polish and Deployment**: test in open-house lighting and noise, host tracking files locally for offline reliability, set up fullscreen kiosk mode, supply the final `jumpscare.mp4`.

## Current Status
**Point in Timeline:** End of Phase 3, start of Phase 4.

### Open items (carried forward; check these first)
1. **Hand tracking in Chrome** needed the `?cpu` URL flag to work reliably; confirmed working with it. Always launch the demo with `?cpu`.
2. **Voice does not work in Brave** (it blocks the speech service). Chrome or Edge is required for voice, and hand tracking and voice must run in the same browser — **use Chrome with `?cpu` on the demo machine**.
3. **Performance:** a stress test on the Chrome/`?cpu` setup showed hand tracking around 8 fps and particle rendering dropping to ~5 fps under heavy load (~1,200 particles). Adaptive quality scaling was added in 3C to reduce new effects' particle counts when fps drops, but the root slowness (CPU-only hand tracking) is unresolved. Re-test in Phase 4/5, ideally on the actual open-house laptop, and check `chrome://gpu` for hardware acceleration status.
4. **3C is untested in a browser.** Verify each spell looks right, the dementor timing feels fair (4s response window, 10-25s random gap), and the jumpscare fallback/video plays and returns to Begin correctly.
5. **`jumpscare.mp4` is not yet supplied** — the code falls back to a red/black flash until it is added.
6. Not yet tested: speech accuracy with the user's accent (change `SPEECH_LANG` in `app.js` to `en-GB` or `en-ID` if needed) and noise tolerance, and drawing/casting while actually holding the physical wand.
7. The Web Speech API needs internet in Chrome; use a reliable connection (wired or a phone hotspot) plus the fallback keys/buttons for the open house.

## How to Continue
Start Phase 4 once open items 1-4 above are confirmed on the real demo laptop. Add sound effects (a cue per spell, a dementor sting, a jumpscare sound), tune the dementor's timing and the darkening feel based on how it plays, and supply the final `jumpscare.mp4`. If time remains, add the wand-tip position extension noted in Phase 2's emission-point decision.
