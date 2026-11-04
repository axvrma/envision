import { validateScene } from "./scene-state.js";
export const MAX_SAVED_SCENES = 50;
/** All writes resolve on transaction completion, so quota/abort errors are reported. */
export class SceneRepository {
  constructor(factory) {
    try {
      this.factory = arguments.length ? factory : globalThis.indexedDB;
    } catch {
      this.factory = null;
    }
    this.connection = null;
  }
  async open() {
    if (!this.factory)
      throw new Error(
        "Local scene storage is unavailable in this browser. Export JSON instead.",
      );
    if (this.connection) return this.connection;
    this.connection = new Promise((resolve, reject) => {
      const request = this.factory.open("envision-playground", 1);
      let blocked = false;
      request.onupgradeneeded = () =>
        request.result.createObjectStore("scenes", { keyPath: "id" });
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          this.connection = null;
        };
        resolve(db);
      };
      request.onerror = () =>
        reject(
          new Error("Could not open local scene storage. Export JSON instead."),
        );
      request.onblocked = () => {
        blocked = true;
        reject(
          new Error(
            "Storage upgrade blocked. Close other Envision tabs and retry.",
          ),
        );
      };
    });
    try {
      return await this.connection;
    } catch (error) {
      this.connection = null;
      throw error;
    }
  }
  async transaction(mode, operation) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("scenes", mode);
      let result;
      const request = operation(tx.objectStore("scenes"));
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () =>
        reject(
          new Error(
            "Scene storage failed. Storage may be full or disabled. Export JSON instead.",
          ),
        );
    });
  }
  async list() {
    const rows = await this.transaction("readonly", (store) => store.getAll());
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async save(scene, id = crypto.randomUUID()) {
    const valid = validateScene(scene);
    const record = { id, scene: valid, updatedAt: Date.now() };
    const db = await this.open();
    // The limit and write share a transaction, including across competing tabs.
    return new Promise((resolve, reject) => {
      const tx = db.transaction("scenes", "readwrite"),
        store = tx.objectStore("scenes");
      let failure = null;
      const request = store.getAllKeys();
      request.onsuccess = () => {
        if (
          !request.result.includes(id) &&
          request.result.length >= MAX_SAVED_SCENES
        ) {
          failure = new Error(
            "50 saved scenes reached. Delete one or export JSON.",
          );
          tx.abort();
          return;
        }
        store.put(record);
      };
      tx.oncomplete = () => resolve(record);
      tx.onerror = tx.onabort = () =>
        reject(
          failure ||
            new Error(
              "Scene storage failed. Storage may be full or disabled. Export JSON instead.",
            ),
        );
    });
  }
  async load(id) {
    const row = await this.transaction("readonly", (store) => store.get(id));
    if (!row) throw new Error("Saved scene no longer exists.");
    return validateScene(row.scene);
  }
  async remove(id) {
    await this.transaction("readwrite", (store) => store.delete(id));
  }
  async rename(id, name) {
    const scene = await this.load(id);
    return this.save({ ...scene, name }, id);
  }
  async duplicate(id) {
    const scene = await this.load(id);
    return this.save({ ...scene, name: `${scene.name.slice(0, 73)} (copy)` });
  }
  async close() {
    if (this.connection) (await this.connection).close();
    this.connection = null;
  }
}
