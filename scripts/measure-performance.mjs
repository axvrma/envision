import { performance } from "node:perf_hooks";
import fs from "node:fs";
import os from "node:os";
import * as THREE from "three";
import { createObject, disposeObject } from "../shared/models.js";
import { OBJECT_LIBRARY, COLORS } from "../shared/commands.js";
import { SceneStore, composition, exportScene } from "../shared/scene-state.js";
const report = {
  recordedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  cpu: os.cpus()[0].model,
  kind: "CPU-only synthetic measurements; not physical AR frame rates",
  models: [],
  domain: {},
};
for (const type of Object.keys(OBJECT_LIBRARY)) {
  let meshes = 0,
    triangles = 0;
  const start = performance.now();
  for (let i = 0; i < 10; i++) {
    const object = createObject(COLORS.gold, type);
    if (i === 9)
      object.traverse((child) => {
        if (child.isMesh) {
          meshes++;
          triangles +=
            (child.geometry.index?.count ??
              child.geometry.attributes.position.count) / 3;
        }
      });
    disposeObject(object);
  }
  report.models.push({
    type,
    meshes,
    triangles: Math.round(triangles),
    meanCreateAndDisposeMs: Number(
      ((performance.now() - start) / 10).toFixed(3),
    ),
  });
}
const store = new SceneStore(),
  start = performance.now();
for (let i = 0; i < 12; i++) store.create({ type: "flock" });
for (let i = 0; i < 1000; i++)
  store.update(store.objects[0].id, { rotation: i % 180 });
report.domain = {
  mutations: 1012,
  elapsedMs: Number((performance.now() - start).toFixed(3)),
  historyEntries: store.past.length,
  exportBytes: Buffer.byteLength(exportScene(composition(store.objects))),
};
const flock = report.models.find((row) => row.type === "flock");
report.worstCatalogScene = {
  objects: 12,
  type: "flock",
  meshes: flock.meshes * 12,
  triangles: flock.triangles * 12,
};
report.threeRevision = THREE.REVISION;
fs.writeFileSync(
  new URL("../docs/performance.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "CPU/model measurements written to docs/performance.json. These do not measure camera or device frame rates.",
);
