# Envision architecture and audit

The starting repository had one Webpack entry (`src/index.js`), Three.js r152, a root-scoped PWA, and runtime-loaded 8th Wall scripts. There were no GLB/model downloads: all ten objects were procedural factories embedded in the AR entry. The original camera code auto-checked device support but requested a session only on its Start button. Its command parser used substring matches and defaulted to teal.

## Integration choices

- `shared/models.js` extracts only environment-independent model factories and disposal. AR imports those same functions. Website instances apply their own material finish; they do not mutate AR instances.
- `shared/commands.js` shares the original color/object/alias vocabulary. Whole-word matching avoids accidental substring matches, longest aliases preserve “flock of birds”, and explicit clear commands are recognized. Object-only commands retain the teal default.
- Vite and React Three Fiber use the same installed Three.js r152 as AR; there is no second installed Three.js version. The website and camera entry are independent page runtimes.
- Vite builds the public website first. Webpack cleans only `dist/ar`; finalization emits `/experience/index.html`, `/technology/index.html`, `/404.html`, SEO metadata and a legacy-worker retirement script. Netlify serves one static directory.
- Camera entry is `/ar/` as a complete document, avoiding iframe camera/XR restrictions. It retains the mobile 8th Wall and non-mobile WebXR-first behavior. Preflight detects secure context and camera API presence before allowing startup. The actual permissions remain user-initiated.
- AR adds a text placement form, camera-independent command entry, descriptive engine errors, safe text rendering of error messages, and a bounded scene. Tracking, WebXR hit tests, the 8th Wall ray-to-ground-plane reticle stabilization, world placement and original model animation remain in their original runtime. The 8th Wall path intersects a world-space horizontal ground plane; it does not perform semantic surface recognition.

## Runtime paths

```text
Website text / optional speech → shared parser → bounded tab-local scene state
  → shared object factory → React Three Fiber / Three.js → orbit + inspector

AR start action → mobile: 8th Wall; other devices: WebXR support check
  → session / camera pipeline → hit test + reticle
  → text / optional speech → shared parser → shared factory → placed Three.js object
```

AR still uses these unmodified network endpoints:

- `https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1/dist/xrextras.js`
- `https://cdn.jsdelivr.net/npm/@8thwall/landing-page@1/dist/landing-page.js`
- `https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js`

Their HTTP availability was checked; this does not validate device tracking or engine licensing. No third-party engine privacy guarantees are inferred.

## PWA and caching

The manifest starts at `/ar/` with scope `/ar/`. Registration is `/ar/sw.js` with scope `/ar/`. That worker handles only same-origin requests within its AR path: navigation is network-first with an AR-shell fallback, local assets are cache-first, and external engine URLs are not intercepted. Old Envision AR cache versions are removed without deleting unrelated caches. A root `/sw.js` migration script unregisters the former root VoxAR worker and removes only its named legacy cache.

Website JS/CSS and AR hashed bundles have immutable Netlify caching. The service worker and manifest have explicit no-cache policies. Permission policy permits camera, microphone and XR for the same origin. No deployment or remote Git operation is performed.

## Rendering and accessibility

The UI is readable before the lazy 3D module loads. A static SVG bridges loading; renderer failure/context loss offers retry and text feedback. Orbit supports pointer and touch. Inspector fields and scene lists provide keyboard alternatives to canvas selection and transforms. Reduced-motion mode renders on demand; other scenes stop when outside the viewport or the tab is hidden. A precomputed cube-UV environment avoids generating studio lighting on each visit. DPR is capped at 1.6, object counts are bounded, shadow maps at 1024², and disposable geometries/materials are freed. The studio and website use separate components but one shared scene renderer.
