import { defineConfig } from "vite";

// Base path matches the GitHub Pages project-site URL:
// https://<user>.github.io/<repo>/  ->  base: "/<repo>/"
// If you rename the repo or move to a custom domain / user-root Pages site,
// update this to match (root site: base: "/").
export default defineConfig({
  base: "/Clearance-Warehouse/",
});
