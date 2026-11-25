/**
 * Pure domain helpers for Neeleh Academy.
 * Intentionally free of Prisma/Next server runtime imports so they run fast under node:test.
 */

export type CourseArtworkKey =
  | "autocad"
  | "sketchup"
  | "revit"
  | "rhino"
  | "render"
  | "excel"
  | "grasshopper"
  | "automation"
  | "ai-bim";

const FA_TO_EN_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

/**
 * Normalizes Persian/Arabic characters (`ي -> ی`, `ك -> ک`), converts Persian/Arabic digits
 * to ASCII digits, removes ZWNJ/tatweel noise, and lowercases Latin text for matching.
 */
export function normalizeSearchText(input: string): string {
  return String(input ?? "")
    .replace(/[\u200C\u200D\u0640]/g, " ")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ة]/g, "ه")
    .replace(/[۰-۹٠-٩]/g, (ch) => FA_TO_EN_MAP[ch] ?? ch)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesNormalizedQuery(query: string, ...haystacks: Array<string | null | undefined>): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const tokens = q.split(" ").filter(Boolean);
  const combined = normalizeSearchText(haystacks.filter(Boolean).join(" "));
  return tokens.every((tok) => combined.includes(tok));
}

export function computeRemainingSeats(capacity: number, activeTaken: number): number {
  const cap = Number.isFinite(capacity) ? Math.max(0, Math.floor(capacity)) : 0;
  const taken = Number.isFinite(activeTaken) ? Math.max(0, Math.floor(activeTaken)) : 0;
  return Math.max(0, cap - taken);
}

export function isRegistrationAllowed(params: {
  published: boolean;
  regStatus: string;
  capacity: number;
  activeTaken: number;
  sessionStatus?: string | null;
  registrationDeadline?: Date | null;
  now?: Date;
}): { allowed: boolean; reason?: "UNPUBLISHED" | "CLOSED" | "FULL" | "DEADLINE_PASSED" } {
  if (!params.published) return { allowed: false, reason: "UNPUBLISHED" };
  if (params.regStatus !== "OPEN") return { allowed: false, reason: "CLOSED" };
  if (params.sessionStatus && params.sessionStatus !== "OPEN" && params.sessionStatus !== "SCHEDULED") {
    return { allowed: false, reason: params.sessionStatus === "FULL" ? "FULL" : "CLOSED" };
  }
  const now = params.now ?? new Date();
  if (params.registrationDeadline && params.registrationDeadline.getTime() < now.getTime()) {
    return { allowed: false, reason: "DEADLINE_PASSED" };
  }
  const rem = computeRemainingSeats(params.capacity, params.activeTaken);
  if (rem <= 0) return { allowed: false, reason: "FULL" };
  return { allowed: true };
}

export function generateTrackingCode(prefix: "NL" | "REQ", slugOrTopic: string, seedNumber?: number): string {
  const cleanCode = normalizeSearchText(slugOrTopic)
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase() || "ACAD";
  const num =
    typeof seedNumber === "number"
      ? Math.abs(Math.floor(seedNumber)) % 9000 + 1000
      : Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${cleanCode}-${num}`;
}

/**
 * Maps each of the 9 Neeleh Academy courses (by DB slug or numeric index/title)
 * to its recognizable software line-art SVG key.
 */
export function getCourseArtworkKey(slugOrIdOrTitle: string): CourseArtworkKey {
  const key = normalizeSearchText(slugOrIdOrTitle);
  if (key === "01" || key.includes("autocad") || key.includes("gstarcad") || key.includes("phase-2") || key.includes("phase2")) {
    return "autocad";
  }
  if (key === "02" || key.includes("sketchup")) {
    return "sketchup";
  }
  if (key === "03" || key.includes("revit")) {
    return "revit";
  }
  if (key === "04" || key.includes("rhino") && !key.includes("ai")) {
    return "rhino";
  }
  if (key === "05" || key.includes("enscape") || key.includes("lumion") || key.includes("v-ray") || key.includes("vray") || key.includes("render")) {
    return "render";
  }
  if (key === "06" || key.includes("excel") || key.includes("takeoff")) {
    return "excel";
  }
  if (key === "07" || key.includes("grasshopper") || key.includes("parametric")) {
    return "grasshopper";
  }
  if (key === "08" || key.includes("automation") || key.includes("b2b") || key.includes("اتوماسیون")) {
    return "automation";
  }
  if (key === "09" || key.includes("ai-architecture") || key.includes("ai") || key.includes("هوش مصنوعی")) {
    return "ai-bim";
  }
  return "autocad";
}

export const COURSE_ID_TO_SLUG: Record<string, string> = {
  "01": "autocad-phase2",
  "02": "sketchup-modeling",
  "03": "revit-bim",
  "04": "rhino-nurbs",
  "05": "enscape-vray",
  "06": "excel-smart-takeoff",
  "07": "grasshopper-parametric",
  "08": "b2b-automation",
  "09": "ai-architecture",
};

/**
 * Vintage rotary phone dial holes ordered 1..9, 0 counter-clockwise around dial face.
 * Clicking a digit rotates the dial clockwise to the finger stop at ~58deg and returns.
 */
export const ROTARY_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

export function dialDigitPhysics(digit: string): {
  digit: string;
  pulses: number;
  holeAngleDeg: number;
  pullAngleDeg: number;
  returnDurationMs: number;
} {
  const clean = digit === "0" ? "0" : ROTARY_DIGITS.includes(digit as (typeof ROTARY_DIGITS)[number]) ? digit : "1";
  const pulses = clean === "0" ? 10 : Number(clean);
  // Digit 1 starts at -35deg (top-right); each subsequent hole steps -28deg counter-clockwise
  const holeAngleDeg = -35 - (pulses - 1) * 26;
  // Pull clockwise past the finger stop (at +42deg)
  const pullAngleDeg = 60 + pulses * 24;
  const returnDurationMs = 340 + pulses * 55;
  return { digit: clean, pulses, holeAngleDeg, pullAngleDeg, returnDurationMs };
}

/**
 * Strips prompt-injection vectors from untrusted user/document strings before AI context assembly.
 */
export function sanitizeRetrievedContext(raw: string): string {
  return String(raw ?? "")
    .replace(/ignore (all )?(previous|above|prior) instructions?/gi, "[filtered-instruction]")
    .replace(/system\s*prompt/gi, "[filtered-term]")
    .replace(/<\/?(system|assistant|developer|tool)>/gi, "")
    .trim()
    .slice(0, 4000);
}
