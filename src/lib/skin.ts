import { cookies } from "next/headers";
import { SKIN_COOKIE, type Skin } from "./skin-shared";

export { SKIN_COOKIE, SKINS, parseSkin, type Skin } from "./skin-shared";

/** خواندن skin از کوکی — فقط در Server Component / Route Handler */
export async function getSkin(): Promise<Skin> {
  const store = await cookies();
  const raw = store.get(SKIN_COOKIE)?.value;
  return raw === "tresmares" ? "tresmares" : "neeleh";
}
