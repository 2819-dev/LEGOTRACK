import sharp from "sharp";

export type PieceCategory = "helmet" | "hair" | "head" | "shirt" | "pants";

export type DetectedPiece = {
  category: PieceCategory;
  label: string;
  colorKey: string;
  imageDataUrl: string;
  /** Soft “other side” preview (horizontal flip) until a second photo is added */
  imageBackDataUrl: string;
  quantity: number;
};

type Rgba = { data: Buffer; width: number; height: number };

function toDataUrl(buf: Buffer, mime = "image/png") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function idx(x: number, y: number, w: number) {
  return (y * w + x) * 4;
}

function isFloorish(
  r: number,
  g: number,
  b: number,
  floor: { r: number; g: number; b: number },
  tol = 42
) {
  const dr = Math.abs(r - floor.r);
  const dg = Math.abs(g - floor.g);
  const db = Math.abs(b - floor.b);
  const lum = (r + g + b) / 3;
  const floorLum = (floor.r + floor.g + floor.b) / 3;
  // Wood / carpet / concrete floors: close to sampled edge color, or very bright washed-out
  if (dr + dg + db < tol * 3) return true;
  if (Math.abs(lum - floorLum) < 18 && dr + dg + db < tol * 4.5) return true;
  return false;
}

function sampleFloorColor(img: Rgba) {
  const { data, width, height } = img;
  const points = [
    [4, 4],
    [width - 5, 4],
    [4, height - 5],
    [width - 5, height - 5],
    [width >> 1, 4],
    [width >> 1, height - 5],
    [4, height >> 1],
    [width - 5, height >> 1],
  ];
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (const [x, y] of points) {
    const i = idx(x, y, width);
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  return { r: r / n, g: g / n, b: b / n };
}

function buildObjectMask(img: Rgba) {
  const floor = sampleFloorColor(img);
  const { data, width, height } = img;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 12) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (r + g + b) / 3;
      // Keep saturated / dark plastic LEGO colors; drop floor
      const plastic = sat > 0.16 || lum < 95 || (sat > 0.08 && lum < 170);
      if (plastic && !isFloorish(r, g, b, floor)) {
        mask[y * width + x] = 1;
      }
    }
  }
  // Light dilate then erode to close studs/gaps
  return morphClose(mask, width, height, 1);
}

function morphClose(mask: Uint8Array, w: number, h: number, r: number) {
  const dil = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let dy = -r; dy <= r && !on; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (mask[yy * w + xx]) on = 1;
        }
      }
      dil[y * w + x] = on;
    }
  }
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = 1;
      for (let dy = -r; dy <= r && on; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) {
            on = 0;
            break;
          }
          if (!dil[yy * w + xx]) on = 0;
        }
      }
      out[y * w + x] = on;
    }
  }
  return out;
}

type Blob = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
  pixels: Array<[number, number]>;
};

function findBlobs(mask: Uint8Array, w: number, h: number): Blob[] {
  const seen = new Uint8Array(mask.length);
  const blobs: Blob[] = [];
  const minArea = Math.max(400, (w * h) / 180);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (!mask[start] || seen[start]) continue;
      const stack = [start];
      seen[start] = 1;
      let minX = x,
        maxX = x,
        minY = y,
        maxY = y,
        area = 0;
      const pixels: Array<[number, number]> = [];
      while (stack.length) {
        const p = stack.pop()!;
        const px = p % w;
        const py = (p / w) | 0;
        area++;
        pixels.push([px, py]);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!mask[ni] || seen[ni]) continue;
          seen[ni] = 1;
          stack.push(ni);
        }
      }
      if (area >= minArea) {
        blobs.push({ minX, minY, maxX, maxY, area, pixels });
      }
    }
  }
  return blobs.sort((a, b) => b.area - a.area);
}

async function cutoutBlob(img: Rgba, blob: Blob, mask: Uint8Array) {
  const pad = 8;
  const left = Math.max(0, blob.minX - pad);
  const top = Math.max(0, blob.minY - pad);
  const width = Math.min(img.width - left, blob.maxX - blob.minX + 1 + pad * 2);
  const height = Math.min(img.height - top, blob.maxY - blob.minY + 1 + pad * 2);
  const out = Buffer.alloc(width * height * 4, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = left + x;
      const sy = top + y;
      const mi = sy * img.width + sx;
      const oi = (y * width + x) * 4;
      if (!mask[mi]) continue;
      const si = idx(sx, sy, img.width);
      out[oi] = img.data[si];
      out[oi + 1] = img.data[si + 1];
      out[oi + 2] = img.data[si + 2];
      out[oi + 3] = 255;
    }
  }

  // Feather edges slightly for cleaner studs
  const png = await sharp(out, { raw: { width, height, channels: 4 } })
    .resize({
      width: Math.min(420, Math.max(120, width)),
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const back = await sharp(png).flop().png().toBuffer();
  return { front: png, back, width, height };
}

function dominantColorKey(img: Rgba, blob: Blob, mask: Uint8Array) {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (const [x, y] of blob.pixels) {
    if (!mask[y * img.width + x]) continue;
    const i = idx(x, y, img.width);
    r += img.data[i];
    g += img.data[i + 1];
    b += img.data[i + 2];
    n++;
  }
  if (!n) return "unknown";
  r = Math.round(r / n / 24) * 24;
  g = Math.round(g / n / 24) * 24;
  b = Math.round(b / n / 24) * 24;
  return `${r},${g},${b}`;
}

function colorName(key: string) {
  const [rs, gs, bs] = key.split(",").map(Number);
  if ([rs, gs, bs].some((v) => Number.isNaN(v))) return "Color";
  const max = Math.max(rs, gs, bs);
  const min = Math.min(rs, gs, bs);
  if (max < 55) return "Black";
  if (min > 210) return "White";
  if (rs > 180 && gs > 150 && bs < 90) return "Yellow";
  if (rs > 170 && gs < 90 && bs < 90) return "Red";
  if (rs < 90 && gs < 120 && bs > 150) return "Blue";
  if (rs < 100 && gs > 140 && bs < 110) return "Green";
  if (rs > 190 && gs > 100 && bs < 80) return "Orange";
  if (rs > 140 && gs < 100 && bs > 140) return "Purple";
  if (rs > 150 && gs > 100 && bs > 70 && rs - bs > 40) return "Brown";
  return "Brick";
}

function classifyBlob(blob: Blob): "full" | PieceCategory {
  const w = blob.maxX - blob.minX + 1;
  const h = blob.maxY - blob.minY + 1;
  const aspect = h / Math.max(1, w);
  const fill = blob.area / Math.max(1, w * h);

  // Tall figure → full minifig
  if (aspect > 1.55 && fill > 0.22) return "full";
  // Short wide → shirt / torso plate-ish
  if (aspect < 0.85) return "shirt";
  // Medium tall thin → pants / legs
  if (aspect > 1.15 && aspect <= 1.55) return "pants";
  // Small-ish square → head / helmet / hair
  if (aspect >= 0.85 && aspect <= 1.25) {
    // Darker/small top pieces often hair/helmet; default head for roundish
    if (blob.area < 3500) return "helmet";
    return "head";
  }
  if (aspect > 1.25) return "pants";
  return "shirt";
}

const FULL_BANDS: Record<Exclude<PieceCategory, "helmet">, [number, number]> = {
  hair: [0, 0.15],
  head: [0.12, 0.34],
  shirt: [0.32, 0.64],
  pants: [0.62, 1],
};

async function splitFullMinifig(
  frontPng: Buffer,
  colorKey: string
): Promise<DetectedPiece[]> {
  const meta = await sharp(frontPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = meta.info;
  const out: DetectedPiece[] = [];
  const name = colorName(colorKey);

  for (const category of ["hair", "head", "shirt", "pants"] as const) {
    const [a, b] = FULL_BANDS[category];
    const top = Math.floor(height * a);
    const bot = Math.ceil(height * b);
    const pieceH = Math.max(8, bot - top);
    const slice = await sharp(frontPng)
      .extract({ left: 0, top, width, height: pieceH })
      .png()
      .toBuffer();
    // Drop nearly-empty slices (transparent)
    const stats = await sharp(slice).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let opaque = 0;
    for (let i = 3; i < stats.data.length; i += 4) {
      if (stats.data[i] > 20) opaque++;
    }
    if (opaque < 80) continue;
    const back = await sharp(slice).flop().png().toBuffer();
    out.push({
      category,
      label: `${name} ${category}`,
      colorKey,
      imageDataUrl: toDataUrl(slice),
      imageBackDataUrl: toDataUrl(back),
      quantity: 1,
    });
  }
  return out;
}

/**
 * Floor-photo vision: find every plastic blob, cut it to transparent PNG,
 * classify, split full minifigs, and merge duplicates into quantity.
 */
export async function detectPiecesFromFloorPhoto(input: Buffer): Promise<{
  previewDataUrl: string;
  pieces: DetectedPiece[];
  note: string;
}> {
  const normalized = await sharp(input)
    .rotate()
    .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const img: Rgba = {
    data: normalized.data,
    width: normalized.info.width,
    height: normalized.info.height,
  };

  const mask = buildObjectMask(img);
  const blobs = findBlobs(mask, img.width, img.height).slice(0, 24);

  const detected: DetectedPiece[] = [];

  for (const blob of blobs) {
    const cut = await cutoutBlob(img, blob, mask);
    const colorKey = dominantColorKey(img, blob, mask);
    const kind = classifyBlob(blob);
    if (kind === "full") {
      const parts = await splitFullMinifig(cut.front, colorKey);
      detected.push(...parts);
    } else {
      const name = colorName(colorKey);
      detected.push({
        category: kind,
        label: `${name} ${kind}`,
        colorKey,
        imageDataUrl: toDataUrl(cut.front),
        imageBackDataUrl: toDataUrl(cut.back),
        quantity: 1,
      });
    }
  }

  // Merge same category + color into quantity
  const merged = new Map<string, DetectedPiece>();
  for (const p of detected) {
    const key = `${p.category}|${p.colorKey}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      merged.set(key, { ...p });
    }
  }

  const pieces = [...merged.values()];
  const preview = await sharp(input)
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .png()
    .toBuffer();

  const note =
    pieces.length === 0
      ? "Couldn't find clear pieces — use brighter light, plain floor, and space them apart."
      : `Found ${pieces.length} unique piece type${pieces.length === 1 ? "" : "s"} (quantities counted). Cut out on transparent backgrounds.`;

  return {
    previewDataUrl: toDataUrl(preview),
    pieces,
    note,
  };
}

export function parseDataUrl(dataUrl: string): Buffer {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return Buffer.from(dataUrl, "base64");
  return Buffer.from(match[2], "base64");
}
