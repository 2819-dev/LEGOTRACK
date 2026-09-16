import sharp from "sharp";
import {
  fetchCatalogPng,
  identifyLegoPart,
  mapBrickCategory,
  predictLegoPart,
  type BrickBBox,
  type BrickMatch,
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

async function matchToPiece(match: BrickMatch): Promise<DetectedPiece | null> {
  const category = mapBrickCategory(match.categoryRaw, match.name);
  if (!category) return null;
  const catalogPng = await fetchCatalogPng(match.imgUrl);
  if (!catalogPng) return null;
  const back = await sharp(catalogPng).flop().png().toBuffer();
  const colorKey = `${match.partNum}|${match.colorId || "x"}`;
  const label = match.colorName ? `${match.colorName} ${match.name}` : match.name;
  return {
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
  };
}

/** Paint out a Brickognize bbox so the next pass finds another piece. */
async function wipeBBox(image: Buffer, bbox: BrickBBox, padRatio = 0.08) {
  const meta = await sharp(image).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const sx = w / Math.max(1, bbox.imageWidth);
  const sy = h / Math.max(1, bbox.imageHeight);
  const bw = Math.max(1, bbox.right - bbox.left);
  const bh = Math.max(1, bbox.lower - bbox.upper);
  const padX = bw * padRatio;
  const padY = bh * padRatio;
  let left = Math.floor((bbox.left - padX) * sx);
  let top = Math.floor((bbox.upper - padY) * sy);
  let width = Math.ceil((bw + padX * 2) * sx);
  let height = Math.ceil((bh + padY * 2) * sy);
  left = Math.max(0, left);
  top = Math.max(0, top);
  width = Math.min(w - left, Math.max(1, width));
  height = Math.min(h - top, Math.max(1, height));

  const white = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();

  return sharp(image)
    .composite([{ input: white, left, top }])
    .png()
    .toBuffer();
}

/**
 * Primary path: repeatedly ask Brickognize for the best piece in the photo,
 * then wipe that region and continue. Works when pieces are pale or close together.
 */
async function detectByIteration(input: Buffer, maxPieces = 18): Promise<DetectedPiece[]> {
  let working = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  const found: DetectedPiece[] = [];
  const seenCenters: Array<{ key: string; cx: number; cy: number }> = [];
  let misses = 0;

  for (let i = 0; i < maxPieces; i++) {
    const { match, bbox } = await predictLegoPart(working);
    if (!match || !bbox || bbox.score < 0.28) {
      misses++;
      if (misses >= 2) break;
      continue;
    }

    const piece = await matchToPiece(match);
    if (!piece) {
      if (bbox.score >= 0.4) working = await wipeBBox(working, bbox);
      misses++;
      if (misses >= 3) break;
      continue;
    }

    const key = `${piece.category}|${piece.colorKey}`;
    const cx = (bbox.left + bbox.right) / 2 / Math.max(1, bbox.imageWidth);
    const cy = (bbox.upper + bbox.lower) / 2 / Math.max(1, bbox.imageHeight);
    const nearDup = seenCenters.some((s) => {
      if (s.key !== key) return false;
      const dx = s.cx - cx;
      const dy = s.cy - cy;
      return Math.hypot(dx, dy) < 0.12;
    });
    if (nearDup) {
      working = await wipeBBox(working, bbox, 0.3);
      misses++;
      if (misses >= 3) break;
      continue;
    }

    seenCenters.push({ key, cx, cy });
    found.push(piece);
    misses = 0;
    working = await wipeBBox(working, bbox, 0.14);
  }

  return found;
}

function sampleFloor(img: Rgba) {
  const { data, width, height } = img;
  const samples: Array<{ r: number; g: number; b: number; sat: number }> = [];
  const push = (x: number, y: number) => {
    const i = idx(x, y, width);
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    samples.push({ r, g, b, sat });
  };
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 40))) {
    push(x, 1);
    push(x, height - 2);
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 40))) {
    push(1, y);
    push(width - 2, y);
  }
  samples.sort((a, b) => a.sat - b.sat);
  const keep = samples.slice(0, Math.max(8, Math.floor(samples.length * 0.7)));
  let r = 0,
    g = 0,
    b = 0;
  for (const s of keep) {
    r += s.r;
    g += s.g;
    b += s.b;
  }
  const n = keep.length || 1;
  return { r: r / n, g: g / n, b: b / n, lum: (r + g + b) / (3 * n) };
}

function dilate(mask: Uint8Array, w: number, h: number, radius = 1) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let dy = -radius; dy <= radius && !on; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (mask[ny * w + nx]) {
            on = 1;
            break;
          }
        }
      }
      out[y * w + x] = on;
    }
  }
  return out;
}

function erode(mask: Uint8Array, w: number, h: number, radius = 1) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = 1;
      for (let dy = -radius; dy <= radius && on; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
            on = 0;
            break;
          }
          if (!mask[ny * w + nx]) {
            on = 0;
            break;
          }
        }
      }
      out[y * w + x] = on;
    }
  }
  return out;
}

function buildMask(img: Rgba) {
  const floor = sampleFloor(img);
  const { data, width, height } = img;
  const mask = new Uint8Array(width * height);
  const floorLum = floor.lum;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (data[i + 3] < 20) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (r + g + b) / 3;
      const dr = Math.abs(r - floor.r) + Math.abs(g - floor.g) + Math.abs(b - floor.b);
      const dLum = Math.abs(lum - floorLum);
      const colorful = sat > 0.14 && dr > 28;
      const contrast = dLum > 28 && dr > 32;
      const darkOnLight = floorLum > 140 && lum < floorLum - 22 && dr > 24;
      const lightOnDark = floorLum < 110 && lum > floorLum + 24 && dr > 24;
      const palePlastic = sat > 0.06 && dr > 42;
      if (colorful || contrast || darkOnLight || lightOnDark || palePlastic) {
        mask[y * width + x] = 1;
      }
    }
  }
  const closed = erode(dilate(mask, width, height, 1), width, height, 1);
  return erode(dilate(closed, width, height, 1), width, height, 1);
}

type Blob = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
};

function floodBlob(
  mask: Uint8Array,
  seen: Uint8Array,
  w: number,
  h: number,
  start: number
): Blob {
  const q = [start];
  seen[start] = 1;
  let minX = start % w,
    maxX = minX,
    minY = (start / w) | 0,
    maxY = minY,
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
  return { minX, minY, maxX, maxY, area };
}

function findBlobs(mask: Uint8Array, w: number, h: number): Blob[] {
  const seen = new Uint8Array(mask.length);
  const blobs: Blob[] = [];
  const imgArea = w * h;
  const minArea = Math.max(220, Math.floor(imgArea * 0.0012));
  const maxArea = Math.floor(imgArea * 0.28);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (!mask[start] || seen[start]) continue;
      const blob = floodBlob(mask, seen, w, h, start);
      const bw = blob.maxX - blob.minX + 1;
      const bh = blob.maxY - blob.minY + 1;
      const fill = blob.area / Math.max(1, bw * bh);
      const aspect = bh / Math.max(1, bw);
      if (blob.area < minArea || blob.area > maxArea) continue;
      if (fill < 0.16) continue;
      if (aspect > 5.5 || aspect < 0.15) continue;
      if (bw > w * 0.85 || bh > h * 0.85) continue;
      blobs.push(blob);
    }
  }
  return blobs.sort((a, b) => b.area - a.area).slice(0, 20);
}

async function cropBlob(img: Rgba, blob: Blob, mask: Uint8Array) {
  const pad = 10;
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
  if (opaque < 120) return null;
  return sharp(out, { raw: { width, height, channels: 4 } })
    .resize({ width: 520, height: 520, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, () =>
      worker()
    )
  );
  return results;
}

/** Secondary path: color-mask blobs for pieces the iterative pass missed. */
async function detectByBlobs(input: Buffer): Promise<DetectedPiece[]> {
  const normalized = await sharp(input)
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: false })
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

  const rows = await mapPool(blobs, 4, async (blob) => {
    const crop = await cropBlob(img, blob, mask);
    if (!crop) return null;
    try {
      const match = await identifyLegoPart(crop);
      if (!match) return null;
      return matchToPiece(match);
    } catch (e) {
      console.error(e);
      return null;
    }
  });

  return rows.filter(Boolean) as DetectedPiece[];
}

function mergePieces(pieces: DetectedPiece[]): DetectedPiece[] {
  const merged = new Map<string, DetectedPiece>();
  for (const p of pieces) {
    const key = `${p.category}|${p.colorKey}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += p.quantity;
      if (p.score > existing.score) existing.score = p.score;
    } else {
      merged.set(key, { ...p });
    }
  }
  return [...merged.values()].sort((a, b) => b.score - a.score);
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
  // Run iterative Brickognize first (most reliable), then fill gaps with blob crops.
  const primary = await detectByIteration(input);
  const primaryKeys = new Set(primary.map((p) => `${p.category}|${p.colorKey}`));
  const secondary =
    primary.length >= 12
      ? []
      : (await detectByBlobs(input)).filter(
          (p) => !primaryKeys.has(`${p.category}|${p.colorKey}`)
        );

  const pieces = mergePieces([...primary, ...secondary]);

  const preview = await sharp(input)
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const note =
    pieces.length === 0
      ? "No pieces found. Use even lighting and separate each part."
      : `Saved ${pieces.length} piece${pieces.length === 1 ? "" : "s"}.`;

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
