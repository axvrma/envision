# envision.

**Speak it. See it. Experience it.**

Envision brings supported voice and text commands to a shared library of ten procedural 3D objects. Explore in a browser studio or launch the existing camera AR experience on a compatible device. Commands select predefined models; arbitrary descriptions do not generate geometry.

This checkout adds a React/TypeScript marketing site and playground around the original VoxAR Webpack runtime. No deployment, repository rename, remote push, or external service change is part of this implementation.

## Run locally

Use Node **22.15+** (`nvm use`, with Node 22 installed).

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The dev command builds the isolated AR bundle before starting Vite. Re-run it after changing the AR source. Camera APIs are allowed on localhost; another device accessing a LAN IP needs HTTPS.

For AR development with a separate HTTPS server:

```sh
npm run dev:ar
```

Open **https://localhost:8084/ar/**. A development certificate may need to be trusted on the testing device. The marketing site remains on Vite; AR is a full document, not an iframe.

## Routes

| Route | Experience |
| --- | --- |
| `/` | Marketing site, interactive gold rocket, commands, feature story, walkthrough |
| `/experience` | Camera-free 3D studio, object library, palette, selection and inspector |
| `/ar/` | Compatibility/permission screen and original WebXR/8th Wall application |
| `/technology` | Architecture, engine paths, browser constraints, privacy notes |

## Commands and scene controls

Try `gold rocket`, `blue bird`, `gray elephant`, `teal crystal`, `red cube`, or `clear`. Object-only commands default to teal, matching the original app. Color and object aliases are supported with whole-word matching.

- Objects: cube, sphere, cylinder, cone, elephant, bird, flock (or “birds”), tree, rocket, crystal.
- Colors: red, blue, green, yellow, orange, purple, white, black, pink, cyan, teal, gold, silver, gray (or “grey”).
- Hero: commands replace the current object; drag to orbit, scroll/pinch to zoom, reset camera, clear.
- Studio: choose add or replace mode; add from the library, select in the canvas or object list, change color and position/rotation/scale in the inspector, remove, reset the camera, or clear. The library and inspector collapse on mobile. Scene complexity is bounded at 12 objects.
- AR: wait for a placement reticle, then type or speak a command. The original reticle, world placement, model animation, clear, install and engine paths are retained. AR scenes are capped at 30 objects.

State lives in the current tab. Playground scenes do not sync to AR or survive a reload.

## Build and Netlify

```sh
npm run build
npm run preview
```

The unified build typechecks, builds Vite into `dist`, builds Webpack into `dist/ar`, and writes explicit route documents and SEO assets. Netlify uses the checked-in `netlify.toml`, Node 22, build command `npm run build`, and publish directory `dist`. No backend is required.

Before production, set `SITE_URL=https://your-real-domain` in the build environment. Netlify’s `URL` is the fallback. These generate canonical/Open Graph URLs and `sitemap.xml`. With neither variable, local builds omit canonical URLs and leave the sitemap empty rather than inventing a production domain. `.env.example` documents the value; export it in your shell for local builds.

Verify the built result, then deploy only with explicit approval. Routes have explicit Netlify rules; missing AR assets do not silently return the marketing app.

## Tests

```sh
npm test                     # after npm run build: parser, model, state, static output
npx playwright install chromium
npm run test:e2e             # production preview, interaction, mobile, accessibility
```

CI runs the production build and both suites. Tests cover every supported color/object combination, aliases, invalid commands, geometry factories, scene bounds, insert/select/transform/color/remove/replace/clear, reset feedback, routes, GitHub links, unsupported WebGL, speech success/denial/silence/unsupported states, AR permission and engine-failure flows, mobile overflow, keyboard/reduced-motion interaction and axe WCAG A/AA checks.

Speech and AR permission behavior in automation is **mocked**. Real microphone transcription, mobile browser installation, SLAM tracking, surface detection, anchoring, and physical-device AR have **not** been verified on hardware. See [validation notes](docs/VALIDATION.md), including the local Lighthouse result (88 performance; 100 accessibility, best practices, and SEO).

## Browser and permission constraints

- Camera and microphone are never requested on page load. AR startup and speech each require an explicit user action.
- AR needs HTTPS outside localhost and a camera-capable browser. Mobile selects the existing 8th Wall integration. Other devices try immersive WebXR with hit testing, then the 8th Wall path.
- The three existing 8th Wall scripts load from jsDelivr at runtime. Engine/network/licensing/device compatibility remains a deployment dependency. A successful script download does not prove a working camera session.
- Speech recognition is optional, browser-dependent, and may use an online browser speech service. Text works independently, including in AR after session startup.
- No analytics or visitor tracking is added. No guarantee is made about third-party engine or browser speech processing.
- The AR service worker and manifest are scoped to `/ar/`. Only same-origin AR assets are cached; third-party scripts remain network-managed. The app does not promise fully offline AR. A root migration worker retires the old VoxAR registration on upgrades.
- WebGL-unavailable and context-loss states offer useful feedback and a retry. Render resolution is capped, scenes stop rendering offscreen/in hidden tabs, models dispose on replacement/removal, 3D is split from the main bundle, fonts are self-hosted, and reduced-motion preferences are respected.

## Structure

```text
shared/               Environment-independent models, commands and scene-state operations
src/                  Preserved camera AR app, preflight UI, scoped PWA
website/src/          React website, studio, technology page, scene and speech UI
website/public/brand/ Original SVG identity, static fallback, social artwork
scripts/              Static route/SEO finalization and reproducible branding screenshots
tests/                Node unit/output checks and Playwright browser suite
docs/                 Architecture, audit and validation notes
```

The website applies a refined metal finish and porthole details to the source rocket. The AR factories keep their original geometry and materials. Surface/device drawings are explicitly labeled illustrations. Live object compositions use the actual shared model library.

To regenerate the social image and install icons: run a production preview, then `node scripts/generate-artwork.mjs`, then rebuild. The image uses the actual website WebGL rocket; no stock model or invented AR screenshot is used.

## Source and license

The supplied product source is [axvrma/vox-ar](https://github.com/axvrma/vox-ar). The local checkout’s remote currently names `axvrma/envision`; it was not altered. Public links retain the supplied, verified `vox-ar` URL until a rename is confirmed. Original package metadata and README identify the license as **ISC**. Built by [Abhishek Verma](https://github.com/axvrma).
