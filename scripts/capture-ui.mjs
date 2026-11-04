// Camera-free review screenshots. Run against npm run preview after npm run build.
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  for (const [route, name] of [
    ["/", "home-desktop"],
    ["/experience", "studio-desktop"],
    ["/technology", "technology-desktop"],
  ]) {
    await page.goto(`http://127.0.0.1:4173${route}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (route !== "/technology")
      await page
        .locator('[data-testid="scene"]')
        .first()
        .waitFor({ state: "visible" });
    if (route !== "/technology")
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="scene"]')
            ?.getAttribute("data-ready") === "true",
      );
    await page.screenshot({ path: `docs/screenshots/${name}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, name] of [
    ["/", "home-mobile"],
    ["/experience", "studio-mobile"],
    ["/ar/", "ar-preflight"],
  ]) {
    await page.goto(`http://127.0.0.1:4173${route}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (route !== "/ar/")
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="scene"]')
            ?.getAttribute("data-ready") === "true",
      );
    else
      await page.getByRole("button", { name: "Start AR Experience" }).waitFor();
    await page.screenshot({ path: `docs/screenshots/${name}.png` });
  }
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await page.screenshot({ path: "docs/screenshots/ar-library.png" });
  console.log(
    "Updated review UI screenshots. No AR session, camera or mocked tracking used.",
  );
} finally {
  await browser.close();
}
