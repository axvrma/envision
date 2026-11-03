import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const directory = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: path.resolve(directory),
  plugins: [
    react(),
    {
      name: "ar-development-route",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const pathname = new URL(request.url || "/", "http://localhost")
            .pathname;
          if (pathname === "/ar") {
            response.writeHead(302, { Location: "/ar/" });
            response.end();
            return;
          }
          if (!pathname.startsWith("/ar/")) {
            next();
            return;
          }
          const file = path.resolve(
            directory,
            "../dist",
            `.${pathname.endsWith("/") ? pathname + "index.html" : pathname}`,
          );
          const arRoot = path.resolve(directory, "../dist/ar") + path.sep;
          if (!file.startsWith(arRoot) || !fs.existsSync(file)) {
            response.statusCode = 404;
            response.end("AR asset not found. Run npm run build:ar.");
            return;
          }
          const types: Record<string, string> = {
            ".html": "text/html",
            ".js": "application/javascript",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".webmanifest": "application/manifest+json",
          };
          response.setHeader(
            "Content-Type",
            types[path.extname(file)] || "application/octet-stream",
          );
          fs.createReadStream(file).pipe(response);
        });
      },
    },
  ],
  resolve: { dedupe: ["three", "react", "react-dom"] },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          motion: ["motion/react"],
          three: ["three", "@react-three/fiber"],
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    fs: { allow: [path.resolve(directory, "..")] },
  },
});
