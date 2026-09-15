const sharp = require("sharp");
const path = require("path");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="42%" cy="32%" r="78%">
      <stop offset="0%" stop-color="#FFF3A0"/>
      <stop offset="45%" stop-color="#FFD500"/>
      <stop offset="100%" stop-color="#F0B400"/>
    </radialGradient>
    <linearGradient id="studY" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFF8C0"/><stop offset="100%" stop-color="#FFD500"/>
    </linearGradient>
    <linearGradient id="studR" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF7A7A"/><stop offset="100%" stop-color="#E3000B"/>
    </linearGradient>
    <linearGradient id="studB" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6BB4FF"/><stop offset="100%" stop-color="#0055BF"/>
    </linearGradient>
    <linearGradient id="studG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6EE89A"/><stop offset="100%" stop-color="#00AF4D"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="10" flood-color="#000" flood-opacity="0.22"/>
    </filter>
  </defs>

  <rect width="1024" height="1024" rx="228" ry="228" fill="url(#bg)"/>
  <rect x="42" y="42" width="940" height="940" rx="196" ry="196" fill="none" stroke="#111" stroke-width="40"/>

  <g opacity="0.95">
    <circle cx="170" cy="170" r="28" fill="#E3000B" stroke="#111" stroke-width="10"/>
    <circle cx="854" cy="190" r="24" fill="#0055BF" stroke="#111" stroke-width="10"/>
    <circle cx="190" cy="860" r="22" fill="#00AF4D" stroke="#111" stroke-width="10"/>
    <circle cx="840" cy="840" r="26" fill="#FF6D00" stroke="#111" stroke-width="10"/>
  </g>

  <g transform="translate(512 400) rotate(-9)" filter="url(#soft)">
    <g transform="translate(-220 95)">
      <rect x="0" y="44" width="440" height="136" rx="30" fill="#0055BF" stroke="#111" stroke-width="24"/>
      <rect x="0" y="44" width="440" height="44" rx="22" fill="#2A86E8"/>
      <circle cx="95" cy="32" r="40" fill="url(#studB)" stroke="#111" stroke-width="18"/>
      <circle cx="220" cy="32" r="40" fill="url(#studB)" stroke="#111" stroke-width="18"/>
      <circle cx="345" cy="32" r="40" fill="url(#studB)" stroke="#111" stroke-width="18"/>
      <circle cx="82" cy="16" r="13" fill="#fff" opacity="0.55"/>
      <circle cx="207" cy="16" r="13" fill="#fff" opacity="0.55"/>
      <circle cx="332" cy="16" r="13" fill="#fff" opacity="0.55"/>
    </g>
    <g transform="translate(-165 -5)">
      <rect x="0" y="42" width="330" height="124" rx="28" fill="#FFD500" stroke="#111" stroke-width="24"/>
      <rect x="0" y="42" width="330" height="40" rx="20" fill="#FFE566"/>
      <circle cx="95" cy="28" r="38" fill="url(#studY)" stroke="#111" stroke-width="18"/>
      <circle cx="235" cy="28" r="38" fill="url(#studY)" stroke="#111" stroke-width="18"/>
      <circle cx="82" cy="13" r="12" fill="#fff" opacity="0.7"/>
      <circle cx="222" cy="13" r="12" fill="#fff" opacity="0.7"/>
    </g>
    <g transform="translate(-75 -125) rotate(14)">
      <rect x="0" y="38" width="230" height="108" rx="26" fill="#E3000B" stroke="#111" stroke-width="22"/>
      <rect x="0" y="38" width="230" height="36" rx="18" fill="#FF4040"/>
      <circle cx="68" cy="26" r="36" fill="url(#studR)" stroke="#111" stroke-width="16"/>
      <circle cx="162" cy="26" r="36" fill="url(#studR)" stroke="#111" stroke-width="16"/>
      <circle cx="56" cy="13" r="11" fill="#fff" opacity="0.55"/>
      <circle cx="150" cy="13" r="11" fill="#fff" opacity="0.55"/>
    </g>
    <g transform="translate(155 -55) rotate(20)">
      <rect x="0" y="30" width="138" height="82" rx="20" fill="#00AF4D" stroke="#111" stroke-width="16"/>
      <rect x="0" y="30" width="138" height="26" rx="14" fill="#2FD06A"/>
      <circle cx="69" cy="22" r="30" fill="url(#studG)" stroke="#111" stroke-width="14"/>
      <circle cx="58" cy="11" r="9" fill="#fff" opacity="0.55"/>
    </g>
  </g>

  <g transform="translate(512 795) rotate(-3)">
    <rect x="-360" y="-86" width="720" height="172" rx="48" fill="#111"/>
    <rect x="-346" y="-72" width="692" height="144" rx="40" fill="#FFFDF5"/>
    <text x="0" y="-2" text-anchor="middle"
      font-family="Arial Black, Helvetica Black, Impact, sans-serif"
      font-size="70" font-weight="900" letter-spacing="6"
      fill="#111">LEGO</text>
    <text x="0" y="-6" text-anchor="middle"
      font-family="Arial Black, Helvetica Black, Impact, sans-serif"
      font-size="70" font-weight="900" letter-spacing="6"
      fill="#E3000B">LEGO</text>
    <text x="0" y="62" text-anchor="middle"
      font-family="Arial Black, Helvetica Black, Impact, sans-serif"
      font-size="70" font-weight="900" letter-spacing="3"
      fill="#111">TRACK</text>
    <text x="0" y="58" text-anchor="middle"
      font-family="Arial Black, Helvetica Black, Impact, sans-serif"
      font-size="70" font-weight="900" letter-spacing="3"
      fill="#0055BF">TRACK</text>
  </g>
</svg>`;

async function main() {
  const outDir = path.join(process.cwd(), "public/icons");
  const master = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp(master).resize(1024, 1024).png().toFile(path.join(outDir, "icon-source-v4.png"));

  const sizes = [
    ["icon-512.png", 512],
    ["icon-192.png", 192],
    ["apple-touch-icon-v4.png", 180],
    ["apple-touch-icon.png", 180],
    ["favicon-32.png", 32],
    ["favicon-16.png", 16],
  ];
  for (const [name, size] of sizes) {
    await sharp(master).resize(size, size).png().toFile(path.join(outDir, name));
  }
  await sharp(master).resize(180, 180).png().toFile(path.join(process.cwd(), "src/app/icon.png"));
  console.log("Generated playful icons v4");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
