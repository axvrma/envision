# Envision 2.0 architecture

## Boundaries

The marketing website/Studio (Vite, React, TypeScript, React Three Fiber) and camera AR (Webpack, vanilla DOM, Three.js) remain separate documents. They share the installed Three.js r152, domain code and browser database. AR is not embedded in an iframe and does not depend on React rendering in its tracking loop.

| Files | Responsibility |
| --- | --- |
| `shared/commands.js`, `.d.ts` | Single object/color/alias catalog; bounded optional command parsing |
| `shared/models.js` | Original procedural model factories and de-duplicated resource disposal |
| `shared/scene-state.js`, `.d.ts` | Validated object creation/mutations, 12-object cap, bounded deterministic history, versioned schema, relative compositions and origin transforms |
| `shared/persistence.js`, `.d.ts` | IndexedDB repository, transaction completion/error handling, atomic 50-scene limit |
| `shared/theme.css` | Shared landing-page color, typography and surface tokens; self-hosted fonts |
| `shared/thumbnails.js`, `scripts/generate-model-thumbnails.mjs`, `website/public/models/thumbnails/` | Factory-derived static AR thumbnails; Studio keeps bounded runtime color thumbnails |
| `shared/ui/saved-scenes.js`, `sheets.css` | Framework-independent accessible scene manager used by both renderers; download/import/export UI |
| `src/index.html`, `style.css`, `index.js` | AR preflight and UI, library, sheets, selection actions, gesture coordination, speech, capture UI and lifecycle binding |
| `src/ar/placement.js` | Testable session/placement controller: transient tracking state, target freshness, create/move/composition preview, explicit confirmation/cancel, selection/update/delete, generation-safe teardown |
| `src/ar/adapters.js` | Capability detection, real WebXR and 8th Wall lifecycle/tracking adapters |
| `src/ar/tracking.js` | Time-based target filtering, stability/jump checks and native surface-result validation |
| `src/ar/renderer.js` | Incremental Three.js model reconciliation, animation wrappers, ghost previews, reticle, raycast, selection cue |
| `src/ar/capture.js` | Virtual-only snapshot of application models/lights; excludes engine-owned camera resources |
| `website/src/lib/scene.ts` | React adapter around the same SceneStore; browser camera controls |
| `website/src/components/SavedScenes.tsx` | Mount/unmount shared scene manager in Studio |
| `website/src/Studio.tsx`, `components/scene/` | Manual Studio UI and lazy R3F rendering |
| `tests/` | Domain/repository/controller/adapter unit tests, static-output checks and browser tests |

## Creation and tracking

```text
Manual selection ──────────────┐
Optional voice/text → parser ──┼→ structured creation → placement preview
Saved composition ────────────┘                         ↓
Engine frame → adapter → transient tracking pose → explicit confirmation
                                                       ↓
                                                  SceneStore
                                                       ↓
                                             incremental renderer sync
```

There is one object catalog and one structured domain creation path. Manual creation never synthesizes a voice command. In AR, voice/text intentionally opens the same confirmation workflow as manual selection. Clear commands are exact vocabulary matches and request confirmation.

The placement controller never manufactures a pose. Invalid coordinates, missing poses, stale frames (250ms), non-normal engine tracking or hidden sessions cannot authorize placement. A 200ms watchdog clears stale ready state if callbacks stop; after eight seconds without an actual tracking-frame callback it ends the session with a visible error. Expiring a target never manufactures a frame heartbeat. Generation guards reject callbacks after teardown; a pending launch is allowed to finish cleanup before a second launch starts. Physical surface/permission behavior is not inferred from mocked tests.

Tracking updates only adjust transient controller pose and Three.js preview transforms. Tracking status changes update the lightweight guidance UI. Full scene/object-list reconciliation occurs on mutations or selection changes, avoiding repeated rebuilding during tracking-state flicker. Object scale/yaw are finite and bounded. Two-pointer gestures preview directly on Three.js wrappers and commit one domain mutation on release; pointer cancellation restores saved state. Single-pointer movement uses explicit Move mode rather than an untracked drag plane.

WebXR requests required hit-test and DOM-overlay features, filters horizontal poses, and ends on reference-space reset. 8th Wall retains the original SLAM pipeline but checks NORMAL tracking, removes stale-target holding, and configures documented absolute units. The old `allowedDevices: ANY` configuration is replaced by the documented world-tracking-capable mobile/headset class/default. FullWindowCanvas remains engine-owned; application preflight now owns loading/error UI. See [engine audit](AR-CAPABILITY-AUDIT.md) for the reason and limitations of each change.

## Coordinates and rendering

The canonical scene uses metres, uniform scale and yaw in degrees. AR applies these transforms to parent groups. Procedural model animations run inside those wrappers, preserving object-domain transforms and allowing color changes to replace/dispose a model without corrupting history.

The browser Studio renders all metre coordinates and model geometry at a common display factor of five. Its camera/orbit and decorative stage remain in display units. Unlike the hero presentation, Studio no longer normalizes every type to an unrelated bounding-box size or applies the hero's rocket geometry finish. This keeps the relative model sizes and composition geometry consistent with AR. The landing hero keeps its existing presentation finish.

Reconciliation replaces a model only when type/color changes; transforms update existing groups. Geometry/material disposal de-duplicates shared resources within a model. AR prefers SDK detected/estimated horizontal surface hits when available and labels the ray/ground-plane fallback. Both adapters use a 2mm jitter deadband, time-based 20/45ms smoothing, three fresh samples and a 35cm jump guard. Camera/world-object transforms are never smoothed. Fresh 8th Wall poses and refreshed projection inverses avoid casting rays with a stale camera matrix.

AR shadows are disabled to avoid expensive mobile shadow passes. DPR is capped at 1.6. AR thumbnails are generated from the exact model factories during development and served as static PNGs, so palette/library interaction creates no extra WebGL context while tracking. Studio thumbnails retain a three-color runtime cache and immediate renderer/context disposal. Capture creates a temporary bounded renderer only after an explicit tap.

## History and persistence

`SceneStore` validates every committed array and keeps at most 40 prior arrays. Undo/redo snapshots exclude renderer instances, tracking frames, camera movement, selection, animations and pending workflows. A new mutation discards redo. Duplicate preserves the original valid transform; the user then uses Move to acquire a new position.

Version 2 scene JSON:

```json
{
  "version": 2,
  "units": "metres",
  "name": "My playground",
  "objects": [{"id":"rocket-1","type":"rocket","color":"gold","position":[0,0,0],"rotation":0,"scale":1}]
}
```

Only whitelisted properties survive validation. IDs must be unique strings matching `[a-zA-Z0-9_-]{1,80}`; colors/types must be own catalog properties; vectors must contain exactly three finite numbers within ±20; scale is 0.2–3 and yaw is −180–180. At most 12 objects and 100 KB of JSON are accepted. Version 1 is defined as the same metre-coordinate envelope without `units`; migration adds explicit units and emits version 2. Unknown versions/units reject; no guessing of undocumented formats occurs.

Save subtracts the first object's translation from every object, preserving arrangement/yaw/scale. Open in AR transforms the complete saved arrangement relative to a new valid origin and regenerates object IDs. It replaces the live composition in one undoable commit after user confirmation. New camera sessions clear history and re-stage the previous virtual composition; old physical coordinates cannot be restored by Undo.

IndexedDB database `envision-playground` v1 has a `scenes` store keyed by record ID. Saves report success on transaction completion, not request success. Record count and put share a read/write transaction so concurrent tabs cannot bypass the cap. Quota/abort/unavailable-storage errors are visible. Validated JSON export remains available without database access. Browser eviction/private-mode restrictions are outside the app's control.

## Capture boundary

Neither adapter claims combined camera capture. Capture renders a fresh scene containing only clones of application-owned model groups and lights. It never renders the engine's scene/background, reads a video element or accesses a camera texture. The exported image has an explicit virtual-only label. Temporary URLs/renderers are cleaned up; native sharing is gated on `canShare({files})`. Capture does not add a backend or upload action.

## Lifecycle, UI and deployment

Modal widths and child grid tracks are bounded to the viewport, with explicit fixed positioning, border-box sizing, text wrapping and shrinkable columns. Session failures close any open sheet and open an alert dialog with retry and fallback actions.

Native modal dialogs provide Escape handling and focus restoration; a shared Tab-boundary helper keeps focus inside the sheet even when a browser would otherwise focus its chrome. Search, palette, inspector and saved-scene controls have standard labels. An object selector supplies a keyboard alternative to raycast selection. Safe areas, landscape layout, practical 44px targets and reduced motion are handled in CSS. Camera-based aiming remains a physical/visual accessibility limitation; Studio offers an alternative.

Background/page exit aborts speech and ends AR. End/error/context loss removes event listeners, cancels WebXR hit sources, stops the engine, disposes application models/renderer, and clears camera presentation. Resume requires explicit startup and a new placement origin. No permission request occurs during capability detection, library browsing or scene saving.

Vite builds `dist/` first; Webpack cleans/builds only `dist/ar/`; finalization emits the Studio/Technology static entry documents, metadata, sitemap and old-worker retirement script. AR registers `/ar/sw.js` only for `/ar/`; shell navigation is network-first, hashed assets are cache-first, external requests are not intercepted. Worker v4 replaces earlier Envision AR caches without deleting unrelated origin caches. Netlify retains route rules, security/permission headers, hashed-asset immutable caching and no-cache worker policy. No remote change or deployment is performed.
