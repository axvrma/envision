import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("hero renders a real WebGL scene, supports suggestions, invalid commands and clear", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your world.Reimagined.",
  );
  await expect(page.getByTestId("scene").first()).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.locator(".hero-command > summary").click();
  await page.getByRole("button", { name: "blue bird", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Created blue bird");
  await expect(page.locator(".object-tag")).toContainText("blue bird");
  await page.getByLabel("Object command").fill("pink unicorn");
  await page
    .getByRole("button", { name: "Create object", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Try a color and an object",
  );
  await page.getByRole("button", { name: "gold rocket", exact: true }).click();
  await expect(page.locator(".object-tag")).toContainText("gold rocket");
  await page.getByRole("button", { name: "Reset hero camera" }).click();
  await expect(page.getByRole("status")).toContainText("Camera reset");
  await page.getByRole("button", { name: "Clear hero scene" }).click();
  await expect(page.getByRole("status")).toContainText("Scene cleared");
  expect(errors).toEqual([]);
});
test("navigation, technology and accurate GitHub links", async ({ page }) => {
  await page.goto("/");
  for (const link of await page
    .locator('a[href*="github.com/axvrma/"]')
    .all()) {
    const href = await link.getAttribute("href");
    expect(href).toMatch(
      /^https:\/\/github.com\/axvrma\/envision(?:\/issues)?$/,
    );
  }
  await page
    .getByRole("link", { name: "Technology", exact: true })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Built for the next",
  );
  await expect(
    page.getByRole("heading", { name: "8th Wall", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Browser Studio", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/experience/);
});
test("studio inserts, selects, transforms, colors, removes, replaces and clears", async ({
  page,
}) => {
  await page.goto("/experience");
  await page.getByRole("button", { name: "Add elephant", exact: true }).click();
  await expect(page.locator(".viewport-meta")).toContainText("2 / 12 OBJECTS");
  await expect(page.locator(".selected-object h2")).toHaveText("Elephant");
  await page.getByLabel("Position X", { exact: true }).fill("2.5");
  await expect(page.getByLabel("Position X", { exact: true })).toHaveValue(
    "2.5",
  );
  await page.getByLabel("Object scale", { exact: true }).fill("1.5");
  await page
    .getByLabel("Selected object color", { exact: true })
    .selectOption("blue");
  await expect(
    page.getByLabel("Selected object color", { exact: true }),
  ).toHaveValue("blue");
  await page
    .locator(".scene-object-list")
    .getByRole("button", { name: "Rocket" })
    .click();
  await expect(page.locator(".selected-object h2")).toHaveText("Rocket");
  await page
    .getByRole("button", { name: "Remove object", exact: true })
    .click();
  await expect(page.locator(".viewport-meta")).toContainText("1 / 12 OBJECTS");
  await page.getByLabel("Scene mode").selectOption("replace");
  await page.getByRole("button", { name: "Add crystal", exact: true }).click();
  await expect(page.locator(".viewport-meta")).toContainText("1 / 12 OBJECTS");
  await expect(page.locator(".selected-object h2")).toHaveText("Crystal");
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Camera reset");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear scene", exact: true }).click();
  await expect(page.locator(".viewport-meta")).toContainText("0 / 12 OBJECTS");
});
test("microphone unsupported and denied states keep text functional", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/");
  await page.locator(".hero-command > summary").click();
  await page
    .getByRole("button", { name: "Speak a command", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Type a command");
  await page.getByRole("button", { name: "gold rocket", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Created gold rocket");
});
test("mock speech handles denied, successful and silent recognition", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let count = 0;
    (window as any).SpeechRecognition = class {
      onerror: any;
      onresult: any;
      onend: any;
      start() {
        count++;
        setTimeout(() => {
          if (count === 1) this.onerror?.({ error: "not-allowed" });
          else if (count === 2)
            this.onresult?.({
              resultIndex: 0,
              results: [
                Object.assign([{ transcript: "teal crystal" }], {
                  isFinal: true,
                }),
              ],
            });
          else this.onerror?.({ error: "no-speech" });
          this.onend?.();
        }, 20);
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    };
  });
  await page.goto("/");
  await page.locator(".hero-command > summary").click();
  await page
    .getByRole("button", { name: "Speak a command", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("permission denied");
  await page
    .getByRole("button", { name: "Speak a command", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Created teal crystal");
  await page
    .getByRole("button", { name: "Speak a command", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("No speech detected");
});
test("WebGL unavailable leaves useful feedback and working commands", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: any,
      ...args: any[]
    ) {
      if (String(type).startsWith("webgl") || type === "experimental-webgl")
        return null;
      return original.call(this, type, ...(args as []));
    } as any;
  });
  await page.goto("/");
  await expect(
    page.getByText("3D rendering is unavailable in this browser.").first(),
  ).toBeVisible();
  await page.locator(".hero-command > summary").click();
  await page.getByRole("button", { name: "red cube", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Created red cube");
});
test("AR preflight never starts camera or microphone on load and handles denied WebXR", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__xrRequested = 0;
    (window as any).__cameraRequested = 0;
    Object.defineProperty(navigator, "xr", {
      value: {
        isSessionSupported: async () => true,
        requestSession: async () => {
          (window as any).__xrRequested++;
          throw new DOMException("Camera permission denied", "NotAllowedError");
        },
      },
    });
    navigator.mediaDevices.getUserMedia = async () => {
      (window as any).__cameraRequested++;
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.goto("/ar/");
  await expect(
    page.getByRole("heading", {
      name: "Your world. A little more extraordinary.",
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__xrRequested)).toBe(0);
  expect(await page.evaluate(() => (window as any).__cameraRequested)).toBe(0);
  await page.getByRole("button", { name: "Start AR Experience" }).click();
  await expect(page.locator("#status")).toContainText(
    "Camera permission denied",
  );
  expect(await page.evaluate(() => (window as any).__xrRequested)).toBe(1);
  await expect(
    page
      .getByRole("alertdialog")
      .getByRole("link", { name: "Open browser Studio" }),
  ).toBeVisible();
});
test("AR engine load failure is actionable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "xr", { value: undefined });
  });
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await page.goto("/ar/");
  await page.getByRole("button", { name: "Start AR Experience" }).click();
  await expect(page.locator("#status")).toContainText("Could not load");
  await expect(
    page.getByRole("button", { name: "Retry AR", exact: true }),
  ).toBeEnabled();
  await expect(
    page
      .getByRole("alertdialog")
      .getByRole("link", { name: "Open browser Studio" }),
  ).toBeVisible();
});
test("mobile navigation, studio controls and pages fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/experience", "/technology", "/ar/"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("link", { name: "Browser Studio", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "OBJECT LIBRARY" }).click();
  await page.getByRole("button", { name: "Add crystal", exact: true }).click();
  await page.getByRole("button", { name: "OBJECT LIBRARY" }).click();
  await page.getByRole("button", { name: "Show inspector" }).click();
  await expect(page.locator(".selected-object h2")).toHaveText("Crystal");
  await page.getByRole("button", { name: "Hide inspector" }).click();
  await expect(page.locator(".inspector")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add crystal", exact: true }),
  ).toBeHidden();
});
test("keyboard entry and reduced-motion rendering work", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.locator(".hero-command > summary").click();
  await page.getByLabel("Object command").focus();
  await page.keyboard.type("purple sphere");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Created purple sphere");
  await expect(page.getByTestId("scene").first()).toHaveAttribute(
    "data-ready",
    "true",
  );
});
test("accessibility audit for marketing, studio, technology and AR preflight", async ({
  page,
}) => {
  for (const route of ["/", "/experience", "/technology", "/ar/"]) {
    await page.goto(route);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations,
      `${route}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
});

test("camera orbit, zoom and reset change the rendered view with keyboard controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/experience");
  await expect(page.getByTestId("scene")).toHaveAttribute("data-ready", "true");
  const viewport = page.getByTestId("scene");
  await page.waitForTimeout(250);
  const original = await viewport.screenshot();
  await page
    .getByRole("button", { name: "Rotate view right", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Camera rotated");
  const rotated = await viewport.screenshot();
  expect(rotated.equals(original)).toBe(false);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const zoomed = await viewport.screenshot();
  expect(zoomed.equals(rotated)).toBe(false);
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Camera reset");
  const reset = await viewport.screenshot();
  expect(reset.equals(original)).toBe(true);
});
test("context loss offers a fallback and can recreate the renderer", async ({
  page,
}) => {
  await page.goto("/experience");
  await expect(page.getByTestId("scene")).toHaveAttribute("data-ready", "true");
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(
    page.getByText("3D rendering is unavailable in this browser.").first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retry 3D", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("scene")).toHaveAttribute("data-ready", "true");
});
test("scene bounds produce feedback and keep all existing objects", async ({
  page,
}) => {
  await page.goto("/experience");
  for (let i = 0; i < 12; i++)
    await page.getByRole("button", { name: "Add cube", exact: true }).click();
  await expect(page.locator(".viewport-meta")).toContainText("12 / 12 OBJECTS");
  await expect(page.getByRole("status")).toContainText("12-object limit");
});

test("AR camera absence and insecure context show explicit device guidance", async ({
  browser,
}) => {
  for (const reason of ["camera", "https"]) {
    const context = await browser.newContext();
    await context.addInitScript((reason) => {
      if (reason === "https")
        Object.defineProperty(window, "isSecureContext", { value: false });
      else
        Object.defineProperty(navigator, "mediaDevices", { value: undefined });
    }, reason);
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/ar/");
    await expect(page.locator("#not-supported")).toBeVisible();
    await expect(page.locator("#not-supported-reason")).toContainText(
      reason === "https" ? "HTTPS" : "Camera access is unavailable",
    );
    await context.close();
  }
});
