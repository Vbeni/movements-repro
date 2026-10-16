import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

// GitHub Pages serves project sites from /<repo>/; set BASE_PATH there, "/" everywhere else.
const base = process.env.BASE_PATH ?? "/";

// Interviews open as an overlay on top of the home page, so /interviews/* serves the same document
// and the client opens the overlay from the URL.
const interviewRoutes = (): Plugin => {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    if (req.url?.startsWith(`${base}interviews/`)) req.url = `${base}index.html`;
    next();
  };
  return {
    name: "interview-routes",
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
    // Static hosts without rewrites (GitHub Pages) serve 404.html for unknown paths: make it the app.
    closeBundle() {
      copyFileSync(resolve(__dirname, "dist/index.html"), resolve(__dirname, "dist/404.html"));
    },
  };
};

export default defineConfig({
  base,
  plugins: [interviewRoutes()],
});
