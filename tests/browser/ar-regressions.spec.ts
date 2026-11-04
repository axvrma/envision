import { test, expect } from "@playwright/test";
import { mockEightWall, launchMockAR } from "./support/ar-mock";
async function assertSheetFits(page: any, selector: string) {
  const dimensions = await page
    .locator(selector)
    .evaluate((dialog: HTMLDialogElement) => {
      const rect = dialog.getBoundingClientRect();
      const width = visualViewport?.width || innerWidth;
      const overflow = [
        ...dialog.querySelectorAll(
          "button,input,select,a,summary,.sheet-heading,.action-grid,.saved-scene",
        ),
      ]
        .filter((e: any) => e.getClientRects().length)
        .map((e) => ({
          label:
            e.getAttribute("aria-label") || e.textContent?.trim().slice(0, 45),
          rect: e.getBoundingClientRect(),
        }))
        .filter(
          (e) => e.rect.left < rect.left - 1 || e.rect.right > rect.right + 1,
        );
      return {
        left: rect.left,
        right: rect.right,
        width,
        overflow: overflow.map((e) => e.label),
        scroll: dialog.scrollWidth,
        client: dialog.clientWidth,
      };
    });
  expect(dimensions.left).toBeGreaterThanOrEqual(-1);
  expect(dimensions.right).toBeLessThanOrEqual(dimensions.width + 1);
  expect(dimensions.overflow).toEqual([]);
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
}
test("all AR sheets and dismiss buttons fit real mobile viewports, including Pixel 9", async ({
  browser,
}) => {
  const context = await browser.newContext({
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.625,
    viewport: { width: 412, height: 924 },
  });
  const page = await context.newPage();
  await mockEightWall(page);
  await page.goto("/ar/");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Scene actions and settings" })
    .click();
  for (const viewport of [
    { width: 412, height: 924 },
    { width: 320, height: 568 },
    { width: 924, height: 412 },
  ]) {
    await page.setViewportSize(viewport);
    await assertSheetFits(page, "#settings-sheet");
  }
  await page.getByRole("button", { name: "Close scene actions" }).click();
  for (const viewport of [
    { width: 412, height: 924 },
    { width: 320, height: 568 },
    { width: 924, height: 412 },
  ]) {
    await page.setViewportSize(viewport);
    await page
      .getByRole("button", { name: "Scene actions and settings" })
      .click();
    await assertSheetFits(page, "#settings-sheet");
    await expect(
      page.getByRole("button", { name: "Close scene actions" }),
    ).toBeInViewport();
    await page.getByRole("button", { name: "Close scene actions" }).click();
    await page.getByRole("button", { name: "Add Object", exact: true }).click();
    await assertSheetFits(page, "#library-sheet");
    await page.getByRole("button", { name: "Close object library" }).click();
    await page.getByRole("button", { name: "Voice and text commands" }).click();
    await assertSheetFits(page, "#commands-sheet");
    await page.getByRole("button", { name: "Close commands" }).click();
    await page.getByRole("button", { name: "Capture options" }).click();
    await assertSheetFits(page, "#capture-sheet");
    await page.getByRole("button", { name: "Close capture" }).click();
    await page
      .getByRole("button", { name: "Scene actions and settings" })
      .click();
    await page
      .getByRole("button", { name: "Save / open scenes", exact: true })
      .click();
    await assertSheetFits(page, ".saved-scenes-dialog");
    await page.getByRole("button", { name: "Close saved scenes" }).click();
  }
  await page.setViewportSize({ width: 412, height: 924 });
  await page.getByRole("button", { name: "Start AR Experience" }).click();
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await page.getByRole("button", { name: "Add cube", exact: true }).click();
  await page.getByRole("button", { name: "Place object", exact: true }).click();
  await page.getByRole("button", { name: "Edit selected object" }).click();
  await assertSheetFits(page, "#inspector-sheet");
  await context.close();
});
test("a runtime failure replaces an open sheet with a visible notification and explicit retry", async ({
  page,
}) => {
  await launchMockAR(page);
  await page
    .getByRole("button", { name: "Scene actions and settings" })
    .click();
  await page.evaluate(() => {
    (window as any).__modules
      .find((module: any) => module.onException)
      .onException(new Error("Camera disconnected during tracking"));
  });
  const alert = page.getByRole("alertdialog", { name: "AR session failed" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Camera disconnected during tracking");
  await expect(page.locator("#settings-sheet")).not.toBeVisible();
  await expect(
    alert.getByRole("button", { name: "Retry AR", exact: true }),
  ).toBeEnabled();
  await alert.getByRole("button", { name: "Retry AR", exact: true }).click();
  await expect(alert).not.toBeVisible();
  await expect(page.locator("#tracking-label")).toHaveText("TARGET READY");
});
test("camera startup failure gives an actionable alert instead of a hidden status message", async ({
  page,
}) => {
  await mockEightWall(page);
  await page.addInitScript(() => {
    (window as any).__startupFailure = true;
  });
  await page.goto("/ar/");
  await page.getByRole("button", { name: "Start AR Experience" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Camera unavailable or permission denied",
  );
  await expect(
    page
      .getByRole("alertdialog")
      .getByRole("link", { name: "Open browser Studio" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Dismiss session notification" })
    .click();
  await expect(
    page.getByRole("button", { name: "Start AR Experience" }),
  ).toBeEnabled();
});
test("engine surface targets are labeled accurately and limited tracking invalidates them", async ({
  page,
}) => {
  await launchMockAR(page);
  await page.evaluate(() => {
    (window as any).__surfaceHits = [
      {
        type: "DETECTED_SURFACE",
        position: { x: 0, y: 0.7, z: -1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        distance: 1.2,
      },
    ];
  });
  await expect(page.locator("#engine-kind")).toHaveText(
    "8TH WALL · DETECTED SURFACE",
  );
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await page.getByRole("button", { name: "Add rocket", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Place object", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    (window as any).__tracking = "LIMITED";
  });
  await expect(
    page.getByRole("button", { name: "Place object", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#engine-kind")).toHaveText("8TH WALL · SCANNING");
  await expect(page.locator("#guidance-text")).toContainText(
    "Tracking is limited",
  );
});
test("AR library browsing and color changes do not create another WebGL context during tracking", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    const canvases = new WeakSet();
    (window as any).__webglContexts = 0;
    HTMLCanvasElement.prototype.getContext = function (
      type: any,
      ...args: any[]
    ) {
      const context = (getContext as any).call(this, type, ...args);
      if (context && String(type).includes("webgl") && !canvases.has(this)) {
        canvases.add(this);
        (window as any).__webglContexts++;
      }
      return context;
    } as any;
  });
  await launchMockAR(page);
  await expect(page.locator("#tracking-label")).toHaveText("TARGET READY");
  const contexts = await page.evaluate(() => (window as any).__webglContexts);
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await expect(page.locator("#object-grid img")).toHaveCount(10);
  for (const name of ["Use blue", "Use red", "Use cyan"])
    await page
      .locator("#library-colors")
      .getByRole("button", { name, exact: true })
      .click();
  expect(await page.evaluate(() => (window as any).__webglContexts)).toBe(
    contexts,
  );
  await expect(page.locator("#tracking-label")).toHaveText("TARGET READY");
});
test("a stopped camera-frame stream produces a visible failure notification", async ({
  page,
}) => {
  await launchMockAR(page);
  await expect(page.locator("#tracking-label")).toHaveText("TARGET READY");
  await page
    .getByRole("button", { name: "Scene actions and settings" })
    .click();
  await page.evaluate(() => {
    (window as any).__pauseTracking = true;
  });
  await expect(page.getByRole("alertdialog")).toContainText(
    "Camera tracking stopped sending frames",
    { timeout: 12000 },
  );
  await expect(page.locator("#exit-btn")).toBeHidden();
});
