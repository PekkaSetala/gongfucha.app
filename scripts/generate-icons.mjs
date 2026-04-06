/**
 * Generate PWA icon PNGs from icon.svg using sharp.
 * Run once: node scripts/generate-icons.mjs
 * Delete this script after use.
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svgPath = resolve(root, "public/icon.svg");
const svg = readFileSync(svgPath);

const sizes = [
  { name: "icon-192.png", w: 192, h: 192 },
  { name: "icon-512.png", w: 512, h: 512 },
  { name: "apple-touch-icon.png", w: 180, h: 180 },
];

// OG image: 1200x630, bg #F4EFE6 with icon centered
async function generateOG() {
  const iconSize = 320;
  const icon = await sharp(svg).resize(iconSize, iconSize).png().toBuffer();
  const bg = sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 244, g: 239, b: 230, alpha: 1 },
    },
  }).png();

  await bg
    .composite([
      {
        input: icon,
        left: Math.round((1200 - iconSize) / 2),
        top: Math.round((630 - iconSize) / 2),
      },
    ])
    .toFile(resolve(root, "public/og-image.png"));

  console.log("  og-image.png (1200x630)");
}

async function main() {
  console.log("Generating icons...");
  for (const { name, w, h } of sizes) {
    await sharp(svg).resize(w, h).png().toFile(resolve(root, "public", name));
    console.log(`  ${name} (${w}x${h})`);
  }
  await generateOG();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
