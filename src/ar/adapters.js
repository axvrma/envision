import * as THREE from "three";
import { ARSceneRenderer } from "./renderer.js";
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
      if (!this.stopping) callbacks.ended();
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
    const reset = () => callbacks.ended();
    const reference = renderer.xr.getReferenceSpace();
    reference.addEventListener("reset", reset);
    this.cleanups.push(() => reference.removeEventListener("reset", reset));
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    let hadPose = false;
    renderer.setAnimationLoop((time, frame) => {
      let pose = null;
      if (
        frame &&
        session.visibilityState === "visible" &&
        frame.getViewerPose(reference)
      ) {
        for (const hit of frame.getHitTestResults(this.hitSource)) {
          const tracked = hit.getPose(reference);
          if (!tracked) continue;
          matrix.fromArray(tracked.transform.matrix);
          // This release places upright objects on horizontal surfaces only.
          if (matrix.elements[5] < 0.95) continue;
          position.setFromMatrixPosition(matrix);
          pose = { position: position.toArray(), rotation: 0 };
          break;
        }
      }
      callbacks.tracking(
        pose ? "ready" : hadPose ? "temporarily-lost" : "searching",
        pose,
      );
      if (pose) hadPose = true;
      this.view?.animate(time);
      renderer.render(scene, camera);
    });
  }
  async stop() {
    this.stopping = true;
    this.renderer?.setAnimationLoop(null);
    this.hitSource?.cancel();
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
      point = new THREE.Vector3(),
      stable = new THREE.Vector3();
    let streak = 0,
      hadPose = false;
    await new Promise((resolve, reject) => {
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
        if (!this.view)
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
          resolve();
        },
        onUpdate: ({ processCpuResult }) => {
          if (!this.view || this.stopping) return;
          const reality = processCpuResult?.reality;
          let pose = null;
          if (reality?.trackingStatus === "NORMAL") {
            this.camera.updateMatrixWorld();
            ray.setFromCamera({ x: 0, y: 0 }, this.camera);
            if (
              ray.ray.direction.y < -0.05 &&
              ray.ray.intersectPlane(plane, point) &&
              ray.ray.origin.distanceTo(point) < 8
            ) {
              if (!streak) stable.copy(point);
              else stable.lerp(point, 0.18);
              streak++;
              if (streak >= 3)
                pose = { position: stable.toArray(), rotation: 0 };
            } else streak = 0;
          } else streak = 0;
          callbacks.tracking(
            pose ? "ready" : hadPose ? "temporarily-lost" : "searching",
            pose,
          );
          if (pose) hadPose = true;
          this.view.animate(performance.now());
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
    await Promise.resolve(window.XR8?.stop?.());
    window.XR8?.clearCameraPipelineModules?.();
    await super.stop();
    this.renderer?.dispose();
    this.renderer = null;
  }
}
