/**
 * content.ts — انتخاب فیلد محتوا بر اساس زبان (EN/FA).
 *
 * همه مدل‌های محتوا فیلدهای اختیاری *En دارند. اگر ترجمه انگلیسی
 * خالی/نبود، فارسی fallback می‌شود تا سایت هرگز خالی نشود.
 */

type Lang = "en" | "fa";

/** انتخاب رشته با fallback به فارسی */
export function pickString(lang: Lang, fa: string | null | undefined, en: string | null | undefined): string {
  if (lang === "fa") return fa ?? "";
  const v = (en ?? "").trim();
  return v || (fa ?? "");
}

/** انتخاب متن چندخطی (about/content/outputs/prereqs) */
export function pickText(lang: Lang, fa: string | null | undefined, en: string | null | undefined): string {
  return pickString(lang, fa, en);
}

/** لیست خروجی‌ها/پیش‌نیازها به‌صورت آرایه */
export function pickLines(lang: Lang, fa: string | null | undefined, en: string | null | undefined): string[] {
  const text = pickText(lang, fa, en);
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** لیست تگ‌ها به‌صورت آرایه */
export function pickTags(lang: Lang, fa: string | null | undefined, en: string | null | undefined): string[] {
  const text = pickString(lang, fa, en);
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Course فیلدهای زبان‌محور — از آبجکت خام course می‌سازد */
export type CourseLike = {
  title: string;
  titleEn?: string | null;
  category: string;
  categoryEn?: string | null;
  tags: string;
  tagsEn?: string | null;
  about: string;
  aboutEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  outputs: string;
  outputsEn?: string | null;
  prereqs: string;
  prereqsEn?: string | null;
};

export function localizedCourse(lang: Lang, c: CourseLike) {
  return {
    title: pickString(lang, c.title, c.titleEn),
    category: pickString(lang, c.category, c.categoryEn),
    tags: pickTags(lang, c.tags, c.tagsEn),
    about: pickText(lang, c.about, c.aboutEn),
    description: pickText(lang, c.description, c.descriptionEn),
    outputs: pickLines(lang, c.outputs, c.outputsEn),
    prereqs: pickLines(lang, c.prereqs, c.prereqsEn),
  };
}

/** Post فیلدهای زبان‌محور */
export type PostLike = {
  title: string;
  titleEn?: string | null;
  excerpt: string;
  excerptEn?: string | null;
  content: string;
  contentEn?: string | null;
};

export function localizedPost(lang: Lang, p: PostLike) {
  return {
    title: pickString(lang, p.title, p.titleEn),
    excerpt: pickText(lang, p.excerpt, p.excerptEn),
    content: pickText(lang, p.content, p.contentEn),
  };
}

/** StaticPage فیلدهای زبان‌محور */
export type StaticPageLike = {
  title: string;
  titleEn?: string | null;
  excerpt?: string | null;
  excerptEn?: string | null;
  content: string;
  contentEn?: string | null;
};

export function localizedStaticPage(lang: Lang, p: StaticPageLike) {
  return {
    title: pickString(lang, p.title, p.titleEn),
    excerpt: lang === "en" ? (p.excerptEn ?? "") : (p.excerpt ?? ""),
    content: pickText(lang, p.content, p.contentEn),
  };
}

/** Category/Tag */
export function pickName(lang: Lang, fa: string | null | undefined, en: string | null | undefined): string {
  return pickString(lang, fa, en);
}
