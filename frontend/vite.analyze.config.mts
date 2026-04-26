import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mergeConfig, type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import baseConfig from "./vite.config.ts";

const root = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(baseConfig, {
  plugins: [
    visualizer({
      filename: resolve(root, "dist", "bundle-stats.html"),
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
    }) as PluginOption,
  ],
});
