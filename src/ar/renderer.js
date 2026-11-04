import * as THREE from "three";
import { createObject, disposeObject } from "../../shared/models.js";
import { COLORS } from "../../shared/commands.js";
export class ARSceneRenderer {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.models = new Map();
    this.previewKey = null;
    this.capturing = false;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = false;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.root.add(new THREE.HemisphereLight(0xffffff, 0x8fb3ff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(2, 4, 3);
    this.root.add(key);
    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.055, 0.072, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xbda6ff, side: THREE.DoubleSide }),
    );
    this.reticle.visible = false;
    this.root.add(this.reticle);
    this.ghost = new THREE.Group();
    this.root.add(this.ghost);
    this.selection = new THREE.BoxHelper(new THREE.Object3D(), 0xbda6ff);
    this.selection.visible = false;
    this.root.add(this.selection);
    this.raycaster = new THREE.Raycaster();
  }
  model(item, ghost = false) {
    const wrapper = new THREE.Group();
    const model = createObject(COLORS[item.color], item.type);
    // Animate inside a transform wrapper: animation never changes the saved transform.
    model.position.y = model.userData.groundOffset || 0;
    model.traverse((child) => {
      if (child.userData.animate) child.userData.baseY = child.position.y;
      if (ghost && child.material) {
        for (const material of Array.isArray(child.material)
          ? child.material
          : [child.material]) {
          material.transparent = true;
          material.opacity = 0.45;
          material.depthWrite = false;
        }
      }
    });
    wrapper.add(model);
    wrapper.userData.model = model;
    wrapper.userData.type = item.type;
    wrapper.userData.color = item.color;
    return wrapper;
  }
  transform(wrapper, item) {
    wrapper.position.fromArray(item.position);
    wrapper.rotation.set(0, (item.rotation * Math.PI) / 180, 0);
    wrapper.scale.setScalar(item.scale);
  }
  sync(objects, selected) {
    for (const [id, model] of this.models)
      if (!objects.some((item) => item.id === id)) {
        this.root.remove(model);
        disposeObject(model);
        this.models.delete(id);
      }
    for (const item of objects) {
      let model = this.models.get(item.id);
      if (
        model &&
        (model.userData.type !== item.type ||
          model.userData.color !== item.color)
      ) {
        this.root.remove(model);
        disposeObject(model);
        this.models.delete(item.id);
        model = null;
      }
      if (!model) {
        model = this.model(item);
        this.models.set(item.id, model);
        this.root.add(model);
      }
      this.transform(model, item);
    }
    this.selected = selected;
    this.highlight();
  }
  highlight() {
    const model = this.models.get(this.selected);
    this.selection.visible = !!model && !this.capturing;
    if (model) {
      model.updateWorldMatrix(true, true);
      this.selection.setFromObject(model);
    }
  }
  preview(pending, pose, objects = []) {
    this.reticle.visible = !!pose && !this.capturing;
    this.ghost.visible = !!(pending && pose) && !this.capturing;
    if (pose) this.reticle.position.fromArray(pose.position);
    const key = pending;
    if (key !== this.previewKey) {
      this.ghost.children.slice().forEach((child) => {
        this.ghost.remove(child);
        disposeObject(child);
      });
      this.previewKey = key;
      let items = [];
      if (pending?.kind === "create")
        items = [
          {
            ...pending.input,
            id: "preview",
            position: [0, 0, 0],
            rotation: 0,
            scale: 1,
          },
        ];
      if (pending?.kind === "move") {
        const item = objects.find((o) => o.id === pending.id);
        if (item) items = [{ ...item, position: [0, 0, 0] }];
      }
      if (pending?.kind === "composition") items = pending.scene.objects;
      for (const item of items) {
        const model = this.model(item, true);
        this.transform(model, item);
        this.ghost.add(model);
      }
    }
    if (!pending || !pose) return;
    this.ghost.position.fromArray(pose.position);
    this.ghost.rotation.y =
      pending.kind === "move" ? 0 : (pose.rotation * Math.PI) / 180;
  }
  setCapturing(value) {
    this.capturing = value;
    if (value) {
      this.reticle.visible = false;
      this.ghost.visible = false;
      this.selection.visible = false;
    } else this.highlight();
  }
  select(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    )
      return null;
    let camera = this.renderer.xr?.isPresenting
      ? this.renderer.xr.getCamera(this.camera)
      : this.camera;
    if (camera.cameras?.length) camera = camera.cameras[0];
    this.raycaster.setFromCamera(
      {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1,
      },
      camera,
    );
    const hit = this.raycaster.intersectObjects(
      [...this.models.values()],
      true,
    )[0];
    if (!hit) return null;
    let node = hit.object;
    while (node.parent && node.parent !== this.root) node = node.parent;
    return (
      [...this.models.entries()].find(([, model]) => model === node)?.[0] ||
      null
    );
  }
  animate(time) {
    if (!this.reduced)
      for (const wrapper of this.models.values())
        wrapper.userData.model.userData.animate?.(time);
  }
  dispose() {
    this.scene.remove(this.root);
    disposeObject(this.root);
    this.models.clear();
  }
}
