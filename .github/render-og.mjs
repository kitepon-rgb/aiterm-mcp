import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const assetDirectory = resolve(scriptDirectory);
const config = JSON.parse(
  await readFile(join(assetDirectory, "og.config.json"), "utf8"),
);

const basePath = join(assetDirectory, config.base);
const logoPath = join(assetDirectory, config.logo);
const outputPath = join(assetDirectory, config.output);
const [base, logo] = await Promise.all([readFile(basePath), readFile(logoPath)]);
const logoData = `data:image/png;base64,${logo.toString("base64")}`;
const { x, y, width, height } = config.endorsement;
const endorsement = `<image href="${logoData}" x="${x}" y="${y}" width="${width}" height="${height}"/>`;

let composedSvg;
if (extname(basePath).toLowerCase() === ".svg") {
  const source = base.toString("utf8");
  if (!source.includes("</svg>")) {
    throw new Error(`${config.base} is missing a closing svg element`);
  }
  composedSvg = source.replace("</svg>", `  ${endorsement}\n</svg>`);
} else {
  const extension = extname(basePath).toLowerCase();
  const mediaType =
    extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
  const { width: canvasWidth, height: canvasHeight } = config.canvas;
  const baseData = `data:${mediaType};base64,${base.toString("base64")}`;
  composedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <image href="${baseData}" width="${canvasWidth}" height="${canvasHeight}"/>
  ${endorsement}
</svg>
`;
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), "kitepon-repo-og-"));
const temporarySvg = join(temporaryDirectory, "og.svg");
const temporaryPng = join(temporaryDirectory, "og.png");

try {
  await writeFile(temporarySvg, composedSvg);
  await execFileAsync("/usr/bin/sips", [
    "-s",
    "format",
    "png",
    temporarySvg,
    "--out",
    temporaryPng,
  ]);
  await execFileAsync("/usr/bin/sips", [
    "-z",
    String(config.output_size.height),
    String(config.output_size.width),
    temporaryPng,
    "--out",
    outputPath,
  ]);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

process.stdout.write(`${outputPath}\n`);
