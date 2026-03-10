import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const root = resolve(__dirname);

export default defineConfig({
  root,
  base: "./",
  plugins: [vue()],
  server: {
    fs: {
      allow: [resolve(root, "..")],
    },
  },
  build: {
    outDir: resolve(root, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),
        main: resolve(root, "main.html"),
        dashboard: resolve(root, "dashboard.html"),
        policy: resolve(root, "policy.html"),
      },
    },
  },
});
