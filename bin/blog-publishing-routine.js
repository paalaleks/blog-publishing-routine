#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolRoot = resolve(__dirname, "..");
const tsxBin = resolve(toolRoot, "node_modules", ".bin", "tsx");
const script = resolve(toolRoot, "publish.ts");

const result = spawnSync(tsxBin, [script, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: true,
});

process.exit(result.status ?? 1);
