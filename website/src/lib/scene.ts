import { useState } from "react";
import { parseCommand, type ObjectType } from "../../../shared/commands";
import {
  addObject,
  updateObject,
  removeObject,
  MAX_OBJECTS,
} from "../../../shared/scene-state.js";
export type SceneObject = {
  id: string;
  type: ObjectType;
  color: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
};
export const initialRocket: SceneObject = {
  id: "initial-rocket",
  type: "rocket",
  color: "gold",
  position: [0, 0, 0],
  rotation: 20,
  scale: 1,
};
export function useScene(studio = false) {
  const [objects, setObjects] = useState<SceneObject[]>([initialRocket]);
  const [selected, setSelected] = useState<string | null>(initialRocket.id);
  const [mode, setMode] = useState<"add" | "replace">(
    studio ? "add" : "replace",
  );
  const [message, setMessage] = useState(
    "A little imagination goes a long way.",
  );
  const [resetKey, setResetKey] = useState(0);
  const [cameraView, setCameraView] = useState({ azimuth: 0, zoom: 0 });
  function execute(text: string) {
    const command = parseCommand(text);
    if (!command) {
      setMessage(
        "Try a color and an object, like “blue bird” or “gold rocket”.",
      );
      return;
    }
    if (command.action === "clear") {
      setObjects([]);
      setSelected(null);
      setMessage("Scene cleared. Make room for your next idea.");
      return;
    }
    if (mode === "add" && objects.length >= MAX_OBJECTS) {
      setMessage(
        `Your scene has reached its ${MAX_OBJECTS}-object limit. Remove one to keep creating.`,
      );
      return;
    }
    const index = mode === "add" ? objects.length : 0;
    const object: SceneObject = {
      id: crypto.randomUUID(),
      type: command.objectType,
      color: command.colorName,
      position: [
        index ? (index % 3 === 1 ? -1.8 : index % 3 === 2 ? 1.8 : 0) : 0,
        0,
        index ? Math.floor(index / 3) * -1.8 : 0,
      ],
      rotation: 20,
      scale: 1,
    };
    setObjects((previous) => addObject(previous, object, mode));
    setSelected(object.id);
    setMessage(
      `Created ${command.colorName} ${command.objectType === "flock" ? "flock of birds" : command.objectType}. Yours to explore.`,
    );
  }
  return {
    objects,
    selected,
    setSelected,
    mode,
    setMode,
    message,
    setMessage,
    resetKey,
    cameraView,
    execute,
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
    clear: () => {
      setObjects([]);
      setSelected(null);
      setMessage("Scene cleared. Make room for your next idea.");
    },
    update: (id: string, patch: Partial<SceneObject>) =>
      setObjects((previous) => updateObject(previous, id, patch)),
    remove: (id: string) => {
      setObjects((previous) => removeObject(previous, id));
      setSelected(null);
      setMessage("Object removed.");
    },
  };
}
export type SceneController = ReturnType<typeof useScene>;
