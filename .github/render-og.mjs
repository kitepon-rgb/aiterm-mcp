import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const assetDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const config = JSON.parse(await readFile(join(assetDirectory, "og.config.json"), "utf8"));
const [base, logo] = await Promise.all([
  readFile(join(assetDirectory, config.base)),
  readFile(join(assetDirectory, config.logo)),
]);

const dataUrl = (type, contents) => `data:${type};base64,${contents.toString("base64")}`;
const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const { width, height } = config.canvas;
const { x, y, width: logoWidth, height: logoHeight } = config.endorsement;
const title = escapeXml(config.title);
const composedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="veil" x1="0" x2="1">
      <stop offset="0" stop-color="#071226" stop-opacity=".76"/>
      <stop offset=".42" stop-color="#071226" stop-opacity=".38"/>
      <stop offset=".68" stop-color="#071226" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <image href="${dataUrl("image/png", base)}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
  <rect width="${width}" height="${height}" fill="url(#veil)"/>
  <image href="${dataUrl("image/png", logo)}" x="${x}" y="${y}" width="${logoWidth}" height="${logoHeight}"/>
  <text x="75" y="402" fill="#020713" fill-opacity=".72" font-family="Avenir Next, sans-serif" font-size="88" font-weight="600" letter-spacing="-3">${title}</text>
  <text x="72" y="398" fill="#f7f8f5" font-family="Avenir Next, sans-serif" font-size="88" font-weight="600" letter-spacing="-3">${title}</text>
</svg>`;

const temporaryDirectory = await mkdtemp(join(tmpdir(), "kitepon-repo-og-"));
const temporarySvg = join(temporaryDirectory, "og.svg");
const outputPath = join(assetDirectory, config.output);
const socialPreviewPath = join(assetDirectory, config.social_preview.output);
try {
  await writeFile(temporarySvg, composedSvg);
  await execFileAsync("/usr/bin/sips", ["-s", "format", "png", temporarySvg, "--out", outputPath]);
  await execFileAsync("/usr/bin/sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(config.social_preview.quality), outputPath, "--out", socialPreviewPath]);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

process.stdout.write(`${outputPath}\n${socialPreviewPath}\n`);
