import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockEightWall, launchMockAR } from "./support/ar-mock";
test("AR library is manual, searchable, keyboard dismissible and cannot place before tracking", async ({
  page,
}) => {
  await mockEightWall(page);
  let cameraRequests = 0;
  page.on("request", (r) => {
    if (r.url().includes("cdn.jsdelivr")) cameraRequests++;
  });
  await page.goto("/ar/");
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Make room for imagination." }),
  ).toBeVisible();
  await expect(page.locator("#object-grid button")).toHaveCount(10);
  await expect(page.locator("#object-grid img")).toHaveCount(10);
  expect(cameraRequests).toBe(0);
  await page.getByRole("button", { name: "Close object library" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page
      .locator("#library-colors")
      .getByRole("button", { name: "Use gray", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close object library" }),
  ).toBeFocused();
  await page.getByRole("searchbox", { name: "Find an object" }).fill("rocket");
  await expect(page.locator("#object-grid button")).toHaveCount(1);
  await page
    .locator("#library-colors")
    .getByRole("button", { name: "Use cyan", exact: true })
    .click();
  await page.getByRole("button", { name: "Add rocket", exact: true }).click();
  await expect(page.locator("#placement-name")).toHaveText("cyan Rocket");
  await expect(
    page.getByRole("button", { name: "Place object", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#placement-controls")).toBeHidden();
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#library-sheet")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add Object", exact: true }),
  ).toBeFocused();
});
test("mock tracking enables confirmation, inspector, bounded transforms, duplicate/delete and undo/redo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await launchMockAR(page);
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await page.getByRole("button", { name: "Add rocket", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Place object", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Place object", exact: true }).click();
  await expect(page.locator("#object-count")).toHaveText("1");
  await page.getByRole("button", { name: "Edit selected object" }).click();
  await page
    .locator("#inspector-colors")
    .getByRole("button", { name: "Use blue", exact: true })
    .click();
  await page.getByLabel("Object scale", { exact: true }).fill("1.5");
  await page.getByLabel("Object rotation", { exact: true }).fill("45");
  await page
    .getByRole("button", { name: "Duplicate object", exact: true })
    .click();
  await expect(page.locator("#object-count")).toHaveText("2");
  await page
    .getByRole("button", { name: "Remove object", exact: true })
    .click();
  await expect(page.locator("#object-count")).toHaveText("1");
  await page
    .getByRole("button", { name: "Scene actions and settings" })
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("#object-count")).toHaveText("2");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator("#object-count")).toHaveText("1");
  await page.getByRole("button", { name: "Close scene actions" }).click();
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await page.getByRole("button", { name: "Add tree", exact: true }).click();
  await page.evaluate(() => {
    (window as any).__tracking = "LIMITED";
  });
  await expect(page.locator("#tracking-label")).toHaveText("TRACKING LOST");
  await expect(
    page.getByRole("button", { name: "Place object", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => {
    (window as any).__tracking = "NORMAL";
  });
  await expect(
    page.getByRole("button", { name: "Place object", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#object-count")).toHaveText("1");
  await page.getByRole("button", { name: "End AR session" }).click();
  await expect(page.locator("#preflight")).toBeVisible();
  expect(await page.evaluate(() => (window as any).__stopped)).toBeGreaterThan(
    0,
  );
  expect(errors).toEqual([]);
});
test("AR text and speech-unavailable states preserve manual creation and destructive clear confirmation", async ({
  page,
}) => {
  await launchMockAR(page);
  await page.getByRole("button", { name: "Voice and text commands" }).click();
  await page
    .getByRole("button", { name: "Start listening", exact: true })
    .click();
  await expect(page.locator("#speech-feedback")).toContainText(
    "Speech is unavailable",
  );
  await page.getByLabel("A color and an object").fill("blue bird");
  await page.getByRole("button", { name: "Preview ↗" }).click();
  await expect(page.locator("#object-count")).toHaveText("0");
  await page.getByRole("button", { name: "Place object", exact: true }).click();
  await expect(page.locator("#object-count")).toHaveText("1");
  await page
    .getByRole("button", { name: "Scene actions and settings" })
    .click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Clear all objects", exact: true })
    .click();
  await expect(page.locator("#object-count")).toHaveText("1");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Clear all objects", exact: true })
    .click();
  await expect(page.locator("#object-count")).toHaveText("0");
});
test("persistent Studio compositions reopen in AR only after valid origin confirmation", async ({
  page,
}) => {
  await mockEightWall(page);
  await page.goto("/experience");
  await page.getByRole("button", { name: "Add tree", exact: true }).click();
  await page
    .getByRole("button", { name: "Save / open scenes", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Scene name", exact: true })
    .fill("Two worlds");
  await page.getByRole("button", { name: "Save scene", exact: true }).click();
  await expect(page.locator(".storage-feedback")).toContainText("saved");
  await page.reload();
  await page
    .getByRole("button", { name: "Save / open scenes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Two worlds", exact: true }),
  ).toBeVisible();
  await page.goto("/ar/");
  await page
    .getByRole("button", { name: "Scene actions and settings" })
    .click();
  await page
    .getByRole("button", { name: "Save / open scenes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Two worlds", exact: true })
    .click();
  await expect(page.locator("#object-count")).toHaveText("0");
  await expect(
    page.getByRole("button", { name: "Place composition", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Start AR Experience" }).click();
  await expect(
    page.getByRole("button", { name: "Place composition", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Place composition", exact: true })
    .click();
  await expect(page.locator("#object-count")).toHaveText("2");
});
test("saved scenes support validated import/export, rename, duplicate, delete and failed storage", async ({
  page,
}) => {
  await page.goto("/experience");
  await page
    .getByRole("button", { name: "Save / open scenes", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Scene name", exact: true })
    .fill("Original");
  await page.getByRole("button", { name: "Save scene", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Rename Original", exact: true })
    .fill("Renamed");
  await page
    .getByRole("button", { name: "Rename Original", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Renamed", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Duplicate Renamed", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Renamed (copy)", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export Renamed", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("envision-scene.json");
  await page.locator("[data-import]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.locator(".storage-feedback")).toContainText(
    "Unsupported scene version",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete Renamed (copy)", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Renamed (copy)", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close saved scenes" }).click();
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { value: undefined });
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Save / open scenes", exact: true })
    .click();
  await expect(page.locator(".storage-feedback")).toContainText("unavailable");
});
test("capture exports a labeled virtual-only image without controls or camera claims", async ({
  page,
}) => {
  await launchMockAR(page);
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await page.getByRole("button", { name: "Add crystal", exact: true }).click();
  await page.getByRole("button", { name: "Place object", exact: true }).click();
  await page.getByRole("button", { name: "Capture options" }).click();
  await expect(
    page.getByRole("dialog", { name: "Capture objects" }),
  ).toContainText("camera capture is unavailable");
  await page
    .getByRole("button", { name: "Render objects only", exact: true })
    .click();
  await expect(page.locator("#capture-preview")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  expect((await download).suggestedFilename()).toBe(
    "envision-objects-only.png",
  );
});
test("AR bottom sheets fit portrait and landscape and expose accessible controls", async ({
  page,
}) => {
  await mockEightWall(page);
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/ar/");
    await page.getByRole("button", { name: "Add Object", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bounds = await page.locator("#library-sheet").boundingBox();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.y || 0) + (bounds?.height || 0)).toBeLessThanOrEqual(
      viewport.height + 1,
    );
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");
  }
});
test("raycast selection, explicit tracked move, two-pointer gestures and session restart stay coherent", async ({
  page,
}) => {
  await launchMockAR(page);
  await page.getByRole("button", { name: "Add Object", exact: true }).click();
  await page.getByRole("button", { name: "Add cube", exact: true }).click();
  await page.getByRole("button", { name: "Place object", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset selection", exact: true })
    .click();
  const point = await page.evaluate(() => {
    const w = window as any;
    const root = w.__arScene.children[0];
    const model = root.children.find((child: any) => child.userData.model);
    const center = new w.THREE.Box3()
      .setFromObject(model)
      .getCenter(new w.THREE.Vector3())
      .project(w.__arCamera);
    return {
      x: ((center.x + 1) / 2) * innerWidth,
      y: ((1 - center.y) / 2) * innerHeight,
    };
  });
  await page.mouse.click(point.x, point.y);
  await expect(
    page.getByRole("button", { name: "Edit selected object" }),
  ).toBeVisible();
  await page.locator("#interaction-surface").evaluate((canvas) => {
    for (const [type, pointerId, x, y] of [
      ["pointerdown", 1, 500, 300],
      ["pointerdown", 2, 600, 300],
      ["pointermove", 2, 650, 330],
      ["pointerup", 2, 650, 330],
      ["pointerup", 1, 500, 300],
    ] as const)
      canvas.dispatchEvent(
        new PointerEvent(type, {
          pointerId,
          clientX: x,
          clientY: y,
          bubbles: true,
          pointerType: "touch",
          cancelable: true,
        }),
      );
  });
  await page.getByRole("button", { name: "Edit selected object" }).click();
  expect(
    Number(await page.getByLabel("Object scale", { exact: true }).inputValue()),
  ).toBeGreaterThan(1);
  expect(
    Number(
      await page.getByLabel("Object rotation", { exact: true }).inputValue(),
    ),
  ).not.toBe(0);
  await page
    .getByRole("button", { name: "Move to target", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirm move", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Confirm move", exact: true }).click();
  await expect(page.locator("#object-count")).toHaveText("1");
  await page.getByRole("button", { name: "End AR session" }).click();
  await page.getByRole("button", { name: "Start AR Experience" }).click();
  await expect(page.locator("#object-count")).toHaveText("0");
  await expect(
    page.getByRole("button", { name: "Place composition", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Place composition", exact: true })
    .click();
  await expect(page.locator("#object-count")).toHaveText("1");
});
test("AR context loss stops the session and provides a restart; browser backgrounding also tears down", async ({
  page,
}) => {
  await launchMockAR(page);
  await expect(page.locator("#tracking-label")).toHaveText("TARGET READY");
  await page
    .locator("#container canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.locator("#status")).toContainText("WebGL context lost");
  await expect(
    page.getByRole("button", { name: "Start AR Experience" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Start AR Experience" }).click();
  await expect(page.locator("#exit-btn")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#exit-btn")).toBeHidden();
  expect(await page.evaluate(() => (window as any).__stopped)).toBeGreaterThan(
    0,
  );
});
test("AR microphone denial keeps controls usable and a successful voice result opens confirmed placement", async ({
  page,
}) => {
  await launchMockAR(page);
  await page.evaluate(() => {
    let count = 0;
    (window as any).SpeechRecognition = class {
      onerror: any;
      onend: any;
      onresult: any;
      start() {
        count++;
        setTimeout(() => {
          if (count === 1) this.onerror?.({ error: "not-allowed" });
          else this.onresult?.({ results: [[{ transcript: "gold rocket" }]] });
          this.onend?.();
        }, 10);
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    };
  });
  await page.getByRole("button", { name: "Voice and text commands" }).click();
  await page
    .getByRole("button", { name: "Start listening", exact: true })
    .click();
  await expect(page.locator("#speech-feedback")).toContainText(
    "Microphone permission denied",
  );
  await page
    .getByRole("button", { name: "Start listening", exact: true })
    .click();
  await expect(page.locator("#placement-name")).toHaveText("gold Rocket");
  await expect(page.locator("#object-count")).toHaveText("0");
  await page.getByRole("button", { name: "Place object", exact: true }).click();
  await expect(page.locator("#object-count")).toHaveText("1");
});
