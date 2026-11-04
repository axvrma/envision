# Physical-device test checklist · Envision 2.0

**Status: not executed on physical hardware.** Automated AR tests use explicitly mocked engine/session behavior and real Three.js geometry/WebGL. Fill this checklist before calling the camera experience hardware-validated.

Record date, device model, OS, browser/version, secure URL, engine selected, network type, lighting, scene contents, observed issues and screenshots/recordings only with the tester's consent. Keep actual camera content out of repository artifacts unless separately authorized.

## Device matrix

| Target | Expected path | Result |
| --- | --- | --- |
| ARCore-capable Android, current Chrome | WebXR, native horizontal hit tests + DOM overlay | Pending |
| Another mid-range ARCore Android | WebXR; compare tracking/resource costs | Pending |
| iPhone Safari supported by distributed 8th Wall binary | 8th Wall absolute-scale surface hit / estimated ground plane | Pending |
| Compatible Android browser without immersive WebXR | 8th Wall fallback | Pending |
| Desktop/no camera/unsupported mobile browser | Truthful failure or Studio alternative | Pending |
| Speech unsupported or denied | Manual library and text remain usable | Pending |

Do not force an apparent pass by injecting mock tracking into these physical tests. If the distributed binary does not support a specific OS/browser version, record the limitation and verify Studio instead.

## Permissions and startup

- [ ] Fresh load requests neither camera nor microphone. Browsing/searching/color selection and saved scenes also request neither.
- [ ] Start requests only the camera/XR permissions required by the chosen engine. Microphone appears only after Start listening.
- [ ] Deny camera, verify actionable status, no active session and working Studio link; allow through settings and retry explicitly.
- [ ] Confirm WebXR is preferred on compatible Android; hit-test/DOM-overlay rejection produces visible failure rather than an unusable session.
- [ ] On 8th Wall, verify pinned scripts/chunks load, attribution is visible, absolute scale initializes, and HTTP/CDN/offline failure is actionable.
- [ ] Rapid double Start, Exit during initialization, background during a permission prompt and return: only one runtime starts; cancelled initialization releases late resources before restart.
- [ ] Inspect third-party network traffic and actual device privacy behavior. Record unexpected endpoints/processing; do not infer a local-only guarantee from application source.

## Placement and tracking

- [ ] Every object (cube, sphere, cylinder, cone, elephant, bird, flock, tree, rocket, crystal) previews matching geometry; all manual colors work without voice.
- [ ] Initializing/searching has no actionable target. Place remains disabled until a fresh valid pose exists.
- [ ] Android native hit tests: scan textured floor/table at several angles; upright objects use horizontal surfaces; walls are rejected.
- [ ] 8th Wall: verify detected/estimated surface labels match SDK capabilities, ground-plane fallback is labeled separately, and absolute scale acquisition works. Test floor separately from elevated table; do not claim table detection from a ground-plane ray.
- [ ] Confirm places at the visible preview; Cancel creates nothing and preserves existing objects.
- [ ] Cover camera, dim lights, point at blank/glossy surfaces, aim above horizon, and move quickly: tracking loss removes the ghost/target and prevents placement immediately.
- [ ] Restore normal tracking: placement becomes available only after a fresh target; objects remain as stable as the engine's session supports.
- [ ] Walk around placed models and inspect drift/jitter. Record observed behavior; no persistent-anchor claim is allowed.
- [ ] On reference-space reset/engine error/context loss, the session ends visibly and offers restart.

## Selection and manipulation

- [ ] Tap/select each small and large model via raycast; selection cue follows transforms. Empty tap deselects. Accessible object selector works too.
- [ ] On WebXR DOM overlay, verify central pointer events reach the overlay interaction surface; controls do not trigger unintended world input.
- [ ] Pinch and two-finger twist work on the actual touch device, clamp to 0.2–3 / ±180°, never zoom the browser, and commit one undoable mutation per gesture.
- [ ] Pointer cancellation, third finger, tracking loss mid-gesture, and lifting fingers in either order do not corrupt coordinates or leave a visual transform uncommitted.
- [ ] Move mode previews at a new tracked reticle and requires Confirm move. Lost tracking prevents confirmation; cancel keeps the old pose.
- [ ] Color/rotation/scale controls, duplicate at current pose, remove, reset selection, Undo/Redo and confirmed Clear behave consistently for manual/voice/text-created objects.
- [ ] Bird/flock/rocket/crystal animation survives edits without changing the saved parent transform. Reduced motion disables movement.

## Saving and capture

- [ ] Save/name/reload/open/rename/delete/duplicate/export/import works; reject malformed files, unknown schema/types/colors, duplicate IDs, non-finite/out-of-range transforms and oversized imports.
- [ ] Open a Studio-saved scene in AR on the same origin/browser. Objects do not appear before origin confirmation; relative arrangement and model sizes match.
- [ ] End/restart camera or reopen after moving rooms: the composition requires a new placement origin; old physical coordinates/history are not restored.
- [ ] Test private mode/denied storage/quota exhaustion. Show a useful error and retain JSON export as an alternative. Delete stored data to verify missing-scene handling.
- [ ] On supported 8th Wall, Capture includes the actual camera view and placed objects. Check alignment, orientation, full-frame/fill aspect and JPEG/PNG fidelity. DOM controls, reticle, selection frame and placement ghosts must be absent.
- [ ] On WebXR/unsupported screenshot APIs, explain camera-photo unavailability and keep the secondary objects-only export explicitly labeled. Rejected camera capture must not silently show an objects-only image.
- [ ] Download works; native share appears only with file sharing support, can be cancelled and handles failure. No image uploads occur automatically.

## Accessibility, orientation and resources

- [ ] Portrait/landscape, cutouts/safe areas, small screens and on-screen keyboard leave Start/Cancel/Confirm/dismiss controls reachable without horizontal overflow.
- [ ] Screen reader labels/status, modal focus containment, Escape/dismiss/focus restoration and keyboard object controls work. Document unavoidable camera-aiming limitations.
- [ ] Run one object, 12 simple objects and 12 flocks on mid-range hardware. Record frame-time distribution, memory, draw calls, thermal effects and battery behavior; do not substitute desktop synthetic results for device performance.
- [ ] Recolor/remove/clear and repeat startup/exit ten times. Check geometry/material/WebGL resource counts return toward baseline, no duplicate listeners/animation loops accumulate, and the camera/microphone indicators turn off after Exit/background/navigation.
- [ ] Lock screen, switch app, rotate while a sheet is open, return and restart. No automatic permission request or automatic physical re-anchoring occurs.
- [ ] Test installed PWA and normal browser where supported; worker remains scoped to `/ar/`, and an old cached shell updates correctly without claiming offline engine availability.

Sign-off must identify the tested device/browser/engine combinations and unresolved failures. This checklist is release work still dependent on physical hardware.

## Follow-up on the reported physical 8th Wall phone

- [ ] Compare the updated build on the same phone, browser, scene, light and surfaces as the regression report. Record whether the live target label is DETECTED SURFACE, ESTIMATED SURFACE or ESTIMATED GROUND PLANE.
- [ ] Open the object library and change several colors while camera tracking runs. Camera responsiveness should be assessed on hardware; no additional thumbnail WebGL context is created by the app.
- [ ] Test slow aiming, quick aiming, floor/table transitions and tracking loss. The preview must not glide between unrelated surfaces or enable confirmation during LIMITED tracking.
- [ ] Open Scene actions, disconnect/interrupt the camera, and confirm the failure notification replaces the sheet and offers a working retry. Stop the camera frame stream to verify the eight-second failure path; an ordinary scan without a surface hit must stay active.
- [ ] At 412×924 and after portrait/landscape changes, check every sheet's close button and content without horizontal clipping, including the saved-scene manager and failure notification.

## Camera framing and AR-first entry

- [ ] On the reported phone, compare Full frame with the native camera: the whole AR video aspect should fit with margins rather than crop to a tall screen. Check portrait/landscape rotation, browser bars and device cutouts.
- [ ] If the browser exposes camera zoom, verify an initial zoomed track returns to natural 1×; record lens/optics limitations if the browser does not expose it.
- [ ] Switch Full frame / Fill screen during a session. Projection, hit targets, selected-object raycasts and captured photos must remain aligned; world object transforms must not reset.
- [ ] Take a photo with and without placed objects, while a ghost/selection is visible. Confirm the real background and models are captured without guides/UI. Test download and native share, error/timeout and closing/ending during a pending shot.
- [ ] The landing page must lead clearly to Launch AR Experience, request no camera permission before Start, and retain an optional camera-free browser demo/Studio fallback.
