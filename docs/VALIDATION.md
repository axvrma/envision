# Envision 2.0 validation · 2026-11-04

## Environment and commands

Validation uses Node **22.17.0**, npm 10.9.2, macOS arm64 (Apple M1 Pro), and Playwright Chromium. The shell initially defaulted to Node 18, which is below the project's declared engine; the clean install and final validation explicitly used the installed Node 22 binary.

```sh
npm ci
npm run typecheck
npm run build
npm test
npm run test:e2e
npm run measure:performance
```

Clean `npm ci` installed 500 packages and reported **0 vulnerabilities**. No remote Git operation, deployment, credentials, physical camera, microphone recording or cloud storage was used.

## Automated coverage

**33 unit/static-output tests** cover:

- Shared catalog colors, aliases, longest whole-word command matching, exact clear vocabulary and all ten procedural factories/animations/disposal.
- Validated creation, object cap, color/transform updates, immutable input, duplicate/remove, duplicate/invalid IDs, unsupported types/colors, finite coordinates, scale/yaw bounds, atomic rejection, bounded undo/redo and redo invalidation.
- Relative-composition export/import, malformed/oversized input, version/units rejection, documented version 1 → 2 migration and new-origin transforms.
- IndexedDB save/load/reopen/rename/duplicate/delete, unavailable storage, missing rows, transaction aborts and a raced 52-save test that retains exactly 50 records.
- Placement/session initialization, duplicate-start prevention, startup failure, permission denial, unsupported features, missing/invalid/stale targets, readiness/loss, manual confirmation, cancellation, selection, transforms, Move, removal, composition staging, teardown and late callbacks.
- Actual adapter policy with mocked browser/engine objects: WebXR preference, required hit-test + DOM overlay, permission errors, 8th Wall absolute scale, NORMAL-only tracking, consecutive ground intersections, horizon rejection and module/renderer teardown.
- Production route assets, AR manifest/worker scope, Netlify route/permission config and configurable SEO origin.

**31 Playwright Chromium tests** cover:

- Real WebGL landing hero, manual Studio library, optional command parsing, selection/inspector transforms, color, replacement/removal/clear, camera orbit/zoom/reset, object bounds and renderer context-loss retry.
- Navigation, corrected product GitHub links, reduced motion, keyboard entry and axe audits of `/`, `/experience`, `/technology`, `/ar/` plus portrait/landscape library sheets.
- Speech unsupported/denied/silent/success states in the existing website and AR; manual use and text remain usable. AR voice creation still requires placement confirmation.
- AR permission timing, denied WebXR, engine network failure, missing camera/insecure context, camera-free library opening/search/color/selection, disabled pretracking placement, modal keyboard focus containment/Escape/restoration.
- Explicitly mocked 8th Wall session with real Three.js/WebGL: valid preview/confirmation, tracking loss/recovery, raycast selection, inspector, duplicate/delete/undo/redo, confirmed/destructive-clear cancellation, explicit Move, synthetic two-pointer transforms, exit/restart/re-origin workflow, context loss and background cleanup.
- Real browser IndexedDB persistence across reload and Studio → AR navigation, save/open/rename/duplicate/delete/export, invalid import and unavailable storage.
- Labeled objects-only image render/preview/download, excluding camera composition claims.

The AR fixture is under `tests/browser/support/ar-mock.ts`. It replaces the CDN scripts with an explicit engine simulation and drives `NORMAL`/`LIMITED` states. Production code has no test tracking switch. These tests do not establish real camera tracking, real touch delivery inside immersive WebXR, hardware compatibility or a successful third-party SLAM startup. Browser gesture events and speech are synthetic where indicated. The Studio and object rendering use actual headless WebGL.

## Build and assets

TypeScript and the combined Vite/Webpack production build pass. `dist/` contains `/`, `/experience`, `/technology`, and `/ar/`, their own entry assets, self-hosted fonts/branding, manifest/icons and scoped worker. Webpack `css-loader` preserves absolute font URLs so the shared `/fonts/` paths resolve at runtime.

The build retains expected renderer bundle-size warnings: the website's Three/R3F chunk is approximately **765 KB raw / 207 KB gzip**, and the independent AR entry approximately **approximately 700 KiB raw**. These are warnings, not build errors. AR engine binary/chunk downloads are additional and network-managed. No claim is made that the product meets a specific mobile Lighthouse or frame-rate target; earlier 1.0 Lighthouse scores are not current 2.0 measurements.

`git diff --check` is included in final review. Screenshots in `docs/screenshots/` are UI screenshots; AR preflight/library screenshots contain no camera session and are not evidence of physical tracking. The social preview is regenerated from the updated real landing page.

## Measured performance and limits

See [raw performance measurements](performance.json), reproducible with `npm run measure:performance` (`scripts/measure-performance.mjs`). These are **CPU/model-structure measurements on the development host**, not camera/AR frame rates:

- 1,012 domain creation/update operations with a 12-object scene took **19.091ms** in the recorded run; history remained at **40** entries. Export was **2,606 bytes**.
- Ten create/dispose iterations per catalog item measured mean costs from **0.062ms** (tree) to **4.366ms** (sphere) in that run. They exclude WebGL shader compilation, camera work, tracking, networking and mobile thermal behavior; timing varies by run and warmup.
- A flock contains **40 mesh draws / 7,640 triangles** before renderer batching/culling effects. Twelve flocks contain **480 meshes / 91,680 triangles**. This is the heaviest catalog scene by mesh count and must be profiled on target phones.
- AR caps DPR at **1.6** and disables shadow passes. Studio retains its bounded 1024² shadow setup. Model count, history, persisted records, imports and thumbnail cache are bounded. Capture uses a user-triggered temporary renderer at up to 1280×720 image pixels before its label strip; portrait width is reduced to cap height.
- Tracking frames do not enter history or trigger React. Preview transforms update Three.js directly; preview identity is compared without serializing a saved scene on every frame. Color/type changes dispose and replace model resources. Other mutations reuse groups. AR now uses static thumbnails; runtime Studio thumbnail/capture renderers are disposed after use.

No real-device FPS, memory ceiling, camera drain or heat measurement is available in this environment. The [physical checklist](DEVICE-TEST-CHECKLIST.md) includes repeated startup/exit, worst-catalog scenes, resource counts and camera indicators.

## Remaining physical/external validation

Android WebXR, supported iOS/Android 8th Wall sessions, camera prompts, absolute-scale acquisition, low-light tracking, real surface stability, immersive-overlay touch gestures, camera/microphone indicators, installed PWA behavior and native file sharing require physical devices. The engine audit verifies documentation/delivery and implements guards; it does not claim the closed binary's processing behavior or every intended use's licensing has been independently validated.

Combined camera capture and persistent real-world anchors are not implemented. Capture offers a labeled virtual-only alternative. Saved compositions need a fresh AR placement origin and remain local to the browser/origin unless manually exported/imported.

## Mobile layout, failure notifications and physical 8th Wall follow-up

Additional regressions cover every AR sheet at Pixel 9's 412×924 CSS pixels, 320×568 and landscape, using mobile/touch emulation and DPR 2.625. Assertions check modal and child-control bounds, internal horizontal scroll width, dismiss visibility and resizing an already-open sheet. Native mobile camera tracking is not simulated by a DevTools device preset.

Runtime/startup errors now replace an open sheet with an accessible alert dialog, preserve the cause, and offer explicit Retry AR / Studio actions. Tests exercise exceptions while settings is open, camera-start failure, context loss, actual missing-frame watchdog timeout, and retry. Cleanup failure cannot erase the original error or leave the controller stuck stopping.

Target-filter tests cover fresh-sample readiness, invalid input, jitter suppression, frame-rate-independent response at 30/60Hz, large jumps, changed surfaces and immediate loss invalidation. Actual adapter tests cover native surface preference and event-only tracking-status delivery. Browser tests confirm target-source labels, disabled placement on LIMITED status and no additional WebGL contexts when opening/recoloring the AR library. Static output tests verify all ten 160×130 PNG model thumbnails are shipped.

These are application-level improvements. The user's reported physical 8th Wall regression still requires testing the updated build on that phone; neither perfect SLAM tracking nor a device FPS improvement is claimed from mocks.
