# Validation and deployment handoff

Validation date: 3 November 2026. No deployment, remote push, repository rename, or external service configuration was performed.

## Passed

- Node 22.17 production build, TypeScript check, Vite website output, isolated Webpack AR output, and final static route generation.
- **10 Node tests**: every color/object combination, aliases, invalid/whole-word commands, explicit clearing, scene insertion/replacement/transforms/removal/bounds, all ten model factories/animations/disposal, four-route asset output, scoped PWA, Netlify rules and configurable-origin SEO.
- **16 Playwright browser tests** in Chromium: real WebGL hero, commands, navigation and source links, studio object operations, speech fallback/denial/silence/success, WebGL absence, AR preflight permission timing, engine load failure, mobile layout, keyboard/reduced motion, axe accessibility on all four routes, camera orbit/zoom/reset rendering, context loss/retry, scene bounds, mocked 8th Wall placement/clearing, and absent-camera/insecure-context guidance.
- Camera reset was verified against the original rendered viewport in reduced-motion mode, not only its status message.
- Axe checks report no WCAG A/AA violations for the tested initial states of `/`, `/experience`, `/technology`, and `/ar/`.
- The 12 shared model/helper/disposal functions were AST-compared with the starting repository's AR entry and are semantically identical. Website material/detail changes are applied only to website instances.
- `npm audit`: **0 reported vulnerabilities**, including development dependencies at validation time. Three.js r152 is deduplicated across the dependency tree.
- All three existing 8th Wall script URLs returned HTTP 200. This checks delivery only.
- Desktop and 390 px mobile screenshots were reviewed; no horizontal document overflow was found on the four routes. The mobile studio starts with collapsed panels to leave its viewport and command bar usable.

## Lighthouse

Local production preview, Lighthouse 12.8.2, mobile simulation, headless Chromium, software WebGL. This is a lab measurement, not a guarantee for Netlify or real devices.

| Category / metric | Result |
| --- | --- |
| Performance | **88** |
| Accessibility | **100** |
| Best practices | **100** |
| SEO | **100** |
| First contentful paint | 2.4 s |
| Largest contentful paint | 3.5 s |
| Total blocking time | 20 ms |
| Cumulative layout shift | 0 |

The 95+ performance goal remains unmet in this mobile lab run. Precomputed cube-UV studio lighting reduced measured blocking time from approximately 3.4 s to 20 ms, fonts are preloaded/self-hosted, 3D is split from initial UI code, scenes initialize near the viewport and stop rendering offscreen/in hidden tabs. Three.js remains a substantial lazy chunk (~207 KB gzip); the original AR bundle is ~659 KB uncompressed and isolated from marketing navigation. The build reports expected size warnings for these rendering bundles.

## Validation limits

Speech results and AR session/engine behavior are mocked in the automated permission and integration tests. The browser studio uses real headless WebGL. No real camera imagery, microphone transcription, mobile SLAM session, surface placement, physical world persistence, or device installation was tested. The showcase and walkthrough are labeled illustrations; live objects use the shared procedural library.

The existing 8th Wall path uses SLAM and a stabilized ray intersection with a horizontal world-space plane. WebXR uses native hit tests. Neither the existing engine's device compatibility nor its licensing/network requirements are bypassed by this website.

## Before deployment

1. Use Node 22.15+ and run `npm ci`, `npm run build`, `npm test`, and `npm run test:e2e` (install Chromium first).
2. Set `SITE_URL` to the real production origin, or let Netlify provide its `URL`. Build command: `npm run build`; publish directory: `dist`. Canonicals and sitemap intentionally omit an invented domain in unconfigured local builds.
3. Verify on physical supported Android and iOS devices over HTTPS: startup, camera denial/retry, engine initialization, reticle stability, typed/voice placement, movement around objects, bird/flock animation, clearing, XR session exit, and installation where supported. Also test a browser with unavailable speech recognition.
4. Confirm the runtime 8th Wall service and license expectations for the intended production use.
5. Deploy only after explicit user approval. No external registration or hosting service has been changed by this task.

## Review artifacts

- [Homepage, desktop](screenshots/home-desktop.png)
- [Homepage, mobile](screenshots/home-mobile.png)
- [Playground, desktop](screenshots/studio-desktop.png)
- [Playground, mobile](screenshots/studio-mobile.png)
- [Technology page](screenshots/technology-desktop.png)
- [AR preflight](screenshots/ar-preflight.png)
- Original SVG identity, PWA icons and real-render social artwork: `website/public/brand` and `src/pwa/icons`.

To regenerate lighting, run the development server and `node scripts/bake-environment.mjs`. To regenerate the social image/install icons, run the production preview and `node scripts/generate-artwork.mjs`, then rebuild. The cached environment atlas is shared across website scenes for the tab lifetime; per-object geometries and materials are disposed when removed.
