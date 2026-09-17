/** Rebrickable / BrickLink color ids → plastic hex. */
const COLOR_BY_ID: Record<string, string> = {
  "0": "#05131D", // black (BL)
  "1": "#0055BF", // blue
  "2": "#237841", // green
  "3": "#F2CD37", // yellow (also "3" in some catalogs)
  "4": "#C91A09", // red
  "5": "#C91A09", // red
  "6": "#C870A0", // dark pink
  "7": "#9BA19D", // light grey
  "8": "#6D6E5C", // dark grey
  "9": "#B4D2E4", // light blue
  "10": "#4B9F4A", // bright green
  "11": "#05131D", // black
  "14": "#F2CD37", // yellow
  "15": "#FFFFFF", // white
  "17": "#BBE90B", // lime
  "19": "#E4CD9E", // tan
  "21": "#C91A09", // bright red
  "22": "#81007B", // dark purple
  "23": "#0055BF", // bright blue
  "24": "#F2CD37", // bright yellow
  "25": "#FE8A18", // orange
  "26": "#E4ADC8", // bright purple / pink
  "27": "#BBE90B", // bright green / lime
  "28": "#958A73", // dark tan
  "29": "#E4ADC8", // light purple
  "36": "#645A4C", // dark brown-ish
  "42": "#5A93DB", // medium blue
  "69": "#E4CD9E", // medium dark flesh / nougat-ish
  "70": "#582A12", // reddish brown
  "71": "#A0A5A9", // light bluish gray
  "72": "#6C6E68", // dark bluish gray
  "85": "#7B2391", // dark purple
  "86": "#7C503A", // brown
  "103": "#F8F1A3", // bright light yellow
  "191": "#F8BB63", // bright light orange
  "212": "#9DC3F0", // bright light blue
  "226": "#FFF03A", // bright light yellow (alt)
  "272": "#0A3463", // dark blue
  "288": "#184632", // dark green
  "308": "#352100", // dark brown
  "320": "#720E0F", // dark red
  "321": "#36AEBF", // dark azure
  "322": "#68BCC5", // medium azure
  "323": "#D4F2FF", // light aqua
  "326": "#E8E8A6", // yellow green
  "378": "#A5C98A", // sand green
  "484": "#B67C4D", // dark orange
};

const NAME_COLORS: Array<{ match: RegExp; hex: string }> = [
  { match: /\bbright light yellow\b/i, hex: "#F8F1A3" },
  { match: /\bbright light orange\b/i, hex: "#F8BB63" },
  { match: /\bbright light blue\b/i, hex: "#9DC3F0" },
  { match: /\breddish brown\b/i, hex: "#582A12" },
  { match: /\bdark brown\b/i, hex: "#352100" },
  { match: /\bdark bluish gray\b|\bdark grey\b|\bdark gray\b/i, hex: "#6C6E68" },
  { match: /\blight bluish gray\b|\blight grey\b|\blight gray\b/i, hex: "#A0A5A9" },
  { match: /\bdark blue\b/i, hex: "#0A3463" },
  { match: /\bmedium blue\b/i, hex: "#5A93DB" },
  { match: /\bdark green\b/i, hex: "#184632" },
  { match: /\bdark red\b/i, hex: "#720E0F" },
  { match: /\bdark purple\b/i, hex: "#7B2391" },
  { match: /\bdark orange\b/i, hex: "#B67C4D" },
  { match: /\bmedium azure\b/i, hex: "#68BCC5" },
  { match: /\bdark azure\b/i, hex: "#36AEBF" },
  { match: /\bsand green\b/i, hex: "#A5C98A" },
  { match: /\byellowish green\b|\byellow green\b/i, hex: "#E8E8A6" },
  { match: /\bnougat\b|\bflesh\b/i, hex: "#CC8E69" },
  { match: /\bblack\b/i, hex: "#05131D" },
  { match: /\bwhite\b/i, hex: "#FFFFFF" },
  { match: /\byellow\b/i, hex: "#F2CD37" },
  { match: /\bbrown\b/i, hex: "#7C503A" },
  { match: /\bblue\b/i, hex: "#0055BF" },
  { match: /\bgreen\b/i, hex: "#237841" },
  { match: /\bred\b/i, hex: "#C91A09" },
  { match: /\borange\b/i, hex: "#FE8A18" },
  { match: /\btan\b/i, hex: "#E4CD9E" },
  { match: /\blime\b/i, hex: "#BBE90B" },
  { match: /\bpink\b/i, hex: "#E4ADC8" },
  { match: /\bpurple\b/i, hex: "#7B2391" },
];

export const LEGO_YELLOW = "#F2CD37";
export const LEGO_PLASTIC = "#E8E8E8";

export function colorFromId(id: string | null | undefined): string | null {
  if (!id || id === "x") return null;
  return COLOR_BY_ID[String(id)] || null;
}

export function colorFromName(text: string | null | undefined): string | null {
  if (!text) return null;
  // Prefer longer / more specific matches by scanning list order (specific first above)
  for (const row of NAME_COLORS) {
    if (row.match.test(text)) return row.hex;
  }
  return null;
}

/** Parse `partNum|colorId` keys from Brickognize scans. */
export function colorFromKey(colorKey: string | null | undefined): string | null {
  if (!colorKey) return null;
  const cid = colorKey.includes("|") ? colorKey.split("|").pop() : colorKey;
  return colorFromId(cid);
}

export function primaryPartColor(
  colorKey?: string | null,
  label?: string | null,
  fallback = LEGO_PLASTIC
): string {
  return colorFromKey(colorKey) || colorFromName(label) || fallback;
}

/** Hips + legs often encoded in the label, e.g. "Red Hips and Green Legs". */
export function pantsColors(
  colorKey?: string | null,
  label?: string | null
): { hips: string; left: string; right: string } {
  const base = primaryPartColor(colorKey, label, "#C91A09");
  const hipsMatch = label?.match(/([A-Za-z ]+?)\s+Hips/i);
  const legsMatch = label?.match(/and\s+([A-Za-z ]+?)\s+Legs/i);
  const hips = colorFromName(hipsMatch?.[1] || null) || base;
  const legs = colorFromName(legsMatch?.[1] || null) || hips;
  return { hips, left: legs, right: legs };
}

/** Torso labels often mention arm/hand colors. */
export function torsoColors(
  colorKey?: string | null,
  label?: string | null
): { body: string; arms: string; hands: string } {
  const body = primaryPartColor(colorKey, label, "#0055BF");
  const armsMatch = label?.match(/\/\s*([A-Za-z ]+?)\s+Arms/i);
  const handsMatch = label?.match(/\/\s*([A-Za-z ]+?)\s+Hands/i);
  const arms = colorFromName(armsMatch?.[1] || null) || body;
  const hands = colorFromName(handsMatch?.[1] || null) || LEGO_YELLOW;
  return { body, arms, hands };
}

export function hairColor(colorKey?: string | null, label?: string | null) {
  return primaryPartColor(colorKey, label, "#582A12");
}

export function headColor(colorKey?: string | null, label?: string | null) {
  return primaryPartColor(colorKey, label, LEGO_YELLOW);
}

export function helmetColor(colorKey?: string | null, label?: string | null) {
  return primaryPartColor(colorKey, label, "#05131D");
}
