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
        main: resolve(root, "main.html"),
        dashboard: resolve(root, "dashboard.html"),
        policy: resolve(root, "policy.html"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: (chunkInfo) =>
          chunkInfo.name === "_plugin-vue_export-helper"
            ? "assets/sharedUtils.js"
            : "assets/[name].js",
        assetFileNames: (assetInfo) =>
          assetInfo.name === "_plugin-vue_export-helper.css"
            ? "assets/sharedUtils.css"
            : "assets/[name][extname]",
      },
    },
  },
});
