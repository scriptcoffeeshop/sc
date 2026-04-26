import { resolve } from "node:path";
import type { PreRenderedAsset, PreRenderedChunk } from "rollup";
import { defineConfig, type PluginOption } from "vite";
import vue from "@vitejs/plugin-vue";

const root = resolve(__dirname);

async function resolvePlugins(): Promise<PluginOption[]> {
  const plugins: PluginOption[] = [vue()];
  if (process.env["ANALYZE_BUNDLE"] !== "true") return plugins;

  const { visualizer } = await import("rollup-plugin-visualizer");
  plugins.push(
    visualizer({
      filename: resolve(root, "dist", "bundle-stats.html"),
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
    }) as PluginOption,
  );
  return plugins;
}

export default defineConfig(async () => ({
  root,
  base: "./",
  plugins: await resolvePlugins(),
  resolve: {
    alias: [{
      find: /^vue$/,
      replacement: resolve(
        root,
        "../node_modules/vue/dist/vue.runtime.esm-bundler.js",
      ),
    }],
    dedupe: ["vue"],
  },
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
        chunkFileNames: (chunkInfo: PreRenderedChunk) =>
          chunkInfo.name === "_plugin-vue_export-helper"
            ? "assets/sharedUtils-[hash].js"
            : "assets/[name]-[hash].js",
        assetFileNames: (assetInfo: PreRenderedAsset) =>
          assetInfo.name === "_plugin-vue_export-helper.css"
            ? "assets/sharedUtils-[hash][extname]"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
}));
