import sharp from "sharp";

export type PieceCategory = "hair" | "head" | "shirt" | "pants";

export type SplitPiece = {
  category: PieceCategory;
  imageDataUrl: string;
};

const CATEGORIES: PieceCategory[] = ["hair", "head", "shirt", "pants"];

/** Classic minifig vertical proportions after cropping to the figure. */
const BANDS: Record<PieceCategory, [number, number]> = {
  hair: [0, 0.16],
  head: [0.14, 0.36],
  shirt: [0.34, 0.66],
  pants: [0.64, 1],
};

function toDataUrl(buf: Buffer, mime = "image/png") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * Heuristic "AI" split for real minifig photos:
 * 1) normalize orientation / size
 * 2) find the densest vertical content band (figure vs table background)
 * 3) slice into hair / head / shirt / pants with slight overlaps
 */
export async function splitMinifigImage(input: Buffer): Promise<{
  originalDataUrl: string;
  pieces: SplitPiece[];
}> {
  const meta = await sharp(input).rotate().ensureAlpha().toBuffer({
    resolveWithObject: true,
  });

  const resized = await sharp(meta.data)
    .resize({
      width: 720,
      height: 1200,
      fit: "inside",
      withoutEnlargement: false,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  const { width, height, channels } = info;
  const crop = findFigureBounds(data, width, height, channels);

  const cropped = await sharp(input)
    .rotate()
    .extract({
      left: Math.max(0, Math.floor((crop.left / width) * meta.info.width)),
      top: Math.max(0, Math.floor((crop.top / height) * meta.info.height)),
      width: Math.max(
        8,
        Math.floor((crop.width / width) * meta.info.width)
      ),
      height: Math.max(
        8,
        Math.floor((crop.height / height) * meta.info.height)
      ),
    })
    .resize({ width: 480, withoutEnlargement: false })
    .png()
    .toBuffer({ resolveWithObject: true });

  const h = cropped.info.height;
  const w = cropped.info.width;
  const pieces: SplitPiece[] = [];

  for (const category of CATEGORIES) {
    const [start, end] = BANDS[category];
    const top = Math.floor(h * start);
    const bottom = Math.ceil(h * end);
    const pieceH = Math.max(8, bottom - top);
    const pieceBuf = await sharp(cropped.data)
      .extract({ left: 0, top, width: w, height: pieceH })
      .png()
      .toBuffer();
    pieces.push({ category, imageDataUrl: toDataUrl(pieceBuf) });
  }

  const originalPng = await sharp(cropped.data).png().toBuffer();
  return {
    originalDataUrl: toDataUrl(originalPng),
    pieces,
  };
}

function findFigureBounds(
  data: Buffer,
  width: number,
  height: number,
  channels: number
) {
  // Score non-background-ish pixels: not near-white / near-gray table.
  const rowScores = new Array(height).fill(0);
  const colScores = new Array(width).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels > 3 ? data[i + 3] : 255;
      if (a < 20) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (r + g + b) / 3;
      const interesting = sat > 0.18 || lum < 210;
      if (interesting) {
        rowScores[y] += 1;
        colScores[x] += 1;
      }
    }
  }

  const rowThresh = Math.max(2, width * 0.04);
  const colThresh = Math.max(2, height * 0.03);
  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  while (top < height && rowScores[top] < rowThresh) top++;
  while (bottom > top && rowScores[bottom] < rowThresh) bottom--;
  while (left < width && colScores[left] < colThresh) left++;
  while (right > left && colScores[right] < colThresh) right--;

  // Pad a little so hair tips aren't clipped.
  const padY = Math.floor((bottom - top) * 0.03);
  const padX = Math.floor((right - left) * 0.08);
  top = Math.max(0, top - padY);
  bottom = Math.min(height - 1, bottom + padY);
  left = Math.max(0, left - padX);
  right = Math.min(width - 1, right + padX);

  return {
    left,
    top,
    width: Math.max(8, right - left + 1),
    height: Math.max(8, bottom - top + 1),
  };
}

export function parseDataUrl(dataUrl: string): Buffer {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    // raw base64
    return Buffer.from(dataUrl, "base64");
  }
  return Buffer.from(match[2], "base64");
}
