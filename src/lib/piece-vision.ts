import sharp from "sharp";
import {
  fetchCatalogPng,
  identifyLegoPart,
  mapBrickCategory,
} from "@/lib/brickognize";

export type PieceCategory = "helmet" | "hair" | "head" | "shirt" | "pants";

export type DetectedPiece = {
  category: PieceCategory;
  label: string;
  colorKey: string;
  partNum: string;
  catalogUrl: string;
  brickColor: string | null;
  /** Clean official catalog render — never the dirty floor photo */
  imageDataUrl: string;
  imageBackDataUrl: string;
  quantity: number;
  score: number;
};

type Rgba = { data: Buffer; width: number; height: number };

function toDataUrl(buf: Buffer, mime = "image/png") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function idx(x: number, y: number, w: number) {
  return (y * w + x) * 4;
}

function sampleFloor(img: Rgba) {
  const { data, width, height } = img;
  const pts = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
    [Math.floor(width * 0.25), 2],
    [Math.floor(width * 0.75), 2],
    [2, Math.floor(height * 0.5)],
    [width - 3, Math.floor(height * 0.5)],
  ];
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (const [x, y] of pts) {
    const i = idx(x, y, width);
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  return { r: r / n, g: g / n, b: b / n };
}

function buildMask(img: Rgba) {
  const floor = sampleFloor(img);
  const { data, width, height } = img;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 20) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (r + g + b) / 3;
      const dr = Math.abs(r - floor.r) + Math.abs(g - floor.g) + Math.abs(b - floor.b);
      const nearFloor = dr < 55;
      // Real plastic: saturated OR distinctly darker than floor, and not floor-colored
      const plastic = (sat > 0.22 || lum < floor.r * 0.55) && !nearFloor && sat > 0.08;
      if (plastic) mask[y * width + x] = 1;
    }
  }
  return mask;
}

type Blob = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
};

function findBlobs(mask: Uint8Array, w: number, h: number): Blob[] {
  const seen = new Uint8Array(mask.length);
  const blobs: Blob[] = [];
  const imgArea = w * h;
  const minArea = Math.max(350, imgArea * 0.004);
  const maxArea = imgArea * 0.18; // floor-sized blobs rejected

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (!mask[start] || seen[start]) continue;
      const q = [start];
      seen[start] = 1;
      let minX = x,
        maxX = x,
        minY = y,
        maxY = y,
        area = 0;
      while (q.length) {
        const p = q.pop()!;
        const px = p % w;
        const py = (p / w) | 0;
        area++;
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
          q.push(ni);
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const fill = area / Math.max(1, bw * bh);
      const aspect = bh / Math.max(1, bw);

      // Reject floor carpets, thin lines, and near-full-frame blobs
      if (area < minArea || area > maxArea) continue;
      if (fill < 0.28) continue;
      if (aspect > 4.5 || aspect < 0.18) continue;
      if (bw > w * 0.72 || bh > h * 0.72) continue;

      blobs.push({ minX, minY, maxX, maxY, area });
    }
  }
  return blobs.sort((a, b) => b.area - a.area).slice(0, 16);
}

async function cropBlob(img: Rgba, blob: Blob, mask: Uint8Array) {
  const pad = 6;
  const left = Math.max(0, blob.minX - pad);
  const top = Math.max(0, blob.minY - pad);
  const width = Math.min(img.width - left, blob.maxX - blob.minX + 1 + pad * 2);
  const height = Math.min(img.height - top, blob.maxY - blob.minY + 1 + pad * 2);
  const out = Buffer.alloc(width * height * 4, 0);
  let opaque = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = left + x;
      const sy = top + y;
      if (!mask[sy * img.width + sx]) continue;
      const si = idx(sx, sy, img.width);
      const oi = (y * width + x) * 4;
      out[oi] = img.data[si];
      out[oi + 1] = img.data[si + 1];
      out[oi + 2] = img.data[si + 2];
      out[oi + 3] = 255;
      opaque++;
    }
  }
  if (opaque < 200) return null;
  return sharp(out, { raw: { width, height, channels: 4 } })
    .resize({ width: 480, withoutEnlargement: false })
    .png()
    .toBuffer();
}

/**
 * Find separate objects on a floor photo, identify each with Brickognize,
 * and store ONLY clean official catalog renders (never dirty floor pixels).
 */
export async function detectPiecesFromFloorPhoto(input: Buffer): Promise<{
  previewDataUrl: string;
  pieces: DetectedPiece[];
  note: string;
}> {
  const normalized = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const img: Rgba = {
    data: normalized.data,
    width: normalized.info.width,
    height: normalized.info.height,
  };

  const mask = buildMask(img);
  const blobs = findBlobs(mask, img.width, img.height);

  const detected: DetectedPiece[] = [];
  let rejected = 0;

  for (const blob of blobs) {
    const crop = await cropBlob(img, blob, mask);
    if (!crop) {
      rejected++;
      continue;
    }

    let match;
    try {
      match = await identifyLegoPart(crop);
    } catch (e) {
      console.error(e);
      rejected++;
      continue;
    }
    if (!match) {
      rejected++;
      continue;
    }

    const category = mapBrickCategory(match.categoryRaw, match.name);
    if (!category) {
      rejected++;
      continue;
    }

    const catalogPng = await fetchCatalogPng(match.imgUrl);
    if (!catalogPng) {
      rejected++;
      continue;
    }

    const back = await sharp(catalogPng).flop().png().toBuffer();
    const colorKey = `${match.partNum}|${match.colorId || "x"}`;
    const label = match.colorName
      ? `${match.colorName} ${match.name}`
      : match.name;

    detected.push({
      category,
      label,
      colorKey,
      partNum: match.partNum,
      catalogUrl: match.imgUrl,
      brickColor: match.colorName,
      imageDataUrl: toDataUrl(catalogPng),
      imageBackDataUrl: toDataUrl(back),
      quantity: 1,
      score: match.score,
    });
  }

  // Merge identical part+color into quantity
  const merged = new Map<string, DetectedPiece>();
  for (const p of detected) {
    const key = `${p.category}|${p.colorKey}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += 1;
    else merged.set(key, { ...p });
  }
  const pieces = [...merged.values()].sort((a, b) => b.score - a.score);

  const preview = await sharp(input)
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  let note: string;
  if (pieces.length === 0) {
    note =
      rejected > 0
        ? "No matching pieces found. Separate parts and try again."
        : "No pieces found. Use even lighting and separate each part.";
  } else {
    note = `Saved ${pieces.length} piece${pieces.length === 1 ? "" : "s"}.`;
  }

  return {
    previewDataUrl: `data:image/jpeg;base64,${preview.toString("base64")}`,
    pieces,
    note,
  };
}

export function parseDataUrl(dataUrl: string): Buffer {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return Buffer.from(dataUrl, "base64");
  return Buffer.from(match[2], "base64");
}
