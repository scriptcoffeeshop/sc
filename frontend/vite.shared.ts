import { resolve } from "node:path";
import type { UserConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const root = resolve(__dirname);
type OutputNameInfo = { name?: string | undefined };

export const appViteConfig: UserConfig = {
  root,
  base: "./",
  plugins: [vue()],
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
        chunkFileNames: (chunkInfo: OutputNameInfo) =>
          chunkInfo.name === "_plugin-vue_export-helper"
            ? "assets/sharedUtils-[hash].js"
            : "assets/[name]-[hash].js",
        assetFileNames: (assetInfo: OutputNameInfo) =>
          assetInfo.name === "_plugin-vue_export-helper.css"
            ? "assets/sharedUtils-[hash][extname]"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
};
