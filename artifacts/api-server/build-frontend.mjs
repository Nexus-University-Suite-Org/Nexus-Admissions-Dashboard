import { spawnSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(artifactDir, "../..");
const frontendDir = path.resolve(artifactDir, "../nexus-admissions");
const frontendDist = path.join(frontendDir, "dist/public");
const publicDir = path.join(artifactDir, "public");

const pnpmCommand = `${process.platform === "win32" ? "pnpm.cmd" : "pnpm"} --dir "${frontendDir}" run build`;

const res = spawnSync(pnpmCommand, {
  stdio: "inherit",
  cwd: repoRoot,
  shell: true,
});

if (res.status !== 0) {
  process.exit(res.status ?? 1);
}

rmSync(publicDir, { recursive: true, force: true });
cpSync(frontendDist, publicDir, { recursive: true, force: true });
console.log(`Frontend assets copied to ${publicDir}`);