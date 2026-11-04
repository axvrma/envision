import * as THREE from "three";
import { ARSceneRenderer } from "./renderer.js";
import { TrackedTargetFilter, surfaceHitPose } from "./tracking.js";
const supportedError = (message) =>
  Object.assign(new Error(message), { name: "NotSupportedError" });
export async function detectEngine() {
  if (!isSecureContext)
    throw supportedError("HTTPS is required for camera AR.");
  if (!navigator.mediaDevices?.getUserMedia)
    throw supportedError(
      "Camera access is unavailable in this browser. Use the browser Studio.",
    );
  try {
    if (await navigator.xr?.isSessionSupported("immersive-ar")) return "webxr";
  } catch {
    /* Explicit fallback is available; this does not imply engine compatibility. */
  }
  return "8thwall";
}
class BaseAdapter {
  constructor(container, overlay) {
    this.container = container;
    this.overlay = overlay;
    this.view = null;
    this.objects = [];
    this.selected = null;
    this.cleanups = [];
  }
  attach(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.view = new ARSceneRenderer(scene, camera, renderer);
    this.view.sync(this.objects, this.selected);
    const lost = (event) => {
      event.preventDefault();
      this.callbacks.tracking("failed");
      this.callbacks.ended(
        new Error("WebGL context lost. Restart AR or use browser Studio."),
      );
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    this.cleanups.push(() =>
      renderer.domElement.removeEventListener("webglcontextlost", lost),
    );
  }
  sync(objects, selected) {
    this.objects = objects;
    this.selected = selected;
    this.view?.sync(objects, selected);
  }
  preview(pending, pose) {
    this.view?.preview(pending, pose, this.objects);
  }
  select(x, y) {
    return this.view?.select(x, y) || null;
  }
  async stop() {
    this.cleanups.splice(0).forEach((fn) => fn());
    this.view?.dispose();
    this.view = null;
    this.container.replaceChildren();
  }
}
export class WebXRAdapter extends BaseAdapter {
  async start(callbacks) {
    this.callbacks = callbacks;
    this.stopping = false;
    if (!navigator.xr) throw supportedError("WebXR is unavailable.");
    // Required DOM overlay prevents an immersive session with inaccessible controls.
    this.session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test", "dom-overlay"],
      optionalFeatures: ["local-floor"],
      domOverlay: { root: this.overlay },
    });
    const session = this.session;
    if (this.stopping) {
      this.session = null;
      await session.end().catch(() => {});
      return;
    }
    const ended = () => {
      if (!this.stopping)
        callbacks.ended(
          new Error(
            "The AR session ended. Retry AR to scan a new placement origin.",
          ),
        );
    };
    session.addEventListener("end", ended);
    this.cleanups.push(() => session.removeEventListener("end", ended));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      innerWidth / innerHeight,
      0.01,
      30,
    );
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.setSize(innerWidth, innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local");
    this.container.appendChild(renderer.domElement);
    await renderer.xr.setSession(session);
    if (this.stopping) return;
    this.attach(scene, camera, renderer);
    const resize = () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      if (!renderer.xr.isPresenting) renderer.setSize(innerWidth, innerHeight);
    };
    window.addEventListener("resize", resize);
    this.cleanups.push(() => window.removeEventListener("resize", resize));
    const viewer = await session.requestReferenceSpace("viewer");
    this.hitSource = await session.requestHitTestSource({ space: viewer });
    if (this.stopping) {
      this.hitSource.cancel();
      this.hitSource = null;
      return;
    }
    const visibility = () => {
      if (session.visibilityState !== "visible")
        callbacks.tracking("temporarily-lost");
    };
    session.addEventListener("visibilitychange", visibility);
    this.cleanups.push(() =>
      session.removeEventListener("visibilitychange", visibility),
    );
    const reset = () =>
      callbacks.ended(
        new Error(
          "The tracking origin changed. Restart AR to place your composition at a new origin.",
        ),
      );
    const reference = renderer.xr.getReferenceSpace();
    reference.addEventListener("reset", reset);
    this.cleanups.push(() => reference.removeEventListener("reset", reset));
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const filter = new TrackedTargetFilter();
    let hadPose = false;
    renderer.setAnimationLoop((time, frame) => {
      if (this.stopping) return;
      try {
        let candidate = null;
        const viewerPose =
          frame && session.visibilityState === "visible"
            ? frame.getViewerPose(reference)
            : null;
        if (viewerPose && !viewerPose.emulatedPosition) {
          for (const hit of frame.getHitTestResults(this.hitSource)) {
            const tracked = hit.getPose(reference);
            if (!tracked) continue;
            matrix.fromArray(tracked.transform.matrix);
            if (
              !matrix.elements.every(Number.isFinite) ||
              matrix.elements[5] < 0.9
            )
              continue;
            position.setFromMatrixPosition(matrix);
            candidate = {
              position: position.toArray(),
              rotation: 0,
              kind: "detected-surface",
            };
            break;
          }
        }
        const pose = filter.update(candidate, time);
        callbacks.tracking(
          pose ? "ready" : hadPose ? "temporarily-lost" : "searching",
          pose,
          !viewerPose || viewerPose.emulatedPosition
            ? "limited"
            : candidate
              ? "settling"
              : "no-surface",
        );
        if (pose) hadPose = true;
        this.view?.animate(time);
        if (!this.stopping && this.view) renderer.render(scene, camera);
      } catch (error) {
        renderer.setAnimationLoop(null);
        callbacks.ended(
          new Error(
            `WebXR tracking failed: ${error?.message || "the device stopped providing a usable pose"}`,
          ),
        );
      }
    });
  }

  async stop() {
    this.stopping = true;
    this.renderer?.setAnimationLoop(null);
    try {
      this.hitSource?.cancel();
    } catch {
      /* Session may already have ended. */
    }
    this.hitSource = null;
    const session = this.session;
    this.session = null;
    await super.stop();
    if (session) await session.end().catch(() => {});
    this.renderer?.dispose();
    this.renderer = null;
  }
}
const SCRIPTS = [
  ["xrextras", "xrextras.js"],
  ["landing-page", "landing-page.js"],
  ["engine-binary", "xr.js"],
];
let libraryPromise;
function loadScript(name, file) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://cdn.jsdelivr.net/npm/@8thwall/${name}@1.0.0/dist/${file}`;
    script.crossOrigin = "anonymous";
    if (name === "engine-binary")
      script.setAttribute("data-preload-chunks", "slam");
    const timer = setTimeout(() => {
      script.remove();
      reject(
        new Error(
          `Timed out loading ${name}. Check your connection or use Studio.`,
        ),
      );
    }, 20000);
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(
        new Error(
          `Could not load ${name}. The third-party runtime may be unavailable.`,
        ),
      );
    };
    document.head.appendChild(script);
  });
}
async function loadLibraries() {
  window.THREE = THREE;
  if (window.XR8 && window.XRExtras && window.LandingPage) return;
  if (!libraryPromise)
    libraryPromise = (async () => {
      for (const [name, file] of SCRIPTS) await loadScript(name, file);
      if (!window.XR8)
        await new Promise((resolve, reject) => {
          const done = () => {
            clearTimeout(timer);
            resolve();
          };
          const timer = setTimeout(() => {
            window.removeEventListener("xrloaded", done);
            reject(new Error("8th Wall did not initialize."));
          }, 20000);
          window.addEventListener("xrloaded", done, { once: true });
        });
      if (!window.XR8?.Threejs || !window.XRExtras)
        throw new Error("8th Wall modules are unavailable.");
    })().catch((error) => {
      libraryPromise = null;
      throw error;
    });
  return libraryPromise;
}
export class EightWallAdapter extends BaseAdapter {
  async start(callbacks) {
    this.callbacks = callbacks;
    this.stopping = false;
    await loadLibraries();
    if (this.stopping) return;
    const XR8 = window.XR8;
    if (!XR8.XrController?.configure)
      throw supportedError(
        "This 8th Wall runtime cannot configure metre-based tracking. Use browser Studio.",
      );
    XR8.XrController.configure({ scale: "absolute" });
    const canvas = document.createElement("canvas");
    canvas.id = "camerafeed";
    this.container.appendChild(canvas);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      ray = new THREE.Raycaster(),
      point = new THREE.Vector3();
    const filter = new TrackedTargetFilter();
    let hadPose = false,
      trackingStatus = null,
      trackingReason = null,
      surfaceAPI = typeof XR8.XrController.hitTest === "function";
    await new Promise((resolve, reject) => {
      let started = false;
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              "8th Wall camera startup timed out. Check camera permissions and device compatibility.",
            ),
          ),
        25000,
      );
      this.cleanups.push(() => {
        clearTimeout(timer);
        reject(new Error("Session ended."));
      });
      const fail = (error) => {
        clearTimeout(timer);
        if (!started)
          reject(
            error instanceof Error
              ? error
              : new Error("8th Wall camera or tracking failed."),
          );
        else {
          callbacks.tracking("failed");
          callbacks.ended(
            error instanceof Error
              ? error
              : new Error("8th Wall tracking failed."),
          );
        }
      };
      const module = {
        name: "envision-playground",
        onStart: () => {
          if (this.stopping) return;
          const { scene, camera, renderer } = XR8.Threejs.xrScene();
          renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
          this.attach(scene, camera, renderer);
          XR8.XrController.updateCameraProjectionMatrix({
            origin: camera.position,
            facing: camera.quaternion,
          });
          clearTimeout(timer);
          started = true;
          resolve();
        },
        listeners: [
          {
            event: "reality.trackingstatus",
            process: ({ detail }) => {
              trackingStatus = detail?.status || null;
              trackingReason = detail?.reason || null;
              if (trackingStatus !== "NORMAL") {
                filter.reset();
                callbacks.tracking(
                  hadPose ? "temporarily-lost" : "searching",
                  null,
                  detail?.reason === "INITIALIZING"
                    ? "initializing"
                    : "limited",
                );
              }
            },
          },
        ],
        onUpdate: ({ processCpuResult }) => {
          if (!this.view || this.stopping) return;
          try {
            const reality = processCpuResult?.reality;
            if (reality?.trackingStatus)
              trackingStatus = reality.trackingStatus;
            if (reality?.trackingReason)
              trackingReason = reality.trackingReason;
            let candidate = null;
            // Use this frame's pose; a cached renderer camera can lag the tracking pipeline.
            const p = reality?.position,
              q = reality?.rotation;
            const freshPose =
              p &&
              q &&
              [p.x, p.y, p.z, q.x, q.y, q.z, q.w].every(Number.isFinite) &&
              Math.abs(Math.hypot(q.x, q.y, q.z, q.w) - 1) < 0.1;
            if (trackingStatus === "NORMAL" && freshPose) {
              this.camera.position.set(p.x, p.y, p.z);
              this.camera.quaternion.set(q.x, q.y, q.z, q.w).normalize();
              this.camera.updateMatrixWorld();
              this.camera.projectionMatrixInverse
                .copy(this.camera.projectionMatrix)
                .invert();
              if (surfaceAPI) {
                try {
                  candidate = surfaceHitPose(
                    XR8.XrController.hitTest(0.5, 0.5),
                  );
                } catch {
                  surfaceAPI = false;
                }
              }
              if (!candidate) {
                ray.setFromCamera({ x: 0, y: 0 }, this.camera);
                if (
                  ray.ray.direction.y < -0.05 &&
                  ray.ray.intersectPlane(plane, point) &&
                  ray.ray.origin.distanceTo(point) >= 0.15 &&
                  ray.ray.origin.distanceTo(point) < 8
                )
                  candidate = {
                    position: point.toArray(),
                    rotation: 0,
                    kind: "estimated-ground",
                  };
              }
            }
            const pose = filter.update(candidate, performance.now());
            callbacks.tracking(
              pose ? "ready" : hadPose ? "temporarily-lost" : "searching",
              pose,
              trackingStatus !== "NORMAL"
                ? trackingReason === "INITIALIZING"
                  ? "initializing"
                  : "limited"
                : candidate
                  ? "settling"
                  : "no-surface",
            );
            if (pose) hadPose = true;
            this.view?.animate(performance.now());
          } catch (error) {
            fail(
              new Error(
                `AR tracking failed: ${error?.message || "invalid camera data"}`,
              ),
            );
          }
        },
        onPaused: () => {
          if (!this.stopping)
            fail(
              new Error(
                "The AR camera was paused. Restart AR to continue tracking.",
              ),
            );
        },
        onDetach: () => {
          if (!this.stopping)
            fail(
              new Error(
                "The AR engine stopped unexpectedly. Retry AR to start a new camera session.",
              ),
            );
        },
        onException: fail,
        onCameraStatusChange: ({ status }) => {
          if (["failed", "hasVideoError", "hasStreamError"].includes(status))
            fail(
              new Error(
                "Camera unavailable or permission denied. Check browser settings.",
              ),
            );
        },
      };
      XR8.addCameraPipelineModules([
        XR8.GlTextureRenderer.pipelineModule(),
        XR8.Threejs.pipelineModule(),
        XR8.XrController.pipelineModule(),
        window.XRExtras.FullWindowCanvas.pipelineModule(),
        module,
      ]);
      // Keep the legacy SLAM pipeline. The new preflight owns loading/error UI instead of XRExtras overlays.
      const config = { canvas };
      const devices = XR8.XrConfig?.device?.();
      // ANY permits desktop camera rendering but disables world tracking.
      // Keep a world-tracking-capable device class or the engine's default.
      if (devices)
        config.allowedDevices = devices.MOBILE_AND_HEADSETS ?? devices.MOBILE;
      Promise.resolve(XR8.run(config)).catch(fail);
    });
  }
  async stop() {
    this.stopping = true;
    try {
      await Promise.resolve(window.XR8?.stop?.());
    } finally {
      try {
        window.XR8?.clearCameraPipelineModules?.();
      } finally {
        await super.stop();
        this.renderer?.dispose();
        this.renderer = null;
      }
    }
  }
}
