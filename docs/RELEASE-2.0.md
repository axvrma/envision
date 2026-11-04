# Envision 2.0 implementation handoff

## Result

The independent `/ar/` runtime now supports a complete manual-first playground: choose an actual procedural object, scan for a valid target, inspect the ghost, confirm placement, select/edit/play, and export a truthful capture alternative. Voice/text are optional entry points to the same domain. Existing routes, procedural objects and camera engine paths remain in place.

The landing page's violet-black, lavender, gold/cyan, Inter/IBM Plex Mono visual system now supplies shared tokens. The new AR UI has compact header/status, a clear camera surface, a persistent mobile Start action, a bottom dock and native modal sheets. Unsupported/failed/initializing/searching/ready/lost states are explicit. Browser Studio remains functional and now shares persistence/history and physically compatible composition data with AR.

## Completed capabilities

| Area | Shipped behavior |
| --- | --- |
| Manual library | Searchable ten-object grid with real factory-rendered thumbnails, selected form/color state, presets, keyboard dismissal; no microphone requirement |
| Placement | Testable controller, tracked previews, explicit confirmation/cancel, fresh-pose requirement, safe tracking loss; horizontal WebXR hit tests / clearly labeled 8th Wall estimated ground plane |
| Interaction | Raycast selection and bounding cue, keyboard object selector, explicit tracked Move, two-pointer scale/yaw, bounded accessible inspector controls |
| Editing | Shared colors, duplicate at current valid pose, delete, deselect, confirmed clear, reset placement, bounded Undo/Redo |
| Commands | Existing aliases/text/optional speech through shared parsing/domain; permission/unsupported/network feedback; AR confirmation remains explicit |
| Local scenes | IndexedDB name/save/open/rename/duplicate/delete, JSON export/import with schema/size/type/transform validation; AR restores only at a fresh confirmed origin |
| Capture | Labeled virtual-only PNG from current view; no engine background/camera/control pixels; download and capability-gated native sharing |
| Studio | Manual creation uses structured domain API; shared state/history/storage, matching model sizes and metre transforms, library thumbnails/search, Launch AR link |
| Lifecycle | Duplicate-start guards, late-callback suppression, hit-source cancellation, engine stop/module cleanup, object/material/renderer disposal, speech abort, background/end/context-loss handling |
| Release | Product metadata and GitHub URLs updated, social image regenerated, original static Netlify architecture preserved |

## Architectural changes and files

The detailed [architecture and responsibility map](ARCHITECTURE.md) explains each module. Main changes:

- **Shared domain/storage:** `shared/scene-state.js` + declarations; new `shared/persistence.js` + declarations. Scene v2 explicitly uses metres, validated IDs/types/colors/transforms and bounded history.
- **Shared presentation:** new `shared/theme.css`, `shared/thumbnails.js` + declarations, and `shared/ui/{saved-scenes.js,saved-scenes.d.ts,dialog.js,sheets.css}`. `shared/models.js` now de-duplicates disposal; `shared/commands.js` rejects oversized/non-string command input.
- **AR:** redesigned `src/{index.html,index.js,style.css}`; new `src/ar/{placement.js,adapters.js,renderer.js,capture.js,package.json}` separates UI, tracking, domain orchestration, rendering and capture.
- **Website:** `website/src/{App.tsx,Studio.tsx,Technology.tsx}`, `lib/scene.ts`, `components/scene/Scene.tsx`, new `components/SavedScenes.tsx`, `styles/global.css`, `website/index.html` and `website/public/brand/social.png`.
- **Build/PWA:** `package.json`, `package-lock.json`, `webpack.config.js`, `scripts/finalize-build.mjs`, new `scripts/measure-performance.mjs` and camera-free `scripts/capture-ui.mjs`, `src/pwa/{manifest.webmanifest,sw.js}`. `netlify.toml` retains its existing working route/security/cache architecture and was verified rather than changed unnecessarily.
- **Tests:** updated command/browser tests; new `tests/{scene,placement,adapters}.test.mjs`, `tests/browser/ar-playground.spec.ts` and explicit `tests/browser/support/ar-mock.ts`.
- **Documentation/evidence:** rewritten README/architecture/validation; new engine audit, physical-device checklist, this handoff and `docs/performance.json`; updated UI screenshots.

Only `fake-indexeddb` was added, as a development dependency for actual repository transaction tests. No new production dependency or service was introduced. Prettier was invoked as a temporary development tool to format the new implementation.

## Validation and build

The clean install, TypeScript check, production build, **33 unit/static tests** and **31 Chromium browser tests** pass. Full test boundaries and measurements are in [VALIDATION.md](VALIDATION.md). The build produces `dist/` and retains renderer bundle-size warnings. The final application has not been pushed or deployed.

## Known limitations and hardware-dependent work

- No connected physical camera devices were available. Actual Android WebXR and supported 8th Wall device tracking, permission prompts, low-light behavior, scale accuracy, immersive touch delivery and resource indicators remain unverified.
- 8th Wall uses a pinned closed, separately licensed binary and network-delivered resources. Its plane intersection is not native surface detection. Runtime delivery was checked, not physical SLAM startup. The [capability/license audit](AR-CAPABILITY-AUDIT.md) includes official sources and exact dependencies.
- Only horizontal upright placement is supported. Explicit Move replaces unreliable screen-plane dragging. Duplicates initially overlap the source at its existing valid pose and can then be moved.
- Neither adapter provides persistent physical anchors. Composition names/objects/transforms survive in IndexedDB, subject to browser storage policy; physical placement does not. Ending/restarting requires a new tracked origin and resets old-session history.
- Combined camera capture is unavailable. The objects-only export states that limitation in UI and on the image itself. Native sharing depends on the actual browser/device.
- Desktop synthetic timings and mesh counts are recorded; mobile frame rate, battery and thermal performance are not guaranteed. Twelve flocks are a relatively expensive scene.
- UI supports keyboard/screen-reader controls, but immersive camera aiming still has visual/physical constraints. Browser Studio supplies the alternative.

Use the separate [physical-device checklist](DEVICE-TEST-CHECKLIST.md) for Android WebXR, supported fallback devices, permissions, tracking loss, gestures, orientation, storage, capture, camera cleanup and performance. Do not treat passing mocks as device sign-off.

## Netlify deployment instructions (future release action)

No deployment, remote configuration or Git push was performed in this execution. To release the reviewed artifact through the existing Netlify site:

1. Use Node 22.15+ and run `npm ci`. Keep the site's project/base directory at the repository root.
2. Set `SITE_URL` to the final public HTTP(S) origin if Netlify's existing `URL` is not the desired canonical origin. Do not include a path. Each deploy-preview origin has separate IndexedDB data.
3. Keep the existing build command **`npm run build`** and publish directory **`dist`** from `netlify.toml`. Do not publish `website/` or only `dist/ar/`.
4. Run `npm run typecheck`, `npm run build`, `npm test`, `npx playwright install chromium`, and `npm run test:e2e`. Inspect `/`, `/experience`, `/technology`, and `/ar/` with `npm run preview`.
5. Complete and record the physical-device checklist over HTTPS. Inspect binary-license suitability and runtime network behavior for the intended production distribution.
6. When the release owner chooses to deploy, use the existing Netlify site's normal deployment process with the reviewed revision/artifact. This document does not trigger that action.
7. After release, verify `/ar` redirects to `/ar/`; Studio and Technology load their static entry documents; fonts and hashed JS resolve; `/ar/sw.js` updates without cache; the worker scope stays `/ar/`; camera/microphone/XR permission headers are present; old-worker retirement and cold-cache startup work.
8. Test denial/CDN-offline/unsupported-device fallbacks and Studio from the final origin. Confirm no unexpected camera uploads or new third-party integrations and retain the prior known deployment for operational rollback through the existing hosting workflow.

## Mobile and 8th Wall follow-up

Viewport-bounded, shrinkable sheet layouts address cropped mobile controls, including resizing a sheet after opening it. Session errors now use an explicit alert dialog above all sheets with retry and Studio actions, including a real missing-frame timeout. The worker cache version is v4.

Tracking adds SDK surface hits when available, uses fresh frame camera poses/projection inverses and event tracking status, applies time-based target smoothing, and avoids rebuilding scene lists on tracking-only changes. AR form thumbnails are now static factory-generated assets (`website/public/models/thumbnails/`), with regeneration in `scripts/generate-model-thumbnails.mjs`, removing extra WebGL context creation during camera use. `src/ar/tracking.js`, `tests/tracking.test.mjs` and `tests/browser/ar-regressions.spec.ts` contain the new implementation and regressions. See validation for the physical-device limits.
