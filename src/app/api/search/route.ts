import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { localizedCourse, localizedPost } from "@/lib/content";
import { normalizeSearchText } from "@/lib/domain/academy-rules";
import { getApiLang } from "@/lib/i18n";

export type SmartSearchItem = {
  id: string;
  kind: "course" | "post" | "resource" | "page";
  title: string;
  subtitle: string;
  href: string;
  meta: string;
  score: number;
};

const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ["ai", "artificial intelligence", "generative", "agent", "agents", "هوش", "مصنوعی", "هوش مصنوعی", "مولد"],
  ["bim", "revit", "archicad", "navisworks", "بیم", "رویت", "آرشیکد", "مدل سازی اطلاعات"],
  ["cad", "autocad", "gstarcad", "phase 2", "phase-2", "drafting", "اتوکد", "فاز 2", "فاز دو", "نقشه کشی", "اجرایی"],
  ["rhino", "grasshopper", "parametric", "nurbs", "computational", "راینو", "گرس هاپر", "پارامتریک", "الگوریتمیک", "محاسباتی"],
  ["render", "rendering", "enscape", "lumion", "vray", "v-ray", "رندر", "رندرینگ", "انسکیپ", "لومیون", "نورپردازی"],
  ["excel", "takeoff", "cost", "اکسل", "متره", "براورد", "مدیریت پروژه"],
  ["sketchup", "اسکچاپ", "حجم", "دکوراسیون"],
  ["automation", "workflow", "اتوماسیون", "بهینه سازی"],
];

function expandQueryGroups(normalizedQuery: string): string[][] {
  if (!normalizedQuery) return [];
  const rawTokens = normalizedQuery.split(" ").filter(Boolean);
  const groups: string[][] = [];

  // Check whole phrase + individual tokens against bilingual architecture synonyms
  for (const tok of rawTokens) {
    const bucket = new Set<string>([tok]);
    for (const grp of SYNONYM_GROUPS) {
      if (grp.some((term) => term === tok || term === normalizedQuery || (tok.length >= 2 && term.includes(tok)))) {
        for (const t of grp) bucket.add(t);
      }
    }
    groups.push(Array.from(bucket));
  }
  return groups;
}

function scoreMatch(
  normalizedQuery: string,
  groups: string[][],
  primaryText: string,
  secondaryText: string,
  tagsText: string,
): number {
  if (!normalizedQuery) return 1;
  const p = normalizeSearchText(primaryText);
  const s = normalizeSearchText(secondaryText);
  const t = normalizeSearchText(tagsText);
  const all = `${p} ${t} ${s}`;

  let score = 0;
  if (p.includes(normalizedQuery)) score += 35;
  else if (t.includes(normalizedQuery)) score += 22;
  else if (s.includes(normalizedQuery)) score += 12;

  let matchedGroups = 0;
  for (const aliases of groups) {
    let bestGroupScore = 0;
    for (let idx = 0; idx < aliases.length; idx++) {
      const alias = aliases[idx];
      const isDirect = idx === 0;
      if (p.includes(alias)) {
        bestGroupScore = Math.max(bestGroupScore, isDirect ? 16 : 9);
      } else if (t.includes(alias)) {
        bestGroupScore = Math.max(bestGroupScore, isDirect ? 12 : 7);
      } else if (s.includes(alias)) {
        bestGroupScore = Math.max(bestGroupScore, isDirect ? 6 : 4);
      }
    }
    if (bestGroupScore > 0) {
      matchedGroups += 1;
      score += bestGroupScore;
    }
  }

  if (matchedGroups === 0) return 0;
  // Bonus when all query tokens match directly or via synonym
  if (matchedGroups === groups.length) score += 14;
  // Require every token to have at least one match if multi-word query has direct tokens
  if (groups.length > 1 && matchedGroups < Math.ceil(groups.length * 0.6)) {
    return 0;
  }

  return all.length > 0 ? score : 0;
}

const STATIC_DESTINATIONS = [
  {
    id: "page-paths",
    href: "/paths",
    titleFa: "مسیرهای یادگیری و شغلی معماری",
    titleEn: "Architectural Learning & Career Paths",
    subFa: "انتخاب مسیر از نقشه‌کشی فاز ۲ تا BIM و طراحی پارامتریک و AI",
    subEn: "Guided trajectories from Phase-2 drafting to BIM, Grasshopper & AI",
    tags: "paths مسیر یادگیری نقشه راه",
    metaFa: "صفحه راهنما",
    metaEn: "Guide",
  },
  {
    id: "page-ailab",
    href: "/ai-lab",
    titleFa: "آزمایشگاه هوش مصنوعی و ابزارهای محاسباتی",
    titleEn: "AI Lab & Computational Architecture Roadmap",
    subFa: "هوش مصنوعی در ایده‌پردازی، راینو، گرس‌هاپر و اتوماسیون دفاتر",
    subEn: "Generative AI, Rhino/Grasshopper workflows & office automation",
    tags: "ai lab هوش مصنوعی ابزار محاسباتی",
    metaFa: "آزمایشگاه AI",
    metaEn: "AI Lab",
  },
  {
    id: "page-calendar",
    href: "/calendar",
    titleFa: "تقویم ترم‌ها و نوبت‌های پیش‌رو",
    titleEn: "Upcoming Cohort Calendar & Schedule",
    subFa: "زمان‌بندی برگزاری دوره‌های حضوری در دامغان و آنلاین سراسری",
    subEn: "Live dates for Damghan in-person and nationwide online cohorts",
    tags: "calendar تقویم زمان بندی دامغان",
    metaFa: "تقویم آموزشی",
    metaEn: "Schedule",
  },
  {
    id: "page-about",
    href: "/why-neeleh",
    titleFa: "درباره آکادمی نیله و تایم‌لاین تجربه‌ها",
    titleEn: "About Neeleh Academy & Practice Timeline",
    subFa: "تجربه‌های گردآمده در طراحی، BIM، پارامتریک و ساخت از ۱۳۷۹ تا ۱۴۰۵",
    subEn: "Architectural, BIM, and computational milestones unified since 2000",
    tags: "about تاریخچه درباره ما نیله دامغان",
    metaFa: "درباره ما",
    metaEn: "About",
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQ = (searchParams.get("q") ?? "").trim();
  const langParam = searchParams.get("lang");
  const lang = langParam === "fa" || langParam === "en" ? langParam : await getApiLang();
  const fa = lang === "fa";

  const nq = normalizeSearchText(rawQ);
  const groups = expandQueryGroups(nq);

  const [courses, posts, resources] = await Promise.all([
    db.course.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }).catch(() => []),
    db.post.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } }).catch(() => []),
    db.courseResource
      .findMany({
        where: { isPublic: true, course: { published: true } },
        include: { course: { select: { slug: true, title: true, titleEn: true } } },
        take: 20,
      })
      .catch(() => []),
  ]);

  const results: SmartSearchItem[] = [];

  for (const c of courses) {
    const lc = localizedCourse(lang, c);
    const primary = `${c.title} ${c.titleEn ?? ""}`;
    const secondary = `${c.description} ${c.descriptionEn ?? ""} ${c.category} ${c.categoryEn ?? ""}`;
    const tags = `${c.tags ?? ""} ${c.tools ?? ""} ${c.tier} ${c.slug}`;
    const sc = nq ? scoreMatch(nq, groups, primary, secondary, tags) + (c.featured ? 2 : 0) : c.featured ? 20 : 10;
    if (sc > 0) {
      results.push({
        id: `course-${c.id}`,
        kind: "course",
        title: lc.title,
        subtitle: lc.description,
        href: `/courses/${c.slug}`,
        meta: lc.category || (fa ? "دوره تخصصی" : "Course"),
        score: sc + 5,
      });
    }
  }

  for (const p of posts) {
    const lp = localizedPost(lang, p);
    const primary = `${p.title} ${p.titleEn ?? ""}`;
    const secondary = `${p.excerpt ?? ""} ${p.excerptEn ?? ""}`;
    const tags = `${p.tags ?? ""} ${p.slug}`;
    const sc = nq ? scoreMatch(nq, groups, primary, secondary, tags) : 8;
    if (sc > 0) {
      results.push({
        id: `post-${p.id}`,
        kind: "post",
        title: lp.title,
        subtitle: lp.excerpt,
        href: `/blog/${p.slug}`,
        meta: fa ? "مجله معماری" : "Journal",
        score: sc,
      });
    }
  }

  for (const r of resources) {
    const primary = `${r.title} ${r.course?.title ?? ""} ${r.course?.titleEn ?? ""}`;
    const secondary = `${r.description ?? ""}`;
    const tags = `${r.softwareVersion ?? ""} ${r.kind}`;
    const sc = nq ? scoreMatch(nq, groups, primary, secondary, tags) : 4;
    if (sc > 0) {
      results.push({
        id: `res-${r.id}`,
        kind: "resource",
        title: r.title,
        subtitle: r.description || (fa ? r.course?.title : r.course?.titleEn || r.course?.title) || "",
        href: "/resources",
        meta: fa ? "منبع آموزشی" : "Resource",
        score: sc,
      });
    }
  }

  for (const page of STATIC_DESTINATIONS) {
    const primary = `${page.titleFa} ${page.titleEn}`;
    const secondary = `${page.subFa} ${page.subEn}`;
    const sc = nq ? scoreMatch(nq, groups, primary, secondary, page.tags) : 6;
    if (sc > 0) {
      results.push({
        id: page.id,
        kind: "page",
        title: fa ? page.titleFa : page.titleEn,
        subtitle: fa ? page.subFa : page.subEn,
        href: page.href,
        meta: fa ? page.metaFa : page.metaEn,
        score: sc,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    ok: true,
    query: rawQ,
    items: results.slice(0, nq ? 18 : 9),
  });
}
