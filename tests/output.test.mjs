import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("production output includes all four routes and their own entry assets", () => {
  for (const route of ["", "experience/", "technology/", "ar/"]) {
    const html = fs.readFileSync(`dist/${route}index.html`, "utf8");
    assert.match(html, /<title>Envision/);
    const scripts = [...html.matchAll(/<script[^>]*src=["']?([^"' >]+\.js)/g)];
    assert.ok(scripts.length);
    for (const [, src] of scripts)
      assert.ok(fs.existsSync(`dist${src}`), `Missing ${src}`);
  }
});
test("AR manifest and service worker are scoped without marketing interference", () => {
  const manifest = JSON.parse(fs.readFileSync("dist/ar/manifest.webmanifest"));
  assert.equal(manifest.scope, "/ar/");
  assert.equal(manifest.start_url, "/ar/");
  for (const icon of manifest.icons)
    assert.ok(fs.existsSync(`dist${icon.src}`));
  const sw = fs.readFileSync("src/pwa/sw.js", "utf8");
  assert.match(sw, /!url\.pathname\.startsWith\(["']\/ar\/["']\)/);
  assert.ok(!sw.includes("cache.match('/')"));
});
test("Netlify config has explicit route handling and secure capabilities", () => {
  const config = fs.readFileSync("netlify.toml", "utf8");
  assert.match(config, /publish = "dist"/);
  for (const path of ["/experience", "/technology", "/ar"])
    assert.ok(config.includes(`from = "${path}"`));
  assert.ok(config.includes("camera=(self)"));
});

test("production SEO uses a configurable origin consistently for each route", async () => {
  const os = await import("node:os");
  const path = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "envision-seo-"));
  try {
    fs.mkdirSync(path.join(directory, "dist"));
    fs.copyFileSync("dist/index.html", path.join(directory, "dist/index.html"));
    execFileSync(
      process.execPath,
      [path.resolve("scripts/finalize-build.mjs")],
      {
        cwd: directory,
        env: { ...process.env, SITE_URL: "https://envision.example.test" },
      },
    );
    for (const route of ["", "experience", "technology"]) {
      const html = fs.readFileSync(
        path.join(directory, "dist", route, "index.html"),
        "utf8",
      );
      assert.ok(
        html.includes(
          `rel="canonical" href="https://envision.example.test/${route}"`,
        ),
      );
      assert.ok(
        html.includes(
          'content="https://envision.example.test/brand/social.png"',
        ),
      );
    }
    const sitemap = fs.readFileSync(
      path.join(directory, "dist/sitemap.xml"),
      "utf8",
    );
    assert.equal((sitemap.match(/<loc>/g) || []).length, 4);
    assert.ok(
      fs
        .readFileSync(path.join(directory, "dist/robots.txt"), "utf8")
        .includes("Sitemap: https://envision.example.test/sitemap.xml"),
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test("every AR form thumbnail is included as a same-origin PNG in the production build", async () => {
  const { OBJECT_LIBRARY } = await import("../shared/commands.js");
  for (const type of Object.keys(OBJECT_LIBRARY)) {
    const data = fs.readFileSync(`dist/models/thumbnails/${type}.png`);
    assert.equal(data.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(data.readUInt32BE(16), 160);
    assert.equal(data.readUInt32BE(20), 130);
  }
});
