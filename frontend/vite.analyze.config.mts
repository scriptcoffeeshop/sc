import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig, mergeConfig, type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import { appViteConfig } from "./vite.shared.ts";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig(mergeConfig(appViteConfig, {
  plugins: [
    visualizer({
      filename: resolve(root, "dist", "bundle-stats.html"),
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
    }) as PluginOption,
  ],
}));
