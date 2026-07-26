import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const stageDir = join(distDir, "mcpb-stage");
const serverDir = join(stageDir, "server");
const serverDistDir = join(serverDir, "dist");
const manifest = JSON.parse(readFileSync(join(root, "mcpb", "manifest.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

if (manifest.version !== packageJson.version) {
  throw new Error(
    `MCPB manifest version ${manifest.version} does not match package version ${packageJson.version}`,
  );
}

rmSync(stageDir, { recursive: true, force: true });
rmSync(join(distDir, "aiterm-mcp.mcpb"), { force: true });
mkdirSync(serverDistDir, { recursive: true });

for (const name of readdirSync(distDir)) {
  if (!name.endsWith(".js")) continue;
  cpSync(join(distDir, name), join(serverDistDir, name));
}

for (const name of ["package.json", "package-lock.json"]) {
  cpSync(join(root, name), join(serverDir, name));
}

cpSync(join(root, "mcpb", "manifest.json"), join(stageDir, "manifest.json"));
cpSync(join(root, ".github", "avatar.png"), join(stageDir, "icon.png"));
cpSync(join(root, "LICENSE"), join(stageDir, "LICENSE"));
