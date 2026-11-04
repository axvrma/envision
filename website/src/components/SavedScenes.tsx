import { useEffect, useRef } from "react";
import { mountSceneManager } from "../../../shared/ui/saved-scenes.js";
import type { SceneController } from "../lib/scene";
export default function SavedScenes({ scene }: { scene: SceneController }) {
  const host = useRef<HTMLDivElement>(null),
    manager = useRef<ReturnType<typeof mountSceneManager> | null>(null),
    current = useRef(scene);
  current.current = scene;
  useEffect(() => {
    if (!host.current) return;
    manager.current = mountSceneManager(host.current, {
      getObjects: () => current.current.objects,
      onLoad: (value) => current.current.load(value),
      notify: (message) => current.current.setMessage(message),
    });
    return () => manager.current?.destroy();
  }, []);
  return (
    <div className="studio-persistence" ref={host}>
      <button onClick={() => manager.current?.open()}>
        Save / open scenes
      </button>
      <button disabled={!scene.canUndo} onClick={scene.undo}>
        Undo
      </button>
      <button disabled={!scene.canRedo} onClick={scene.redo}>
        Redo
      </button>
    </div>
  );
}
