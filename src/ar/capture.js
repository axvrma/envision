import * as THREE from "three";
/** This is deliberately a virtual-only render. Camera pixels are never requested. */
export async function captureObjects(adapter) {
  if (!adapter.view)
    throw new Error("Start an AR session before capturing objects.");
  let renderer;
  const { view } = adapter;
  try {
    let source = adapter.renderer.xr?.isPresenting
      ? adapter.renderer.xr.getCamera(adapter.camera)
      : adapter.camera;
    if (source.cameras?.length) source = source.cameras[0];
    const camera = new THREE.PerspectiveCamera();
    camera.projectionMatrix.copy(source.projectionMatrix);
    camera.projectionMatrixInverse.copy(source.projectionMatrixInverse);
    source.updateWorldMatrix(true, false);
    source.matrixWorld.decompose(
      camera.position,
      camera.quaternion,
      camera.scale,
    );
    camera.updateMatrixWorld();
    const ratio = innerWidth / innerHeight,
      width = Math.round(Math.min(1280, 720 * ratio)),
      height = Math.round(width / ratio);
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    // Only application-owned virtual models and lights enter the export scene.
    // Engine-owned backgrounds, camera textures and helper meshes cannot be included.
    const virtualScene = new THREE.Scene();
    view.root.children
      .filter((child) => child.isLight)
      .forEach((light) => virtualScene.add(light.clone()));
    for (const model of view.models.values()) {
      const snapshot = new THREE.Group();
      snapshot.position.copy(model.position);
      snapshot.quaternion.copy(model.quaternion);
      snapshot.scale.copy(model.scale);
      snapshot.add(model.userData.model.clone(true));
      virtualScene.add(snapshot);
    }
    renderer.render(virtualScene, camera);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height + 48;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image capture is unavailable.");
    context.fillStyle = "#080711";
    context.fillRect(0, 0, width, height + 48);
    context.drawImage(renderer.domElement, 0, 0);
    context.fillStyle = "#d4c5ff";
    context.font = "14px sans-serif";
    context.fillText(
      "envision. · Virtual objects only · Camera excluded",
      16,
      height + 30,
    );
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("The browser blocked canvas capture.")),
        "image/png",
      ),
    );
    return blob;
  } catch (error) {
    throw new Error(`Capture failed: ${error.message}`);
  } finally {
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
}
