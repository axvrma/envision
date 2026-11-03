export const COLORS = {
  red: 0xd93a31,
  blue: 0x2474ff,
  green: 0x2fbf71,
  yellow: 0xffc857,
  orange: 0xff8a3d,
  purple: 0x8b5cf6,
  white: 0xf8fafc,
  black: 0x1f2937,
  pink: 0xf472b6,
  cyan: 0x22d3ee,
  teal: 0x14b8a6,
  gold: 0xf59e0b,
  silver: 0xbfc7d5,
  gray: 0x8b95a7,
  grey: 0x8b95a7,
};

export const COLOR_ALIASES = {
  grey: "gray",
  aqua: "cyan",
  violet: "purple",
  golden: "gold",
};

export const OBJECT_LIBRARY = {
  cube: { label: "Cube", aliases: ["cube", "box", "block"] },
  sphere: { label: "Sphere", aliases: ["sphere", "ball", "orb"] },
  cylinder: { label: "Cylinder", aliases: ["cylinder", "tube", "pillar"] },
  cone: { label: "Cone", aliases: ["cone", "pyramid"] },
  elephant: { label: "Elephant", aliases: ["elephant", "mammoth"] },
  bird: { label: "Bird", aliases: ["bird", "sparrow", "parrot"] },
  flock: { label: "Bird Flock", aliases: ["birds", "flock", "flock of birds"] },
  tree: { label: "Tree", aliases: ["tree", "plant", "palm"] },
  rocket: { label: "Rocket", aliases: ["rocket", "spaceship", "ship"] },
  crystal: { label: "Crystal", aliases: ["crystal", "gem", "diamond"] },
};

/** Predefined command vocabulary, shared by the website and camera AR. */
export function parseCommand(input) {
  const command = input
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!command) return null;
  if (
    command === "clear" ||
    command === "clear scene" ||
    command === "remove all"
  )
    return { action: "clear" };
  const hasPhrase = (phrase) => ` ${command} `.includes(` ${phrase} `);
  const entries = Object.entries(OBJECT_LIBRARY)
    .flatMap(([key, value]) => value.aliases.map((alias) => ({ key, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);
  const found = entries.find(({ alias }) => hasPhrase(alias));
  if (!found) return null;
  const colorWord =
    Object.keys({ ...COLORS, ...COLOR_ALIASES }).find(hasPhrase) || "teal";
  const colorName = COLOR_ALIASES[colorWord] || colorWord;
  return {
    action: "create",
    color: COLORS[colorName],
    colorName,
    objectType: found.key,
  };
}
