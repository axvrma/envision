export type ObjectType =
  | "cube"
  | "sphere"
  | "cylinder"
  | "cone"
  | "elephant"
  | "bird"
  | "flock"
  | "tree"
  | "rocket"
  | "crystal";
export const COLORS: Record<string, number>;
export const COLOR_ALIASES: Record<string, string>;
export const OBJECT_LIBRARY: Record<
  ObjectType,
  { label: string; aliases: string[] }
>;
export type ParsedCommand =
  | { action: "clear" }
  | {
      action: "create";
      color: number;
      colorName: string;
      objectType: ObjectType;
    };
export function parseCommand(input: string): ParsedCommand | null;
