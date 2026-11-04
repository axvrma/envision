import { COLORS, OBJECT_LIBRARY } from "./commands.js";
export const MAX_OBJECTS = 12;
export const HISTORY_LIMIT = 40;
export const SCENE_VERSION = 2;
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3;
export const MAX_POSITION = 20;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const clone = (value) => JSON.parse(JSON.stringify(value));
export const normalizeRotation = (value) =>
  ((((value + 180) % 360) + 360) % 360) - 180;
export const clampScale = (value) =>
  Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
export function validateObject(value) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(value.id)
  )
    throw new Error("Invalid object identifier.");
  if (!own(OBJECT_LIBRARY, value.type)) throw new Error("Unknown object type.");
  if (!own(COLORS, value.color)) throw new Error("Unknown object color.");
  if (
    !Array.isArray(value.position) ||
    value.position.length !== 3 ||
    !value.position.every(
      (n) =>
        typeof n === "number" &&
        Number.isFinite(n) &&
        Math.abs(n) <= MAX_POSITION,
    )
  )
    throw new Error(
      "Position must contain three finite coordinates within 20 metres.",
    );
  if (
    !Number.isFinite(value.scale) ||
    value.scale < MIN_SCALE ||
    value.scale > MAX_SCALE
  )
    throw new Error("Scale must be between 0.2 and 3.");
  if (!Number.isFinite(value.rotation) || Math.abs(value.rotation) > 180)
    throw new Error("Rotation must be between -180 and 180 degrees.");
  return {
    id: value.id,
    type: value.type,
    color: value.color === "grey" ? "gray" : value.color,
    position: [...value.position],
    rotation: value.rotation,
    scale: value.scale,
  };
}
export function validateObjects(objects) {
  if (!Array.isArray(objects) || objects.length > MAX_OBJECTS)
    throw new Error(`Scenes support at most ${MAX_OBJECTS} objects.`);
  const result = objects.map(validateObject);
  if (new Set(result.map((o) => o.id)).size !== result.length)
    throw new Error("Object identifiers must be unique.");
  return result;
}
export function createDefinition({
  id = crypto.randomUUID(),
  type,
  color = "teal",
  position = [0, 0, 0],
  rotation = 0,
  scale = 1,
}) {
  return validateObject({ id, type, color, position, rotation, scale });
}
export function addObject(objects, object, mode = "add") {
  if (mode !== "replace" && objects.length >= MAX_OBJECTS)
    throw new Error(`Your scene has reached its ${MAX_OBJECTS}-object limit.`);
  return validateObjects(mode === "replace" ? [object] : [...objects, object]);
}
export function updateObject(objects, id, patch) {
  if (!objects.some((o) => o.id === id))
    throw new Error("Object no longer exists.");
  return validateObjects(
    objects.map((o) =>
      o.id === id ? { ...o, ...patch, id: o.id, type: o.type } : o,
    ),
  );
}
export function removeObject(objects, id) {
  return objects.filter((o) => o.id !== id);
}
export class SceneStore {
  constructor(objects = []) {
    this.objects = validateObjects(objects);
    this.past = [];
    this.future = [];
    this.listeners = new Set();
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit() {
    this.listeners.forEach((fn) => fn());
  }
  commit(objects) {
    const next = validateObjects(objects);
    if (JSON.stringify(next) === JSON.stringify(this.objects)) return;
    this.past.push(clone(this.objects));
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.objects = next;
    this.future = [];
    this.emit();
  }
  create(input, mode = "add") {
    const object = createDefinition(input);
    this.commit(addObject(this.objects, object, mode));
    return object;
  }
  update(id, patch) {
    this.commit(updateObject(this.objects, id, patch));
  }
  remove(id) {
    this.commit(removeObject(this.objects, id));
  }
  duplicate(id) {
    const source = this.objects.find((o) => o.id === id);
    if (!source) throw new Error("Select an object first.");
    // Duplicate at the existing valid pose. Move mode explicitly acquires a new target.
    return this.create({ ...source, id: crypto.randomUUID() });
  }
  clear() {
    this.commit([]);
  }
  undo() {
    if (!this.past.length) return;
    this.future.push(clone(this.objects));
    this.objects = this.past.pop();
    this.emit();
  }
  redo() {
    if (!this.future.length) return;
    this.past.push(clone(this.objects));
    this.objects = this.future.pop();
    this.emit();
  }
}
export function validateScene(value) {
  if (
    !value ||
    typeof value !== "object" ||
    ![1, SCENE_VERSION].includes(value.version)
  )
    throw new Error("Unsupported scene version. Expected version 1 or 2.");
  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 80
  )
    throw new Error("Scene names must contain 1–80 characters.");
  if (value.version === 2 && value.units !== "metres")
    throw new Error("Unsupported scene units.");
  return {
    version: SCENE_VERSION,
    units: "metres",
    name: value.name.trim(),
    objects: validateObjects(value.objects),
  };
}
export function composition(objects, name = "My playground") {
  const valid = validateObjects(objects);
  const origin = valid[0]?.position || [0, 0, 0];
  return validateScene({
    version: SCENE_VERSION,
    units: "metres",
    name,
    objects: valid.map((o) => ({
      ...o,
      position: o.position.map((n, i) => n - origin[i]),
    })),
  });
}
export function exportScene(scene) {
  return JSON.stringify(validateScene(scene), null, 2);
}
export function importScene(text) {
  if (
    typeof text !== "string" ||
    new TextEncoder().encode(text).length > 100000
  )
    throw new Error("Scene JSON must be smaller than 100 KB.");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  return validateScene(value);
}
export function atOrigin(scene, pose) {
  const source = validateScene(scene);
  const angle = (pose.rotation * Math.PI) / 180;
  return validateObjects(
    source.objects.map((o) => {
      const [x, y, z] = o.position;
      return {
        ...o,
        id: crypto.randomUUID(),
        position: [
          pose.position[0] + x * Math.cos(angle) + z * Math.sin(angle),
          pose.position[1] + y,
          pose.position[2] - x * Math.sin(angle) + z * Math.cos(angle),
        ],
        rotation: normalizeRotation(o.rotation + pose.rotation),
      };
    }),
  );
}
