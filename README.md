# Envision 2.0 · AR Playground

Choose a form. Find a surface. Make room for imagination.

Envision is an account-free, mobile-first AR playground with ten procedural objects, direct object editing, optional speech/text input, and local scene saving. The independent Webpack AR runtime and React browser Studio share the object catalog, model factories, validated scene domain, visual tokens, and IndexedDB storage.

Source: [github.com/axvrma/envision](https://github.com/axvrma/envision).

## Run and verify

Use **Node 22.15 or newer**; `.nvmrc` selects Node 22. Validation for this release uses Node 22.17.0.

```sh
nvm use
npm ci
npm run dev
```

The Vite development server serves the website and the built AR assets. Changes inside `src/` require `npm run build:ar`; `npm run dev:ar` provides the separate HTTPS Webpack server. Real camera AR requires a secure origin on the phone; localhost on your laptop is not the phone's localhost.

```sh
npm run typecheck
npm run build
npm test
npx playwright install chromium
npm run test:e2e
npm run preview
```

Build before unit/static-output and browser tests: tests also verify the actual `dist/` assets. No camera, microphone, external account, backend, or AR license key is needed for the automated suite. Mock tracking is explicitly identified in tests; it is not physical-device validation.

| Route | Experience |
| --- | --- |
| `/` | Original visual language, live 3D hero, AR Playground product copy |
| `/experience` | Browser Studio: manual library, orbit/zoom, selection, inspector, voice/text, save/open, undo/redo |
| `/ar/` | Camera preflight, manual library, tracked preview/confirmation, selection/editing, scene actions, capture alternative |
| `/technology` | Architecture, capability distinctions, third-party runtime attribution |

## Play

1. Open `/ar/`. Browse **Add Object** without requesting camera or microphone access.
2. Tap **Start AR Experience** to request camera AR. WebXR is preferred when the browser reports support; otherwise Start tries the existing 8th Wall distributed engine.
3. Choose an object and color. Scan a well-lit horizontal floor or table. A translucent model previews the placement.
4. **Place object** becomes available only with a fresh, valid tracked target. Cancel whenever you want. Missing or lost tracking immediately prevents confirmation.
5. Tap a placed object to select it. Edit color, scale and rotation, duplicate, remove, or reset selection. Pinch and two-finger twist adjust scale/yaw. **Move** explicitly places the object at a new tracked target; screen dragging is intentionally not used for positioning.
6. Scene actions include confirmed clearing, undo/redo, reset placement, saved scenes and an accessible object selector.

Cube, Sphere, Cylinder, Cone, Elephant, Bird, Bird Flock, Tree, Rocket, and Crystal all use the original procedural factories. Library thumbnails are rendered from those factories. Models keep their internal animations; animation does not mutate saved transforms. Reduced-motion preferences disable animation.

Voice and text select the same predefined catalog: `gold rocket`, `blue bird`, `red cube`, `gray elephant`, `teal crystal`, or `clear`. All AR creation inputs open a preview requiring explicit confirmation. Clear requests confirmation. Speech starts only after tapping **Start listening**; unsupported or denied speech never blocks manual use. Browser speech services may process audio online.

## Save a composition

Use **Save / open scenes** in either experience. Name, save, open, rename, duplicate, delete, export or import a scene. Data persists in IndexedDB on this browser and origin, subject to browser storage eviction, private-mode restrictions and available quota. JSON exports are the portable backup. Nothing is uploaded automatically.

Saved data contains a versioned virtual composition in metres relative to its first object's position. It does **not** contain a physical anchor, camera image, tracking history, or device identity. In AR, opening a scene creates a preview; objects are restored only after a new valid origin is confirmed. Restarting a session similarly requires replacing the previous composition at a fresh origin. History is reset across tracking sessions to avoid restoring stale world coordinates.

Limits: 12 live objects, 40 scene mutations in undo history, 50 saved scenes, 100 KB imports, 80-character names, scale 0.2–3, yaw −180°–180°, coordinates within ±20 metres. Imports validate types, color names, IDs, uniqueness, finite transforms, object count, units, and version. Version 1 of the documented metre-based schema migrates to version 2; old tab-only Studio state was never persisted.

## Capture honestly

Combined camera + virtual-object capture is **unavailable in this release**. Capture offers **Render objects only**, a new render of application-owned objects from the current camera view against a dark background, labeled “Virtual objects only · Camera excluded.” Reticles, application controls and engine-owned camera textures are excluded. Download PNG, or use native file sharing if the browser supports it. No screenshot is automatically uploaded. A canvas/security failure produces an error rather than a fabricated image.

## Compatibility and privacy

- WebXR requires immersive AR, hit-test and DOM-overlay support. Placement accepts horizontal surfaces. Session-local coordinates are used; there are no persistent XR anchors.
- 8th Wall retains its SLAM/Three.js pipeline with explicit absolute-scale configuration. Its fallback intersects a camera ray with an estimated horizontal ground plane. This is **not** native hit-test surface recognition. It requires `NORMAL` tracking and several consecutive valid intersections; there is no arbitrary coordinate fallback.
- The pinned `@8thwall/*@1.0.0` scripts and engine chunks load from jsDelivr after Start. HTTP delivery was checked, but camera tracking on physical devices has not been verified. The binary is closed and separately licensed; its MIT framework does not provide SLAM. See the [dated engine audit](docs/AR-CAPABILITY-AUDIT.md).
- Envision adds no analytics, accounts, advertising, backend, or camera-frame uploads. Third-party code and speech services have their own processing behavior; do not describe this as fully offline/local AR.
- Backgrounding ends the AR session and aborts speech. Explicit exit, engine errors and WebGL context loss stop the active runtime and clean up listeners, models, hit sources and renderer resources. A subsequent camera session requires a new origin.
- Standard controls, modal focus/Escape handling, an accessible object list and transformation controls support keyboard use. This does not remove the visual/physical limitations of aiming and moving a camera for immersive AR. The browser Studio remains the fallback.

## Architecture and release evidence

- [Architecture and file map](docs/ARCHITECTURE.md)
- [Runtime availability, licensing and capability audit](docs/AR-CAPABILITY-AUDIT.md)
- [Automated results and measured limits](docs/VALIDATION.md)
- [Physical-device test checklist](docs/DEVICE-TEST-CHECKLIST.md)
- [Implementation handoff and Netlify instructions](docs/RELEASE-2.0.md)

Netlify remains a single static `dist/` deployment using the existing `netlify.toml`. Set `SITE_URL` to the final origin if it differs from Netlify's `URL`. The build preserves all four routes, hashed assets, AR-scoped service worker, headers and the legacy root-worker retirement script. This implementation does not push, deploy, or modify remote infrastructure.

Application source retains its existing ISC package license metadata. Inter and IBM Plex Mono notices are in `website/public/licenses/`. The 8th Wall engine license is separate and visibly linked in AR credits and Technology.
