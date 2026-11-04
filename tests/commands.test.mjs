import test from "node:test";
import assert from "node:assert/strict";
import { parseCommand, COLORS, OBJECT_LIBRARY } from "../shared/commands.js";
import { createObject, disposeObject } from "../shared/models.js";
import {
  addObject,
  updateObject,
  removeObject,
  MAX_OBJECTS,
} from "../shared/scene-state.js";
import * as THREE from "three";
test("every supported color and object combination selects the intended model", () => {
  for (const [color, value] of Object.entries(COLORS))
    for (const object of Object.keys(OBJECT_LIBRARY)) {
      const parsed = parseCommand(`${color} ${object}`);
      assert.equal(parsed?.action, "create");
      assert.equal(parsed.objectType, object);
      assert.equal(parsed.color, value);
    }
});
test("aliases, punctuation, case, and longest multiword object match", () => {
  assert.deepEqual(parseCommand("Please create a GOLDEN rocket!"), {
    action: "create",
    objectType: "rocket",
    color: COLORS.gold,
    colorName: "gold",
  });
  assert.equal(parseCommand("violet flock of birds").objectType, "flock");
  assert.equal(parseCommand("aqua ball").colorName, "cyan");
  assert.equal(parseCommand("grey mammoth").colorName, "gray");
  assert.equal(parseCommand("a bird").colorName, "teal");
});
test("invalid words do not partially match the vocabulary", () => {
  for (const value of [
    "",
    "spaceshipwreck",
    "birdhouse",
    "red unicorn",
    "make a car",
    "cubelet",
  ])
    assert.equal(parseCommand(value), null);
});
test("clear commands are explicit and do not intercept ordinary phrases", () => {
  for (const value of ["clear", "clear scene", "remove all"])
    assert.deepEqual(parseCommand(value), { action: "clear" });
  assert.equal(parseCommand("clear gold rocket").action, "create");
});
test("every preserved procedural AR model builds, animates and disposes without DOM or camera", () => {
  for (const type of Object.keys(OBJECT_LIBRARY)) {
    const object = createObject(COLORS.gold, type);
    assert.ok(object.isGroup);
    assert.ok(!new THREE.Box3().setFromObject(object).isEmpty());
    object.userData.animate?.(100);
    disposeObject(object);
  }
});
