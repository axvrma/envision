import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  detectEngine,
  EightWallAdapter,
  WebXRAdapter,
} from "../src/ar/adapters.js";
function globals(t, values) {
  const descriptors = Object.fromEntries(
    Object.keys(values).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  for (const [key, value] of Object.entries(values))
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  t.after(() => {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
}
test("capability detection selects WebXR without starting camera; unavailable features use explicit fallback", async (t) => {
  let requested = 0;
  const navigator = {
    mediaDevices: { getUserMedia: () => requested++ },
    xr: { isSessionSupported: async () => true },
  };
  globals(t, { isSecureContext: true, navigator });
  assert.equal(await detectEngine(), "webxr");
  assert.equal(requested, 0);
  navigator.xr.isSessionSupported = async () => false;
  assert.equal(await detectEngine(), "8thwall");
  navigator.mediaDevices = null;
  await assert.rejects(detectEngine, /Camera access is unavailable/);
  globalThis.isSecureContext = false;
  await assert.rejects(detectEngine, /HTTPS/);
});
test("WebXR launch requires hit-test and DOM overlay, and preserves permission errors", async (t) => {
  const root = {};
  let options;
  globals(t, {
    navigator: {
      xr: {
        requestSession: async (mode, input) => {
          options = input;
          assert.equal(mode, "immersive-ar");
          throw Object.assign(new Error("denied"), { name: "NotAllowedError" });
        },
      },
    },
  });
  const adapter = new WebXRAdapter({}, root);
  await assert.rejects(() => adapter.start({}), { name: "NotAllowedError" });
  assert.deepEqual(options.requiredFeatures, ["hit-test", "dom-overlay"]);
  assert.equal(options.domOverlay.root, root);
});
test("real 8th Wall adapter accepts only NORMAL tracking + finite ground intersection, and stops all modules", async (t) => {
  const canvas = new EventTarget();
  const container = { appendChild: () => {}, replaceChildren: () => {} };
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(70, 1, 0.01, 30);
  camera.position.set(0, 1.5, 0);
  camera.lookAt(0, 0, -1.5);
  camera.updateMatrixWorld();
  let modules = [],
    stops = 0,
    disposed = 0,
    config;
  const renderer = {
    domElement: canvas,
    shadowMap: {},
    setPixelRatio: (value) => assert.ok(value <= 1.6),
    dispose: () => disposed++,
  };
  const XR8 = {
    XrConfig: {
      device: () => ({
        MOBILE_AND_HEADSETS: "mobile-and-headsets",
        ANY: "any",
      }),
    },
    Threejs: {
      pipelineModule: () => ({}),
      xrScene: () => ({ scene, camera, renderer }),
    },
    GlTextureRenderer: { pipelineModule: () => ({}) },
    XrController: {
      pipelineModule: () => ({}),
      configure: (value) => (config = value),
      updateCameraProjectionMatrix: () => {},
    },
    addCameraPipelineModules: (value) => (modules = value),
    run: (config) => {
      assert.equal(config.allowedDevices, "mobile-and-headsets");
      modules.forEach((module) => module.onStart?.({ canvas }));
    },
    stop: () => stops++,
    clearCameraPipelineModules: () => (modules = []),
  };
  globals(t, {
    window: {
      XR8,
      XRExtras: { FullWindowCanvas: { pipelineModule: () => ({}) } },
      LandingPage: {},
    },
    document: { createElement: () => canvas },
    devicePixelRatio: 3,
    matchMedia: () => ({ matches: true }),
  });
  const adapter = new EightWallAdapter(container, {});
  const tracking = [];
  await adapter.start({
    tracking: (state, pose) => tracking.push({ state, pose }),
    ended: () => {},
  });
  assert.deepEqual(config, { scale: "absolute" });
  const pipeline = modules.find((module) => module.onUpdate);
  for (let i = 0; i < 3; i++)
    pipeline.onUpdate({
      processCpuResult: { reality: { trackingStatus: "NORMAL" } },
    });
  assert.equal(tracking.at(-1).state, "ready");
  assert.ok(Math.abs(tracking.at(-1).pose.position[1]) < 1e-8);
  pipeline.onUpdate({
    processCpuResult: { reality: { trackingStatus: "LIMITED" } },
  });
  assert.equal(tracking.at(-1).state, "temporarily-lost");
  assert.equal(tracking.at(-1).pose, null);
  camera.lookAt(0, 3, -1);
  camera.updateMatrixWorld();
  for (let i = 0; i < 3; i++)
    pipeline.onUpdate({
      processCpuResult: { reality: { trackingStatus: "NORMAL" } },
    });
  assert.equal(tracking.at(-1).pose, null);
  await adapter.stop();
  assert.ok(stops > 0);
  assert.ok(disposed > 0);
  assert.equal(modules.length, 0);
  assert.equal(scene.children.length, 0);
});
