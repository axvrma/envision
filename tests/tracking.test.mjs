import test from "node:test";
import assert from "node:assert/strict";
import { TrackedTargetFilter, surfaceHitPose } from "../src/ar/tracking.js";
const target = (x = 0, kind = "detected-surface", y = 0) => ({
  position: [x, y, -1],
  rotation: 0,
  kind,
});
test("target readiness requires consecutive live observations and never bridges a missing frame", () => {
  const filter = new TrackedTargetFilter();
  assert.equal(filter.update(target(), 0), null);
  assert.equal(filter.update(target(), 16), null);
  assert.deepEqual(filter.update(target(), 32).position, [0, 0, -1]);
  assert.equal(filter.update(null, 48), null);
  assert.equal(filter.update(target(), 64), null);
  assert.equal(filter.update(target(), 80), null);
  assert.ok(filter.update(target(), 96));
  for (const invalid of [
    target(NaN),
    target(21),
    { ...target(), rotation: Infinity },
  ])
    assert.equal(filter.update(invalid, 112), null);
});
test("smoothing suppresses small jitter, reacts quickly to movement and does not interpolate between surfaces", () => {
  const filter = new TrackedTargetFilter();
  [0, 16, 32].forEach((time) => filter.update(target(), time));
  assert.equal(filter.update(target(0.001), 48).position[0], 0);
  const moved = filter.update(target(0.15), 64);
  assert.ok(moved.position[0] > 0.07 && moved.position[0] < 0.15);
  assert.ok(filter.update(target(0.15), 80).position[0] > 0.1);
  assert.equal(filter.update(target(2), 96), null);
  assert.equal(filter.update(target(2), 112), null);
  assert.equal(filter.update(target(2), 128).position[0], 2);
  assert.equal(filter.update(target(2, "estimated-ground"), 144), null);
});
test("time-based filtering behaves consistently at 30 and 60 Hz", () => {
  function follow(step) {
    const filter = new TrackedTargetFilter();
    [-2 * step, -step, 0].forEach((time) => filter.update(target(), time));
    let pose;
    for (let time = step; time <= 100; time += step)
      pose = filter.update(target(0.04), time);
    return pose.position[0];
  }
  assert.ok(Math.abs(follow(100 / 3) - follow(100 / 6)) < 0.003);
});
test("native hit selection prefers finite horizontal detected surfaces and ignores feature points and walls", () => {
  const hit = {
    type: "ESTIMATED_SURFACE",
    position: { x: 1, y: 0.7, z: -1 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    distance: 1.5,
  };
  const best = surfaceHitPose([
    hit,
    { ...hit, type: "FEATURE_POINT" },
    { ...hit, type: "DETECTED_SURFACE", position: { x: 0, y: 1, z: -1 } },
  ]);
  assert.equal(best.kind, "detected-surface");
  assert.equal(best.position[1], 1);
  for (const invalid of [
    { ...hit, type: "FEATURE_POINT" },
    { ...hit, rotation: { x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 } },
    { ...hit, position: { x: Infinity, y: 0, z: 0 } },
    { ...hit, distance: NaN },
    { ...hit, distance: 9 },
    { ...hit, rotation: { x: 0, y: 0, z: 0, w: 0 } },
  ])
    assert.equal(surfaceHitPose([invalid]), null);
});
