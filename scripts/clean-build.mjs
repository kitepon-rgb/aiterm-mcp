import { existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");

if (existsSync(distDir)) {
  for (const name of readdirSync(distDir, { encoding: "utf8" })) {
    if (name.endsWith(".js")) {
      rmSync(join(distDir, name));
    }
  }
}
