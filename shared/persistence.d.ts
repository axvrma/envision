import type { SavedScene } from "./scene-state";
export type SceneRecord = { id: string; scene: SavedScene; updatedAt: number };
export const MAX_SAVED_SCENES: number;
export class SceneRepository {
  constructor(factory?: IDBFactory);
  list(): Promise<SceneRecord[]>;
  save(scene: SavedScene, id?: string): Promise<SceneRecord>;
  load(id: string): Promise<SavedScene>;
  remove(id: string): Promise<void>;
  rename(id: string, name: string): Promise<SceneRecord>;
  duplicate(id: string): Promise<SceneRecord>;
  close(): Promise<void>;
}
