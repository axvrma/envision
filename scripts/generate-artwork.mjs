// Regenerate local branding screenshots against a running production preview.
// npm run build && npm run preview (another terminal), then node scripts/generate-artwork.mjs
import { chromium } from "playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  await page.goto(process.env.ARTWORK_URL || "http://127.0.0.1:4173/");
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="scene"]')
        ?.getAttribute("data-ready") === "true",
  );
  await page.addStyleTag({
    content: `body{overflow:hidden}.site-header{position:absolute;background:none;top:25px;left:50px;height:45px;width:250px}.nav-inner{width:100%;margin:0}.site-header nav,.nav-launch,.menu-button,.hero-actions,.device-note,.compat-note,.hero-command,.hero-bottom,.scene-tools,.object-tag,.object-coordinate,.hero~*,.site-footer{display:none!important}.hero{width:1100px;min-height:630px;padding-top:162px}.hero h1{font-size:78px;letter-spacing:-4.7px}.hero-copy .eyebrow{font-size:8px;letter-spacing:1px}.hero-description{font-size:14px;line-height:1.8;max-width:420px}.hero-visual{width:58%;height:570px;top:38px;right:-40px}.scene-corner{top:35px}.hero-visual canvas{pointer-events:none}.hero:before{inset:0}`,
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "website/public/brand/social.png" });
  const icon = await fs.readFile("src/pwa/icons/icon.svg", "utf8");
  for (const size of [192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;width:${size}px;height:${size}px">${icon}</body></html>`,
    );
    await page.screenshot({ path: `src/pwa/icons/icon-${size}.png` });
  }
  console.log(
    "Updated social preview and Envision PWA icons. Run npm run build to include them.",
  );
} finally {
  await browser.close();
}
