import sharp from "sharp";
import { parseDataUrl } from "./minifig-split";

/** Compress data-URL images so Neon TEXT rows stay manageable. */
export async function compressDataUrl(
  dataUrl: string,
  opts: { maxWidth?: number; quality?: number } = {}
): Promise<string> {
  const maxWidth = opts.maxWidth ?? 1200;
  const quality = opts.quality ?? 80;
  const buf = parseDataUrl(dataUrl);
  const out = await sharp(buf)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}
