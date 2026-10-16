import { defineConfig, type Plugin } from "vite";

// Interviews open as an overlay on top of the home page, so /interviews/* serves the same document
// and the client opens the overlay from the URL.
const interviewRoutes = (): Plugin => ({
  name: "interview-routes",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url?.startsWith("/interviews/")) req.url = "/index.html";
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url?.startsWith("/interviews/")) req.url = "/index.html";
      next();
    });
  },
});

export default defineConfig({
  plugins: [interviewRoutes()],
});
