import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = await fs.readFile(path.join(root, "src/data/operators.ts"), "utf8");
const glyphBlock = source.match(/export const GLYPHS:[\s\S]*?= \{([\s\S]*?)\n\};/u)?.[1] ?? "";
const glyphs = Object.fromEntries([...glyphBlock.matchAll(/^\s+(\w+): '([^']+)'/gmu)].map((match) => [match[1], match[2]]));
const operators = [...source.matchAll(/name: "([^"]+)", tag: "[^"]+", color: "(#[A-Fa-f0-9]+)", glyph: "(\w+)"/gu)]
  .map((match) => ({ name: match[1], color: match[2], glyph: match[3] }));

const slug = (name) => name.toLowerCase().replace(/ operator$/u, "").replace(/\s*&\s*/gu, "-and-").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
const svgFor = ({ color, glyph }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" fill="none">
  <defs><linearGradient id="avatar" x1="160" y1="120" x2="850" y2="900" gradientUnits="userSpaceOnUse"><stop stop-color="${color}" stop-opacity=".24"/><stop offset="1" stop-color="${color}" stop-opacity=".04"/></linearGradient></defs>
  <circle cx="512" cy="512" r="430" fill="url(#avatar)" stroke="${color}" stroke-opacity=".38" stroke-width="4"/>
  <g transform="translate(378 378) scale(11.17)" fill="${color}"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5z"/></g>
  <circle cx="810" cy="810" r="112" fill="#0A0E12" stroke="#06070A" stroke-width="18"/>
  <g transform="translate(754 754) scale(4.67)" fill="none" stroke="${color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${glyphs[glyph]}</g>
</svg>`;

const outDir = path.join(root, "public/operators");
await fs.mkdir(outDir, { recursive: true });
for (const operator of operators) {
  const output = path.join(outDir, `${slug(operator.name)}-operator.png`);
  await sharp(Buffer.from(svgFor(operator))).png().toFile(output);
}
console.log(`Exported ${operators.length} canonical operator avatars to public/operators/`);
