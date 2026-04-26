import { resolve } from "node:path";
import { defineConfig, type PluginOption } from "vite";
import vue from "@vitejs/plugin-vue";
import { visualizer } from "rollup-plugin-visualizer";

const root = resolve(__dirname);
const plugins: PluginOption[] = [vue()];

if (process.env["ANALYZE_BUNDLE"] === "true") {
  plugins.push(
    visualizer({
      filename: resolve(root, "dist", "bundle-stats.html"),
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
    }) as PluginOption,
  );
}

export default defineConfig({
  root,
  base: "./",
  plugins,
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
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: (chunkInfo) =>
          chunkInfo.name === "_plugin-vue_export-helper"
            ? "assets/sharedUtils-[hash].js"
            : "assets/[name]-[hash].js",
        assetFileNames: (assetInfo) =>
          assetInfo.name === "_plugin-vue_export-helper.css"
            ? "assets/sharedUtils-[hash][extname]"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
