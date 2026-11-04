import { test, expect } from "@playwright/test";
import { launchMockAR, mockEightWall } from "./support/ar-mock";
async function placeCrystal(page: any) {
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await page.getByRole("button", { name: "Add crystal", exact: true }).click();
  await page.getByRole("button", { name: "Place object", exact: true }).click();
}
test("landing prioritizes Launch AR and keeps the browser demo optional", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Envision — AR Experience");
  const launch = page
    .locator(".hero-copy")
    .getByRole("link", { name: "Launch AR Experience" });
  await expect(launch).toHaveClass(/primary/);
  await expect(launch).toHaveAttribute("href", "/ar/");
  await expect(page.locator("details.hero-command")).not.toHaveAttribute(
    "open",
  );
  await expect(
    page.locator(".hero-copy").getByRole("link", { name: "See how it works" }),
  ).toHaveAttribute("href", "#how-it-works");
  await launch.click();
  await expect(page).toHaveURL(/\/ar\/$/);
  await expect(
    page.getByRole("button", { name: "Start AR Experience" }),
  ).toBeVisible();
});
test("full camera framing preserves the video aspect instead of cropping it to the phone screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 924 });
  await launchMockAR(page);
  await expect(page.locator("#tracking-label")).toHaveText("TARGET READY");
  const ratio = () =>
    page.locator("#container canvas").evaluate((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return rect.width / rect.height;
    });
  await expect.poll(ratio).toBeCloseTo(0.75, 2);
  await page
    .getByRole("button", { name: "Scene actions and settings" })
    .click();
  await page.getByLabel("Camera framing", { exact: true }).selectOption("fill");
  await expect.poll(ratio).toBeCloseTo(412 / 924, 2);
  await page.getByLabel("Camera framing", { exact: true }).selectOption("fit");
  await expect.poll(ratio).toBeCloseTo(0.75, 2);
  await page.getByRole("button", { name: "Close scene actions" }).click();
  await page.setViewportSize({ width: 924, height: 412 });
  await expect.poll(ratio).toBeCloseTo(4 / 3, 2);
});
test("mocked engine capture includes its simulated viewfinder and models, with helpers excluded", async ({
  page,
}) => {
  await launchMockAR(page);
  await placeCrystal(page);
  await page.getByRole("button", { name: "Capture options" }).click();
  await expect(page.locator("#capture-feedback")).toContainText(
    "Camera view and objects captured",
  );
  await expect
    .poll(() =>
      page
        .locator("#capture-preview")
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  const pixels = await page
    .locator("#capture-preview")
    .evaluate((image: HTMLImageElement) => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let gold = 0;
      for (let i = 0; i < data.length; i += 4)
        if (
          data[i] > data[i + 2] * 1.25 &&
          data[i + 1] > data[i + 2] * 1.1 &&
          data[i] > 70
        )
          gold++;
      return { corner: [...data.slice(0, 3)], gold };
    });
  expect(pixels.corner[2]).toBeGreaterThan(pixels.corner[0] + 20);
  expect(pixels.gold).toBeGreaterThan(20);
  expect(
    await page.evaluate(() => (window as any).__captureHelpersVisible),
  ).toBe(0);
  expect(
    await page.evaluate(() =>
      (window as any).__modules.some(
        (module: any) => module.name === "mock-camera-screenshot",
      ),
    ),
  ).toBe(true);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download photo", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("envision-ar.jpg");
});
test("camera capture errors stay visible and do not silently substitute objects-only output", async ({
  page,
}) => {
  await launchMockAR(page);
  await page.evaluate(() => {
    (window as any).__captureFailure = true;
  });
  await page.getByRole("button", { name: "Capture options" }).click();
  await expect(page.locator("#capture-feedback")).toContainText(
    "Camera screenshot blocked",
  );
  await expect(page.locator("#capture-preview")).toBeHidden();
  await expect(page.locator("#capture-results")).toBeHidden();
  await page
    .getByRole("button", { name: "Export objects only", exact: true })
    .click();
  await expect(page.locator("#capture-feedback")).toContainText(
    "Camera background excluded",
  );
  await expect(page.locator("#capture-preview")).toBeVisible();
});
test("runtimes without camera snapshot support expose an explicit objects-only alternative", async ({
  page,
}) => {
  await mockEightWall(page);
  await page.addInitScript(() => {
    (window as any).__noCameraPhoto = true;
  });
  await page.goto("/ar/");
  await page.getByRole("button", { name: "Start AR Experience" }).click();
  await expect(page.locator("#tracking-label")).toHaveText("TARGET READY");
  await page.getByRole("button", { name: "Capture options" }).click();
  await expect(
    page.getByRole("button", { name: "Take AR photo", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#capture-description")).toContainText(
    "does not expose camera photos",
  );
  await expect(
    page.getByRole("button", { name: "Export objects only", exact: true }),
  ).toBeEnabled();
});
test("closing capture then ending AR cancels a pending shot and removes the camera canvas", async ({
  page,
}) => {
  await launchMockAR(page);
  await page.evaluate(() => {
    (window as any).__capturePending = true;
  });
  await page.getByRole("button", { name: "Capture options" }).click();
  await expect(page.locator("#capture-feedback")).toContainText(
    "Capturing camera",
  );
  await page.getByRole("button", { name: "Close capture" }).click();
  await expect(page.locator("#tracking-label")).toHaveText("TARGET READY");
  await page.getByRole("button", { name: "End AR session" }).click();
  await expect(page.locator("#container canvas")).toHaveCount(0);
  await expect(page.locator("#capture-preview")).toBeHidden();
  await expect(page.locator("#session-error-sheet")).not.toBeVisible();
});
