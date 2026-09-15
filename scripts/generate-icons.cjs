const sharp = require("sharp");
const path = require("path");

// Minimal touch icon: flat yellow tile + flat red 2×2 brick
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="228" ry="228" fill="#FFD500"/>

  <g transform="translate(512 512)">
    <rect x="-270" y="-270" width="540" height="540" rx="64" fill="#E3000B"/>

    <circle cx="-118" cy="-118" r="86" fill="#FFD500"/>
    <circle cx="118" cy="-118" r="86" fill="#FFD500"/>
    <circle cx="-118" cy="118" r="86" fill="#FFD500"/>
    <circle cx="118" cy="118" r="86" fill="#FFD500"/>
  </g>
</svg>`;

async function main() {
  const outDir = path.join(process.cwd(), "public/icons");
  const master = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp(master).resize(1024, 1024).png().toFile(path.join(outDir, "icon-source-v5.png"));

  const sizes = [
    ["icon-512.png", 512],
    ["icon-192.png", 192],
    ["apple-touch-icon-v5.png", 180],
    ["apple-touch-icon.png", 180],
    ["favicon-32.png", 32],
    ["favicon-16.png", 16],
  ];
  for (const [name, size] of sizes) {
    await sharp(master).resize(size, size).png().toFile(path.join(outDir, name));
  }
  await sharp(master).resize(180, 180).png().toFile(path.join(process.cwd(), "src/app/icon.png"));
  console.log("Generated flat minimal icons v5");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
