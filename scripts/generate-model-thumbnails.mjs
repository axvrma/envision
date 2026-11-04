// Run with the Vite development server active: npm run dev (default port 5173).
// The /@fs module route invokes the actual shared Three.js factories, independent of AR UI.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(process.env.THUMBNAIL_DEV_URL || "http://127.0.0.1:5173/");
  const thumbnails = await page.evaluate(
    async (modulePath) => {
      const { modelThumbnails } = await import(/* @vite-ignore */ modulePath);
      return modelThumbnails("gold");
    },
    "/@fs/" + path.join(root, "shared/thumbnails.js"),
  );
  const directory = path.join(root, "website/public/models/thumbnails");
  await fs.mkdir(directory, { recursive: true });
  if (Object.keys(thumbnails).length !== 10)
    throw new Error("Expected all ten model thumbnails. Check WebGL support.");
  for (const [type, data] of Object.entries(thumbnails))
    await fs.writeFile(
      path.join(directory, `${type}.png`),
      Buffer.from(data.split(",")[1], "base64"),
    );
  console.log(
    "Rendered ten gold form thumbnails from the shared model factories. Run npm run build to include them.",
  );
} finally {
  await browser.close();
}
