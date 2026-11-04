import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraLayout,
  cameraViewportModule,
  resetCameraZoom,
} from "../src/ar/camera-view.js";
import { photoBlob, captureCameraPhoto } from "../src/ar/photo.js";
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9a8AAAAASUVORK5CYII=";
test("full-frame camera layout preserves sensor aspect in portrait/landscape without zoom crop", () => {
  for (const [width, height] of [
    [412, 924],
    [924, 412],
    [320, 568],
    [1440, 1000],
  ]) {
    const layout = cameraLayout({
      width,
      height,
      videoWidth: 1280,
      videoHeight: 960,
      dpr: 3,
    });
    assert.ok(
      Math.abs(
        layout.width / layout.height - (width > height ? 4 / 3 : 3 / 4),
      ) < 1e-8,
    );
    assert.ok(layout.width <= width && layout.height <= height);
    assert.ok(layout.left >= 0 && layout.top >= 0);
    assert.ok(Math.max(layout.pixelWidth, layout.pixelHeight) <= 1280);
  }
  const fill = cameraLayout({
    width: 412,
    height: 924,
    videoWidth: 1280,
    videoHeight: 960,
    dpr: 3,
    mode: "fill",
  });
  assert.equal(fill.width, 412);
  assert.equal(fill.height, 924);
  assert.throws(() => cameraLayout({ width: 0, height: 10 }));
});
test("viewport lifecycle changes canvas dimensions before rendering, supports framing and cleans resize listeners", () => {
  const saved = Object.fromEntries(
    ["window", "innerWidth", "innerHeight", "devicePixelRatio"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const events = new EventTarget();
  Object.assign(globalThis, {
    window: events,
    innerWidth: 412,
    innerHeight: 924,
    devicePixelRatio: 3,
  });
  const style = () => ({
      removeProperty(key) {
        delete this[key];
      },
    }),
    container = { style: style() },
    canvas = { style: style(), width: 0, height: 0 };
  try {
    const viewport = cameraViewportModule(container, canvas);
    viewport.module.onAttach({ videoWidth: 1280, videoHeight: 960 });
    assert.equal(container.style.width, "412px");
    assert.ok(Math.abs(canvas.width / canvas.height - 0.75) < 0.002);
    const initial = canvas.width;
    viewport.module.onCanvasSizeChange();
    assert.equal(canvas.width, initial);
    viewport.setMode("fill");
    assert.equal(container.style.height, "924px");
    viewport.setMode("fit");
    globalThis.innerWidth = 924;
    globalThis.innerHeight = 412;
    events.dispatchEvent(new Event("resize"));
    assert.ok(Math.abs(canvas.width / canvas.height - 4 / 3) < 0.003);
    viewport.dispose();
    assert.equal(container.style.width, undefined);
    events.dispatchEvent(new Event("resize"));
    assert.equal(container.style.width, undefined);
    viewport.dispose();
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
test("an already-authorized camera track resets to supported natural zoom without opening another camera", async () => {
  let constraints;
  const track = {
    getCapabilities: () => ({ zoom: { min: 0.5, max: 5 } }),
    getSettings: () => ({ zoom: 3 }),
    applyConstraints: async (value) => {
      constraints = value;
    },
  };
  await resetCameraZoom({ getVideoTracks: () => [track] });
  assert.deepEqual(constraints, { advanced: [{ zoom: 1 }] });
  constraints = null;
  track.getSettings = () => ({ zoom: 1 });
  await resetCameraZoom({ getVideoTracks: () => [track] });
  assert.equal(constraints, null);
  track.applyConstraints = async () => {
    throw new Error("unsupported");
  };
  track.getSettings = () => ({ zoom: 2 });
  await resetCameraZoom({ getVideoTracks: () => [track] });
});
test("photo decoding accepts engine image bytes and rejects malformed or misleading payloads", async () => {
  const blob = photoBlob(png);
  assert.equal(blob.type, "image/png");
  assert.ok(blob.size > 32);
  assert.equal(photoBlob("data:image/png;base64," + png).type, "image/png");
  for (const value of ["", null, "not a photo", "/9j/"])
    assert.throws(() => photoBlob(value));
});
test("engine photos hide application helpers only for capture and restore them on success/failure", async () => {
  const flags = [];
  const adapter = {
    view: { setCapturing: (value) => flags.push(value) },
    photoAPI: { takeScreenshot: async () => png },
  };
  const blob = await captureCameraPhoto(adapter);
  assert.equal(blob.type, "image/png");
  assert.deepEqual(flags, [true, false]);
  assert.equal(adapter.photoAbort, null);
  adapter.photoAPI.takeScreenshot = async () => {
    throw new Error("Security policy");
  };
  await assert.rejects(() => captureCameraPhoto(adapter), /Security policy/);
  assert.deepEqual(flags, [true, false, true, false]);
  await assert.rejects(() => captureCameraPhoto({}), /unavailable/);
});
test("ending a session cancels a pending photo and restores helpers without showing a late image", async () => {
  const flags = [];
  const adapter = {
    view: { setCapturing: (value) => flags.push(value) },
    photoAPI: { takeScreenshot: () => new Promise(() => {}) },
  };
  const photo = captureCameraPhoto(adapter);
  adapter.photoAbort.abort();
  await assert.rejects(() => photo, /session ended/);
  assert.equal(adapter.photoAbort, null);
  assert.deepEqual(flags, [true, false]);
});
