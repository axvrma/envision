import { useEffect, useState } from "react";
import { parseCommand, type ObjectType } from "../../../shared/commands";
import {
  SceneStore,
  type SceneObject,
  type SavedScene,
} from "../../../shared/scene-state.js";
export type { SceneObject };
export const initialRocket: SceneObject = {
  id: "initial-rocket",
  type: "rocket",
  color: "gold",
  position: [0, 0, 0],
  rotation: 20,
  scale: 1,
};
export function useScene(studio = false) {
  const [store] = useState(() => new SceneStore([initialRocket]));
  const [, render] = useState(0);
  useEffect(() => store.subscribe(() => render((value) => value + 1)), [store]);
  const [selected, setSelected] = useState<string | null>(initialRocket.id);
  const [mode, setMode] = useState<"add" | "replace">(
    studio ? "add" : "replace",
  );
  const [message, setMessage] = useState("Choose a form. Make it yours.");
  const [resetKey, setResetKey] = useState(0);
  const [cameraView, setCameraView] = useState({ azimuth: 0, zoom: 0 });
  function attempt(action: () => void) {
    try {
      action();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }
  function create(type: ObjectType, color: string) {
    attempt(() => {
      const index = mode === "add" ? store.objects.length : 0;
      const item = store.create(
        {
          type,
          color,
          position: [
            index ? (index % 3 === 1 ? -0.4 : index % 3 === 2 ? 0.4 : 0) : 0,
            0,
            index ? Math.floor(index / 3) * -0.4 : 0,
          ],
          rotation: 20,
          scale: 1,
        },
        mode,
      );
      setSelected(item.id);
      setMessage(
        `Created ${color} ${type === "flock" ? "flock of birds" : type}. Yours to explore.`,
      );
    });
  }
  function clear() {
    if (
      store.objects.length &&
      (!studio ||
        window.confirm("Clear all objects? You can undo this change."))
    ) {
      store.clear();
      setSelected(null);
      setMessage("Scene cleared. Make room for your next idea.");
    }
  }
  function execute(text: string) {
    const command = parseCommand(text);
    if (!command) {
      setMessage(
        "Try a color and an object, like “blue bird” or “gold rocket”.",
      );
      return;
    }
    if (command.action === "clear") {
      clear();
      return;
    }
    create(command.objectType, command.colorName);
  }
  return {
    objects: store.objects,
    selected: store.objects.some((o) => o.id === selected) ? selected : null,
    setSelected,
    mode,
    setMode,
    message,
    setMessage,
    resetKey,
    cameraView,
    execute,
    create,
    store,
    canUndo: !!store.past.length,
    canRedo: !!store.future.length,
    undo: () => {
      store.undo();
      setMessage("Latest scene change undone.");
    },
    redo: () => {
      store.redo();
      setMessage("Scene change redone.");
    },
    load: (scene: SavedScene) =>
      attempt(() => {
        store.commit(scene.objects);
        setSelected(scene.objects[0]?.id || null);
        setMessage(
          "Saved composition opened. Launch AR and open it there to place at a new origin.",
        );
      }),
    duplicate: (id: string) =>
      attempt(() => {
        const item = store.duplicate(id);
        setSelected(item.id);
        setMessage(
          "Object duplicated at its existing position. Adjust its position in the inspector.",
        );
      }),
    orbit: (direction: number) => {
      setCameraView((view) => ({
        ...view,
        azimuth: view.azimuth + (direction * Math.PI) / 8,
      }));
      setMessage("Camera rotated.");
    },
    zoom: (direction: number) => {
      setCameraView((view) => ({
        ...view,
        zoom: Math.max(-3, Math.min(3, view.zoom + direction)),
      }));
      setMessage(direction > 0 ? "Camera zoomed in." : "Camera zoomed out.");
    },
    reset: () => {
      setCameraView({ azimuth: 0, zoom: 0 });
      setResetKey((key) => key + 1);
      setMessage("Camera reset to the starting view.");
    },
    clear,
    update: (id: string, patch: Partial<SceneObject>) =>
      attempt(() => store.update(id, patch)),
    remove: (id: string) => {
      store.remove(id);
      setSelected(null);
      setMessage("Object removed.");
    },
  };
}
export type SceneController = ReturnType<typeof useScene>;
