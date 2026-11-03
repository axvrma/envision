// Optional asset maintenance: needs npm run dev on localhost:5173.
// Bake the room's cube-UV atlas once rather than compile/blur it on every visit.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/technology");
  const result = await page.evaluate(async (root) => {
    const THREE = await import(
      `/@fs${root}/node_modules/three/build/three.module.js`
    );
    const { RoomEnvironment } = await import(
      `/@fs${root}/node_modules/three/examples/jsm/environments/RoomEnvironment.js`
    );
    const renderer = new THREE.WebGLRenderer();
    const generator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    const raw = new Uint16Array(target.width * target.height * 4);
    renderer.readRenderTargetPixels(
      target,
      0,
      0,
      target.width,
      target.height,
      raw,
    );
    const pixels = new Uint8ClampedArray(raw.length);
    for (let i = 0; i < raw.length; i++)
      pixels[i] =
        i % 4 === 3
          ? 255
          : Math.round(
              Math.min(1, THREE.DataUtils.fromHalfFloat(raw[i])) * 255,
            );
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    canvas
      .getContext("2d")
      .putImageData(new ImageData(pixels, target.width, target.height), 0, 0);
    const png = canvas.toDataURL("image/png").split(",")[1];
    generator.dispose();
    room.dispose();
    target.dispose();
    renderer.dispose();
    return { png, width: canvas.width, height: canvas.height };
  }, path.resolve("."));
  await fs.writeFile(
    "website/public/brand/studio-environment.png",
    Buffer.from(result.png, "base64"),
  );
  console.log(`Baked ${result.width} × ${result.height} cube-UV environment.`);
} finally {
  await browser.close();
}
