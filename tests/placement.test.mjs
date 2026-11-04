import test from "node:test";
import assert from "node:assert/strict";
import {
  SceneStore,
  composition,
  createDefinition,
} from "../shared/scene-state.js";
import { PlacementController } from "../src/ar/placement.js";
function setup(failure = null) {
  const store = new SceneStore();
  let time = 0;
  const adapter = {
    start: async (callbacks) => {
      adapter.callbacks = callbacks;
      if (failure) throw failure;
    },
    stop: async () => {
      adapter.stopped = true;
    },
    preview: (pending, pose) => {
      adapter.pending = pending;
      adapter.pose = pose;
    },
  };
  const controller = new PlacementController(
    store,
    adapter,
    () => {},
    () => time,
  );
  return { store, adapter, controller, tick: (n) => (time = n) };
}
const pose = { position: [0, 0, -1], rotation: 0 };
test("launch initializes once, manual placement requires a fresh pose, cancel never mutates history", async () => {
  const { store, adapter, controller, tick } = setup();
  await controller.start();
  await controller.start();
  assert.equal(controller.active, true);
  controller.begin({ type: "rocket", color: "gold" });
  assert.equal(controller.canPlace, false);
  assert.throws(() => controller.confirm(), /fresh tracked target/);
  adapter.callbacks.tracking("ready", pose);
  assert.equal(controller.canPlace, true);
  tick(251);
  assert.equal(controller.canPlace, false);
  assert.throws(() => controller.confirm());
  tick(300);
  adapter.callbacks.tracking("ready", pose);
  controller.confirm();
  assert.equal(store.objects.length, 1);
  assert.deepEqual(store.objects[0].position, pose.position);
  controller.begin({ type: "cube", color: "blue" });
  controller.cancel();
  assert.equal(store.past.length, 1);
  await controller.end();
  assert.equal(adapter.stopped, true);
  assert.equal(controller.active, false);
  assert.equal(controller.pose, null);
});
test("tracking loss and invalid poses immediately disable placement", async () => {
  const { controller, adapter } = setup();
  await controller.start();
  controller.begin({ type: "cube" });
  for (const invalid of [
    null,
    { position: [NaN, 0, 0], rotation: 0 },
    { position: [0, 0, 30], rotation: 0 },
  ]) {
    adapter.callbacks.tracking("ready", invalid);
    assert.equal(controller.canPlace, false);
  }
  adapter.callbacks.tracking("ready", pose);
  adapter.callbacks.tracking("temporarily-lost");
  assert.equal(controller.canPlace, false);
  assert.equal(controller.pose, null);
  assert.equal(adapter.pose, null);
});
test("permission denial, unsupported features and startup failures leave no active session", async () => {
  for (const name of ["NotAllowedError", "NotSupportedError", "Error"]) {
    const { controller, adapter } = setup(
      Object.assign(new Error("test failure"), { name }),
    );
    await controller.start();
    assert.equal(controller.active, false);
    assert.equal(
      controller.state,
      name === "NotSupportedError" ? "unsupported" : "failed",
    );
    assert.ok(adapter.stopped);
    if (name === "NotAllowedError")
      assert.match(controller.error, /permission denied/);
  }
});
test("selection, updates, tracked move, deletion and saved-origin restoration", async () => {
  const { controller, adapter, store } = setup();
  await controller.start();
  controller.begin({ type: "bird", color: "blue" });
  adapter.callbacks.tracking("ready", pose);
  controller.confirm();
  const id = store.objects[0].id;
  controller.select(id);
  controller.update({ scale: 2 });
  assert.equal(store.objects[0].scale, 2);
  controller.move();
  adapter.callbacks.tracking("ready", { ...pose, position: [1, 0, -2] });
  controller.confirm();
  assert.deepEqual(store.objects[0].position, [1, 0, -2]);
  controller.remove();
  assert.equal(store.objects.length, 0);
  controller.load(composition([createDefinition({ type: "tree" })], "Trees"));
  assert.equal(store.objects.length, 0);
  controller.confirm();
  assert.deepEqual(store.objects[0].position, [1, 0, -2]);
});
test("late tracking callbacks cannot resurrect an ended session", async () => {
  const { controller, adapter } = setup();
  await controller.start();
  const callbacks = adapter.callbacks;
  await controller.end();
  callbacks.tracking("ready", pose);
  assert.equal(controller.pose, null);
  assert.equal(controller.active, false);
});
test("ending during initialization prevents overlapping starts and cleans late resources", async () => {
  const { controller, adapter } = setup();
  let resolve;
  adapter.start = () => new Promise((done) => (resolve = done));
  const launch = controller.start();
  const end = controller.end();
  await controller.start();
  assert.equal(controller.active, false);
  resolve();
  await launch;
  await end;
  assert.equal(controller.starting, false);
  assert.ok(adapter.stopped);
});
test("watchdog expires placement immediately, then reports a real camera-frame stall", async () => {
  const { controller, adapter, tick } = setup();
  await controller.start();
  controller.begin({ type: "cube" });
  adapter.callbacks.tracking("ready", pose);
  tick(251);
  controller.checkTracking();
  assert.equal(controller.canPlace, false);
  assert.equal(controller.pose, null);
  assert.equal(controller.lastFrameAt, 0);
  tick(8001);
  await controller.checkTracking();
  assert.equal(controller.active, false);
  assert.equal(controller.state, "failed");
  assert.match(controller.error, /stopped sending frames/);
});
test("frame heartbeats without placement hits keep a live scanning session alive", async () => {
  const { controller, adapter, tick } = setup();
  await controller.start();
  for (let time = 1000; time < 20000; time += 1000) {
    tick(time);
    adapter.callbacks.tracking("searching", null);
    await controller.checkTracking();
  }
  assert.equal(controller.active, true);
  await controller.end();
});
test("cleanup errors do not erase the original session failure or leave teardown unfinished", async () => {
  const { controller, adapter } = setup();
  await controller.start();
  adapter.stop = async () => {
    throw new Error("cleanup failure");
  };
  await controller.end(new Error("Camera disconnected"));
  assert.equal(controller.error, "Camera disconnected");
  assert.equal(controller.stopping, false);
  assert.equal(controller.active, false);
});
