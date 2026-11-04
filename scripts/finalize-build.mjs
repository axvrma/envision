import fs from "node:fs/promises";
const rawUrl = process.env.SITE_URL || process.env.URL;
let siteUrl = "";
if (rawUrl) {
  const parsed = new URL(rawUrl);
  if (!["https:", "http:"].includes(parsed.protocol))
    throw new Error("SITE_URL must be an HTTP(S) origin");
  siteUrl = parsed.origin;
}
const html = await fs.readFile("dist/index.html", "utf8");
const pages = [
  [
    "",
    "Envision — AR Playground",
    "Envision is an AR playground. Choose, place, customize and save 3D objects in your world. Voice is optional.",
  ],
  [
    "experience",
    "Envision — 3D Playground",
    "Create, color, and explore ten predefined 3D objects in your browser. No camera required.",
  ],
  [
    "technology",
    "Envision — Technology",
    "Explore the open web technologies behind Envision: Three.js, WebXR, 8th Wall, Web Speech, and PWA.",
  ],
];
for (const [route, title, description] of pages) {
  let output = html
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${description}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${title}`)
    .replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${title}`)
    .replace(
      /(<meta property="og:description" content=")[^"]*/,
      `$1${description}`,
    )
    .replace(
      /(<meta name="twitter:description" content=")[^"]*/,
      `$1${description}`,
    );
  if (siteUrl)
    output = output
      .replace(
        "</head>",
        `<link rel="canonical" href="${siteUrl}/${route}"/><meta property="og:url" content="${siteUrl}/${route}"/></head>`,
      )
      .replaceAll(
        'content="/brand/social.png"',
        `content="${siteUrl}/brand/social.png"`,
      );
  const directory = route ? `dist/${route}` : "dist";
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(`${directory}/index.html`, output);
}
await fs.writeFile(
  "dist/404.html",
  html.replace(
    /<title>.*?<\/title>/,
    "<title>Envision — Page not found</title>",
  ),
);
await fs.writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ""}`,
);
await fs.writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${siteUrl ? ["", "experience", "technology", "ar/"].map((route) => `<url><loc>${siteUrl}/${route}</loc></url>`).join("") : ""}</urlset>`,
);
console.log(
  `Static routes ready: /, /experience, /technology, /ar/. ${siteUrl ? "SEO origin: " + siteUrl : "Set SITE_URL for production canonicals and sitemap URLs."}`,
);

// Retire the legacy root-scoped VoxAR worker on upgrades. The new worker is /ar/sw.js.
await fs.writeFile(
  "dist/sw.js",
  `self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(caches.delete('voxr-studio-v1').then(()=>self.registration.unregister())));`,
);
