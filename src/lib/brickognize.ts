import sharp from "sharp";

export type BrickMatch = {
  partNum: string;
  name: string;
  categoryRaw: string;
  imgUrl: string;
  score: number;
  colorId: string | null;
  colorName: string | null;
};

type PredictResponse = {
  items?: Array<{
    id: string;
    name: string;
    img_url: string;
    category: string | null;
    type: string;
    score: number;
  }>;
  colors?: Array<{ id: string; name: string; score: number }>;
};

/**
 * Identify a single LEGO piece crop via Brickognize and return the clean catalog render.
 */
export async function identifyLegoPart(imageBuf: Buffer): Promise<BrickMatch | null> {
  const jpeg = await sharp(imageBuf)
    .rotate()
    .resize({ width: 640, height: 640, fit: "inside" })
    .jpeg({ quality: 88 })
    .toBuffer();

  const form = new FormData();
  form.append(
    "query_image",
    new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }),
    "piece.jpg"
  );

  const url =
    "https://api.brickognize.com/predict/parts/?predict_color=true&top_k_items=5&min_similarity_items=0.35";
  const res = await fetch(url, {
    method: "POST",
    headers: { accept: "application/json" },
    body: form,
  });
  if (!res.ok) {
    console.error("Brickognize failed", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as PredictResponse;
  const item = data.items?.[0];
  if (!item || item.score < 0.38) return null;

  // Prefer color-specific catalog thumbnail when Brickognize gives a color
  const color = data.colors?.[0] || null;
  let imgUrl = item.img_url;
  if (color?.id) {
    const colored = item.img_url.replace(/\/(\d+)\.webp$/i, `/${color.id}.webp`);
    // Only swap if pattern matched a color suffix
    if (colored !== item.img_url || /\/\d+\.webp$/i.test(item.img_url)) {
      imgUrl = colored.includes(`/${color.id}.webp`)
        ? colored
        : item.img_url.replace(/\/[^/]+\.webp$/i, `/${color.id}.webp`);
    }
  }

  return {
    partNum: item.id,
    name: item.name,
    categoryRaw: item.category || "",
    imgUrl,
    score: item.score,
    colorId: color?.id ?? null,
    colorName: color?.name ?? null,
  };
}

export async function fetchCatalogPng(imgUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(imgUrl, {
      headers: { Accept: "image/webp,image/png,image/*" },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return sharp(buf).ensureAlpha().png().toBuffer();
  } catch (e) {
    console.error("catalog fetch failed", imgUrl, e);
    return null;
  }
}

export function mapBrickCategory(
  categoryRaw: string,
  name: string
): "helmet" | "hair" | "head" | "shirt" | "pants" | null {
  const c = `${categoryRaw} ${name}`.toLowerCase();
  if (c.includes("leg") || c.includes("hips")) return "pants";
  if (c.includes("torso") || c.includes("body upper") || c.includes("shirt")) return "shirt";
  if (c.includes("helmet") || c.includes("headgear") || c.includes("visor") || c.includes("mask")) {
    return "helmet";
  }
  if (c.includes("hair") || c.includes("wig")) return "hair";
  if (c.includes("head") || c.includes("face")) return "head";
  // Ignore non-minifig bricks/plates/etc.
  if (c.includes("minifig")) {
    if (c.includes("utensil") || c.includes("weapon") || c.includes("accessory")) return null;
    return "shirt";
  }
  return null;
}
