import type { SceneObject, SavedScene } from "../scene-state";
export function downloadBlob(blob: Blob, filename: string): void;
export function mountSceneManager(
  host: HTMLElement,
  options: {
    getObjects: () => SceneObject[];
    onLoad: (scene: SavedScene) => void;
    notify?: (message: string) => void;
  },
): { open: () => void; destroy: () => void };
