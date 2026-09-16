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

export type BrickBBox = {
  left: number;
  upper: number;
  right: number;
  lower: number;
  imageWidth: number;
  imageHeight: number;
  score: number;
};

type PredictItem = {
  id: string;
  name: string;
  img_url: string;
  category: string | null;
  type: string;
  score: number;
};

type PredictResponse = {
  listing_id?: string;
  bounding_box?: {
    left: number;
    upper: number;
    right: number;
    lower: number;
    image_width: number;
    image_height: number;
    score: number;
  };
  items?: PredictItem[];
  colors?: Array<{ id: string; name: string; score: number }>;
};

function colorizedImgUrl(imgUrl: string, colorId: string | null) {
  if (!colorId) return imgUrl;
  const colored = imgUrl.replace(/\/(\d+)\.webp$/i, `/${colorId}.webp`);
  if (colored !== imgUrl) return colored;
  if (/\/[^/]+\.webp$/i.test(imgUrl)) {
    return imgUrl.replace(/\/[^/]+\.webp$/i, `/${colorId}.webp`);
  }
  return imgUrl;
}

function toMatch(
  item: PredictItem,
  color: { id: string; name: string; score: number } | null
): BrickMatch {
  return {
    partNum: item.id,
    name: item.name,
    categoryRaw: item.category || "",
    imgUrl: colorizedImgUrl(item.img_url, color?.id ?? null),
    score: item.score,
    colorId: color?.id ?? null,
    colorName: color?.name ?? null,
  };
}

function pickMinifigItem(
  items: PredictItem[],
  bboxScore: number
): PredictItem | null {
  const minScore = bboxScore >= 0.65 ? 0.24 : 0.3;
  const ranked = items.filter((i) => i.score >= minScore);
  for (const candidate of ranked) {
    if (mapBrickCategory(candidate.category || "", candidate.name)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Run Brickognize on an image. Returns the best minifig match + detection box.
 */
export async function predictLegoPart(imageBuf: Buffer): Promise<{
  match: BrickMatch | null;
  bbox: BrickBBox | null;
}> {
  const jpeg = await sharp(imageBuf)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize({ width: 960, height: 960, fit: "inside" })
    .jpeg({ quality: 90 })
    .toBuffer();

  const form = new FormData();
  form.append(
    "query_image",
    new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }),
    "piece.jpg"
  );

  const url =
    "https://api.brickognize.com/predict/parts/?predict_color=true&top_k_items=8&min_similarity_items=0.18";
  const res = await fetch(url, {
    method: "POST",
    headers: { accept: "application/json" },
    body: form,
  });
  if (!res.ok) {
    console.error("Brickognize failed", res.status, await res.text());
    return { match: null, bbox: null };
  }

  const data = (await res.json()) as PredictResponse;
  const bb = data.bounding_box;
  const bbox: BrickBBox | null = bb
    ? {
        left: bb.left,
        upper: bb.upper,
        right: bb.right,
        lower: bb.lower,
        imageWidth: bb.image_width,
        imageHeight: bb.image_height,
        score: bb.score,
      }
    : null;

  const color = data.colors?.[0] || null;
  const item = pickMinifigItem(data.items || [], bbox?.score ?? 0);
  if (!item) return { match: null, bbox };

  // Weak part scores without a confident box are usually wrong.
  if ((!bbox || bbox.score < 0.35) && item.score < 0.32) {
    return { match: null, bbox };
  }
  if (item.score < 0.24) {
    return { match: null, bbox };
  }

  return { match: toMatch(item, color), bbox };
}

/** Identify a single cropped piece (no bbox iteration). */
export async function identifyLegoPart(imageBuf: Buffer): Promise<BrickMatch | null> {
  const { match } = await predictLegoPart(imageBuf);
  return match;
}

export async function fetchCatalogPng(imgUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(imgUrl, {
      headers: { Accept: "image/webp,image/png,image/*" },
    });
    if (!res.ok) {
      const base = imgUrl.replace(/\/\d+\.webp$/i, "/0.webp");
      if (base !== imgUrl) {
        const retry = await fetch(base, {
          headers: { Accept: "image/webp,image/png,image/*" },
        });
        if (!retry.ok) return null;
        const buf = Buffer.from(await retry.arrayBuffer());
        return sharp(buf).ensureAlpha().png().toBuffer();
      }
      return null;
    }
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
  const cat = categoryRaw.toLowerCase();
  const nameL = name.toLowerCase();
  const c = `${cat} ${nameL}`;

  if (
    /\b(plate|brick|tile|slope|technic|wheel|tyre|tire|baseplate|panel|wedge)\b/.test(
      c
    ) &&
    !c.includes("minifig") &&
    !c.includes("mini doll")
  ) {
    return null;
  }

  if (
    cat.includes("leg") ||
    nameL.includes("legs") ||
    nameL.includes("hips and") ||
    /\bhips\b/.test(nameL)
  ) {
    return "pants";
  }
  if (
    cat.includes("torso") ||
    nameL.includes("torso") ||
    nameL.includes("body upper")
  ) {
    return "shirt";
  }
  if (
    cat.includes("hair") ||
    nameL.includes(" hair") ||
    nameL.startsWith("hair") ||
    nameL.includes("wig") ||
    nameL.includes("ponytail")
  ) {
    return "hair";
  }
  if (
    cat.includes("helmet") ||
    cat.includes("headgear") ||
    nameL.includes("helmet") ||
    nameL.includes("headgear") ||
    /\bcap\b/.test(nameL) ||
    nameL.includes(" hat") ||
    nameL.includes("hood") ||
    nameL.includes("visor") ||
    nameL.includes("mask") ||
    nameL.includes("crown") ||
    nameL.includes("turban")
  ) {
    return "helmet";
  }
  if (
    cat.includes("head") ||
    (/\bhead\b/.test(nameL) && !nameL.includes("headlight"))
  ) {
    if (
      c.includes("minifig") ||
      cat.includes("minifig") ||
      nameL.includes("minifig") ||
      /\bhead\b/.test(nameL)
    ) {
      return "head";
    }
  }

  if (c.includes("minifig") || c.includes("mini doll")) {
    if (
      c.includes("utensil") ||
      c.includes("weapon") ||
      c.includes("accessory") ||
      c.includes("tool") ||
      c.includes("food")
    ) {
      return null;
    }
    return null;
  }
  return null;
}
