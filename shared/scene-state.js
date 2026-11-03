export const MAX_OBJECTS = 12;
export function addObject(objects, object, mode = "add") {
  if (mode === "replace") return [object];
  if (objects.length >= MAX_OBJECTS) return objects;
  return [...objects, object];
}
export function updateObject(objects, id, patch) {
  return objects.map((object) =>
    object.id === id ? { ...object, ...patch } : object,
  );
}
export function removeObject(objects, id) {
  return objects.filter((object) => object.id !== id);
}
