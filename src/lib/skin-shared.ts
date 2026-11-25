export type Skin = "neeleh" | "tresmares";

export const SKIN_COOKIE = "neeleh_skin";

export const SKINS: Skin[] = ["neeleh", "tresmares"];

export function parseSkin(value: unknown): Skin {
  return value === "tresmares" ? "tresmares" : "neeleh";
}
