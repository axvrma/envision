import type { ObjectType } from "./commands";
export type SceneObject = {
  id: string;
  type: ObjectType;
  color: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
};
export type SavedScene = {
  version: 2;
  units: "metres";
  name: string;
  objects: SceneObject[];
};
export const MAX_OBJECTS: number;
export const HISTORY_LIMIT: number;
export const SCENE_VERSION: number;
export const MIN_SCALE: number;
export const MAX_SCALE: number;
export const MAX_POSITION: number;
export function normalizeRotation(n: number): number;
export function clampScale(n: number): number;
export function validateObject(value: unknown): SceneObject;
export function validateObjects(value: unknown): SceneObject[];
export function createDefinition(
  input: Partial<SceneObject> & { type: ObjectType },
): SceneObject;
export function addObject(
  objects: SceneObject[],
  object: SceneObject,
  mode?: string,
): SceneObject[];
export function updateObject(
  objects: SceneObject[],
  id: string,
  patch: Partial<SceneObject>,
): SceneObject[];
export function removeObject(objects: SceneObject[], id: string): SceneObject[];
export class SceneStore {
  constructor(objects?: SceneObject[]);
  objects: SceneObject[];
  past: SceneObject[][];
  future: SceneObject[][];
  subscribe(fn: () => void): () => void;
  commit(objects: SceneObject[]): void;
  create(
    input: Partial<SceneObject> & { type: ObjectType },
    mode?: string,
  ): SceneObject;
  update(id: string, patch: Partial<SceneObject>): void;
  remove(id: string): void;
  duplicate(id: string): SceneObject;
  clear(): void;
  undo(): void;
  redo(): void;
}
export function validateScene(value: unknown): SavedScene;
export function composition(objects: SceneObject[], name?: string): SavedScene;
export function exportScene(scene: SavedScene): string;
export function importScene(text: string): SavedScene;
export function atOrigin(
  scene: SavedScene,
  pose: { position: number[]; rotation: number },
): SceneObject[];
