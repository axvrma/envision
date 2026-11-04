import test from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import {
  SceneStore,
  createDefinition,
  validateObject,
  validateScene,
  composition,
  exportScene,
  importScene,
  atOrigin,
  MAX_OBJECTS,
  HISTORY_LIMIT,
} from "../shared/scene-state.js";
import { SceneRepository } from "../shared/persistence.js";
const object = (patch = {}) =>
  createDefinition({ id: "one", type: "rocket", color: "gold", ...patch });
test("manual creation, transforms, duplicate/remove, limits and immutable inputs", () => {
  const input = object(),
    store = new SceneStore();
  store.create(input);
  store.update("one", { scale: 2, color: "blue", position: [1, 2, 3] });
  assert.equal(input.scale, 1);
  const copy = store.duplicate("one");
  assert.notEqual(copy.id, "one");
  assert.deepEqual(copy.position, [1, 2, 3]);
  store.remove("one");
  assert.equal(store.objects.length, 1);
  while (store.objects.length < MAX_OBJECTS) store.create({ type: "cube" });
  assert.throws(() => store.create({ type: "bird" }), /12-object limit/);
  assert.equal(store.objects.length, MAX_OBJECTS);
});
test("invalid object types, identifiers, colors, transforms and duplicate IDs are rejected atomically", () => {
  for (const patch of [
    { type: "constructor" },
    { type: "unicorn" },
    { color: "__proto__" },
    { id: "<script>" },
    { scale: NaN },
    { scale: Infinity },
    { scale: 0 },
    { rotation: 181 },
    { position: [0, NaN, 0] },
    { position: [0, 0] },
    { position: [21, 0, 0] },
  ])
    assert.throws(() => validateObject({ ...object(), ...patch }));
  const store = new SceneStore([object()]);
  assert.throws(() => store.update("one", { position: [Infinity, 0, 0] }));
  assert.throws(() => store.create(object()));
  assert.equal(store.objects[0].scale, 1);
  assert.equal(store.past.length, 0);
});
test("undo/redo are deterministic, bounded and discard redo after a new mutation", () => {
  const store = new SceneStore([object()]);
  for (let i = 0; i < 70; i++) store.update("one", { rotation: i });
  assert.equal(store.past.length, HISTORY_LIMIT);
  const snapshot = JSON.stringify(store.objects);
  store.undo();
  store.redo();
  assert.equal(JSON.stringify(store.objects), snapshot);
  store.undo();
  store.update("one", { color: "blue" });
  assert.equal(store.future.length, 0);
  store.clear();
  store.undo();
  assert.equal(store.objects.length, 1);
});
test("composition export/import uses relative metre transforms, schema migration and strict limits", () => {
  const scene = composition(
    [
      object({ position: [2, 1, -1] }),
      object({ id: "two", position: [3, 1, -2] }),
    ],
    "My scene",
  );
  assert.deepEqual(scene.objects[0].position, [0, 0, 0]);
  assert.deepEqual(scene.objects[1].position, [1, 0, -1]);
  assert.deepEqual(importScene(exportScene(scene)), scene);
  const legacy = { ...scene, version: 1 };
  delete legacy.units;
  assert.equal(validateScene(legacy).version, 2);
  for (const text of [
    "{}",
    "bad json",
    JSON.stringify({ ...scene, version: 99 }),
    JSON.stringify({ ...scene, units: "feet" }),
    JSON.stringify({ ...scene, objects: [object(), object()] }),
    " ".repeat(100001),
  ])
    assert.throws(() => importScene(text));
  const placed = atOrigin(scene, { position: [0, 0, -2], rotation: 90 });
  assert.ok(Math.abs(placed[1].position[0] + 1) < 1e-8);
  assert.ok(Math.abs(placed[1].position[2] + 3) < 1e-8);
  assert.notEqual(placed[0].id, scene.objects[0].id);
});
test("IndexedDB save/load, reopen, rename, duplicate and delete roundtrip", async () => {
  const repository = new SceneRepository(indexedDB);
  const scene = composition([object()], "Saved rocket");
  const row = await repository.save(scene);
  assert.deepEqual(await repository.load(row.id), scene);
  await repository.rename(row.id, "New name");
  const copy = await repository.duplicate(row.id);
  assert.equal(copy.scene.name, "New name (copy)");
  await repository.close();
  const reopened = new SceneRepository(indexedDB);
  assert.equal((await reopened.load(row.id)).name, "New name");
  await reopened.remove(row.id);
  await reopened.remove(copy.id);
  assert.deepEqual(await reopened.list(), []);
  await reopened.close();
});
test("storage unavailable, missing scene, invalid save and failed transaction are actionable", async () => {
  const unavailable = new SceneRepository(null);
  await assert.rejects(() => unavailable.list(), /unavailable/);
  const repository = new SceneRepository(indexedDB);
  await assert.rejects(() => repository.load("missing"), /no longer exists/);
  await assert.rejects(() => repository.save({ version: 99 }), /Unsupported/);
  const db = await repository.open();
  const transaction = db.transaction.bind(db);
  db.transaction = (...args) => {
    const tx = transaction(...args);
    queueMicrotask(() => tx.abort());
    return tx;
  };
  await assert.rejects(() => repository.list(), /storage failed/);
  db.transaction = transaction;
  await repository.close();
});
test("saved scene count remains bounded even when writes race", async () => {
  const repository = new SceneRepository(indexedDB);
  const scene = composition([object()]);
  const results = await Promise.allSettled(
    Array.from({ length: 52 }, () => repository.save(scene)),
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    50,
  );
  assert.equal((await repository.list()).length, 50);
  for (const row of await repository.list()) await repository.remove(row.id);
  await repository.close();
});
