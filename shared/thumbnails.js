import * as THREE from "three";
import { createObject, disposeObject } from "./models.js";
import { COLORS, OBJECT_LIBRARY } from "./commands.js";
const cache = new Map();
/** One short-lived WebGL context; thumbnails use exactly the AR factories. */
export function modelThumbnails(color = "gold") {
  if (cache.has(color)) return cache.get(color);
  let renderer;
  const output = {};
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(160, 130);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8171b0, 1.3));
    const light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.position.set(2, 3, 4);
    scene.add(light);
    const camera = new THREE.PerspectiveCamera(35, 160 / 130, 0.01, 20);
    for (const type of Object.keys(OBJECT_LIBRARY)) {
      const model = createObject(COLORS[color], type);
      scene.add(model);
      const box = new THREE.Box3().setFromObject(model),
        center = box.getCenter(new THREE.Vector3()),
        size = box.getSize(new THREE.Vector3());
      const extent = Math.max(size.x, size.y, size.z);
      camera.position
        .copy(center)
        .add(
          new THREE.Vector3(1, 0.65, 1.7)
            .normalize()
            .multiplyScalar(extent * 2.3),
        );
      camera.lookAt(center);
      renderer.render(scene, camera);
      output[type] = renderer.domElement.toDataURL("image/png");
      scene.remove(model);
      disposeObject(model);
    }
    cache.set(color, output);
    if (cache.size > 3) cache.delete(cache.keys().next().value);
  } catch {
    /* Labels remain usable when WebGL is unavailable. */
  } finally {
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
  return output;
}
