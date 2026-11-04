# AR runtime capability audit · 2026-11-04

## Starting implementation

The original independent Webpack entry used Three.js r152, WebXR immersive sessions/hit testing, and runtime-loaded 8th Wall `@1` scripts. Mobile user-agent detection forced the 8th Wall path even on WebXR-capable Android. Manual creation existed only in the React Studio. Camera AR accepted voice/text and used a mutable array of Three.js objects (30-object cap), random yaw, and no common scene schema, persistence or history.

The original WebXR path could keep `reticleVisible` after a frame without a usable pose. The 8th Wall path intersected the center camera ray with `y=0`, smoothed/held previous targets, and did not check the engine's tracking status. Creation could consequently use a stale reticle. The 8th Wall default scale was responsive, with a separate 2.15 model multiplier; this was not compatible with metre-based saved transforms. The UI implied surface placement without distinguishing engine capabilities. It also passed `allowedDevices: ANY`; the official run API documents that world tracking requires `MOBILE_AND_HEADSETS` or `MOBILE`. The new adapter uses that world-tracking-capable device class/default instead of enabling an unsupported desktop-camera path.

## Runtime delivery checked

The npm registry reported version **1.0.0** for each existing package. Each exact script returned HTTP 200 during this execution:

| Package | Pinned runtime endpoint | Downloaded script characters |
| --- | --- | ---: |
| XRExtras | `https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1.0.0/dist/xrextras.js` | 131,921 |
| Landing Page | `https://cdn.jsdelivr.net/npm/@8thwall/landing-page@1.0.0/dist/landing-page.js` | 120,316 |
| Engine Binary | `https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1.0.0/dist/xr.js` | 1,036,652 |

These sizes describe script text, not total startup traffic. The engine package's reported unpacked size was 30,986,202 bytes and it loads additional binary/chunk resources. Delivery does not establish successful initialization, permission handling, SLAM performance, or future CDN availability. No production credentials were supplied or invented.

The retained integration uses `window.THREE`, `GlTextureRenderer`, `Threejs`, `XrController`, and an application-owned camera viewport module. XRExtras remains loaded for compatibility, but FullWindowCanvas is replaced after auditing its sizing/reparenting behavior. Landing Page remains loaded for compatibility with the existing script set, but the new preflight owns startup and errors, so the old Landing Page/Loading/RuntimeError UI modules are no longer installed. World tracking is not replaced by a simulation.

## Public service and license state

Official migration documentation says platform access ended February 28, 2026; legacy hosted experiences remain available through February 28, 2027. Envision uses a separately distributed npm binary, rather than an old hosted-project URL. The hosting timeline therefore does not establish the availability of this specific CDN integration.

The world-tracking binary is closed source under the **XR Engine License Agreement**. The separately open MIT engine framework excludes SLAM. Official distribution guidance calls for copyright, engine attribution, and a license/warranty reference. AR Scene actions → Engine, privacy & credits and `/technology` expose these notices and a license link. This implementation makes no blanket claim that every use of Envision complies with the binary's permitted-purpose restrictions. A release owner must evaluate the intended distribution against the actual license; no license approval or paid service was fabricated.

Primary sources checked:

- [Engine forms and license compliance](https://8thwall.org/docs/open-source)
- [Migration FAQ, service timeline, binary limitations](https://8thwall.org/docs/migration/faq)
- [XR Engine License Agreement](https://github.com/8thwall/engine/blob/main/LICENSE)
- [XrController tracking output and NORMAL/LIMITED states](https://8thwall.org/docs/api/engine/xrcontroller/pipelinemodule)
- [SDK hit-test result types, position, rotation and distance](https://8thwall.org/docs/api/engine/xrcontroller/hittest)
- [Absolute versus responsive scale configuration](https://8thwall.org/docs/api/engine/xrcontroller/configure)
- [XR8.run device classes and world-tracking restriction](https://8thwall.org/docs/api/engine/xr8/run)
- [XR8.stop closes camera feed and motion tracking](https://8thwall.org/docs/api/engine/xr8/stop)
- [WebXR hit-test specification explainer](https://immersive-web.github.io/hit-test/hit-testing-explainer)
- [WebXR DOM overlay explainer](https://github.com/immersive-web/dom-overlays/blob/main/explainer.md)

## Capabilities implemented

| Capability | WebXR adapter | 8th Wall adapter |
| --- | --- | --- |
| Launch | Explicit tap; immersive AR with required hit-test + DOM overlay | Explicit tap; pinned CDN scripts, runtime/device checks, startup timeout |
| Tracking readiness | Visible XR session, valid viewer pose, current horizontal hit pose | `processCpuResult.reality.trackingStatus === 'NORMAL'` |
| Target | Current horizontal native hit test (up-axis threshold 0.9), filtered over fresh frames | Prefer SDK `DETECTED_SURFACE` then `ESTIMATED_SURFACE` horizontal hits; otherwise labeled `y=0` ray intersection, 0.15–8m, 3 fresh samples, time-based smoothing |
| Units | XR local metres | Documented `configure({scale:'absolute'})`; startup refuses an engine without configure |
| Target age | Confirmation requires a pose newer than 250ms | Same; no held pose enables placement |
| Tracking loss | No target; disabled placement | No target; disabled placement |
| Reposition | Explicit Move + fresh reticle confirmation | Same; no screen-coordinate or arbitrary-world fallback |
| Anchoring | Session-local world transforms; end on reference-space reset | Engine session world coordinates; scale/tracking accuracy depends on runtime |
| Persistent anchors | Not implemented or promised | Not implemented or promised |
| Selection | Raycast via active XR view camera; accessible selector alternative | Raycast via engine camera; accessible selector alternative |
| Combined camera capture | Camera access not integrated; disabled with an explanation | Public CanvasScreenshot module + takeScreenshot; real camera output still needs physical-device validation |
| Capture alternative | Explicitly requested, labeled virtual-only PNG | Same secondary export; never a silent substitute for failed camera capture |
| End/background/context loss | Cancel hit source, end session, dispose renderer/listeners/models | Stop XR8, clear pipeline modules, dispose application resources |

DOM overlay is required because all primary accessible placement controls live in the DOM. If a device reports immersive AR but rejects that feature set, startup fails visibly and the user can use Studio. No automatic session retry or second permission request is made after denial.

8th Wall absolute scale is documented to estimate real-world scale; this does not imply exact metrology. Its ground plane can differ from a table or elevated surface. Guidance labels it as an estimated ground plane. Physical checks of scale acquisition, tracking quality, device-specific camera interaction and restarts are still required.

## Network and data boundaries

Envision's code never uploads camera frames or screenshots, and does not implement a backend or analytics. WebXR and the engine manage their camera streams; browser recognition manages speech. The distributed SLAM binary cannot be fully audited from this application source. No claim is made that all third-party processing is local, that the engine makes no network requests, or that offline camera AR will work. A runtime network/privacy inspection on target hardware remains part of release verification.

The AR worker caches only the same-origin AR shell; it does not intercept/cache third-party runtime requests. Fonts are served from `/fonts/` and also lie outside that worker's cache scope. Saved compositions use same-origin IndexedDB; neither Netlify preview origins nor other devices share those records.

## Remaining external blockers

No physical Android WebXR or iOS/Android 8th Wall device is connected to this execution environment. Actual camera permission prompts, tracking, world stability, scale estimation, gesture event delivery in immersive DOM overlays, camera indicator cleanup and native sharing remain unverified. See the [device checklist](DEVICE-TEST-CHECKLIST.md). A camera-based release cannot truthfully be described as hardware-validated until those checks are performed.

## Physical 8th Wall regression follow-up

The user reported worse tracking on a physical phone using 8th Wall. The follow-up retains this engine and absolute units, reads each current tracking frame's camera pose, refreshes the projection inverse, and consumes NORMAL/LIMITED status events as well as frame fields. Missing/limited tracking still prevents placement. SDK surface hits, when available and horizontal, take priority over the ground-plane estimate. This is capability-based and does not promise all devices report detected surfaces.

The fixed-per-frame interpolation is replaced by time-based smoothing (20ms for larger movements, 45ms for small movements), a 2mm jitter deadband and stability checks for jumps. Synthetic tests compare 30/60Hz behavior, jitter, target changes and loss; these do not establish improvement on the user's physical phone. The camera pose and already-placed objects are never artificially smoothed.

The manual AR library previously rendered its thumbnails through temporary WebGL contexts during the camera session. It now serves gold form PNGs generated from the same factories. A browser regression checks that opening the library and changing palette colors creates zero additional WebGL contexts. This removes application-side graphics contention without introducing a new SLAM vendor or making unsupported claims about perfect tracking.

## Camera zoom and viewfinder capture follow-up

The old app changed the 8th Wall renderer pixel ratio in `onStart` while XRExtras FullWindowCanvas separately resized the camera drawing buffer and could reparent the canvas into `body`. This introduced conflicting size ownership and also left the camera canvas outside application-container cleanup. The replacement viewport module fits the complete camera aspect in the available window by default, caps buffer density before engine processing and keeps the canvas in the application container. Fill-screen cropping is optional. Renderer pixel ratio and tracked projection remain engine-owned. A camera track's supported zoom is requested at natural 1× through the already-granted stream; no second camera or permission prompt is opened. Hardware lens selection is not overridden through undocumented APIs.

The public CanvasScreenshot API is now integrated for camera + object capture where present. It is distinct from capturing a transparent WebGL canvas or manufacturing a background. The module is optional so an unavailable/broken photo API does not prevent AR startup. The current WebXR path still does not expose camera photo pixels.

Primary sources for this follow-up:

- [XRExtras FullWindowCanvas source (MIT)](https://github.com/8thwall/web/blob/master/xrextras/src/fullwindowcanvasmodule/full-window-canvas-module.ts)
- [CanvasScreenshot pipeline module](https://8thwall.org/docs/api/engine/canvasscreenshot/pipelinemodule)
- [Camera/scene screenshot API](https://8thwall.org/docs/api/engine/canvasscreenshot/takescreenshot)
- [Screenshot size/quality configuration](https://8thwall.org/docs/api/engine/canvasscreenshot/configure)

Mocked browser tests verify simulated camera-background/model pixels, helper exclusion, valid image downloads, framing aspect in both orientations, failure/unsupported behavior and cancellation. They do not establish actual optical FOV, physical camera fidelity or JPEG composition on the user's device; those remain checklist items.
