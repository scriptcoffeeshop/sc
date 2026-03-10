#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const viteLegacyDir = path.join(projectRoot, "frontend", "public", "legacy");

const targets = [
  {
    from: path.join(projectRoot, "main.html"),
    to: path.join(viteLegacyDir, "main.html"),
  },
  {
    from: path.join(projectRoot, "dashboard.html"),
    to: path.join(viteLegacyDir, "dashboard.html"),
  },
  {
    from: path.join(projectRoot, "policy.html"),
    to: path.join(viteLegacyDir, "policy.html"),
  },
  {
    from: path.join(projectRoot, "js"),
    to: path.join(viteLegacyDir, "js"),
  },
  {
    from: path.join(projectRoot, "css"),
    to: path.join(viteLegacyDir, "css"),
  },
];

function ensureFrontendDir() {
  const frontendDir = path.join(projectRoot, "frontend");
  if (!fs.existsSync(frontendDir)) {
    throw new Error("找不到 frontend/ 目錄，請先建立 Vite 專案骨架。");
  }
}

function syncLegacy() {
  ensureFrontendDir();
  fs.rmSync(viteLegacyDir, { recursive: true, force: true });
  fs.mkdirSync(viteLegacyDir, { recursive: true });

  for (const item of targets) {
    fs.cpSync(item.from, item.to, { recursive: true });
  }

  console.log("[sync-legacy-to-vite] 已同步 legacy 檔案到 frontend/public/legacy");
}

syncLegacy();
