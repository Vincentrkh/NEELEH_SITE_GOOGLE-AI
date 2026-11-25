import { db } from "@/lib/db";
import { getServerLang } from "@/lib/i18n";
import { localizedCourse, localizedPost } from "@/lib/content";
import { matchesNormalizedQuery } from "@/lib/domain/academy-rules";
import { PublicShell } from "@/components/public-shell";
import { SmartSearchPageClient } from "@/components/smart-search-page-client";
import type { SmartSearchItem } from "@/app/api/search/route";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const lang = await getServerLang();
  const fa = lang === "fa";
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const [courses, posts, resources] = await Promise.all([
    db.course.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    db.post.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } }),
    db.courseResource.findMany({
      where: { isPublic: true, course: { published: true } },
      include: { course: { select: { slug: true, title: true, titleEn: true } } },
    }),
  ]);

  const matchedCourses = q
    ? courses.filter((c) =>
        matchesNormalizedQuery(q, c.title, c.titleEn, c.description, c.descriptionEn, c.category, c.tags, c.tools)
      )
    : courses;

  const matchedPosts = q
    ? posts.filter((p) =>
        matchesNormalizedQuery(q, p.title, p.titleEn, p.excerpt, p.excerptEn, p.tags)
      )
    : posts.slice(0, 6);

  const matchedResources = q
    ? resources.filter((r) => matchesNormalizedQuery(q, r.title, r.description, r.softwareVersion))
    : resources;

  const initialItems: SmartSearchItem[] = [
    ...matchedCourses.map((c) => {
      const lc = localizedCourse(lang, c);
      return {
        id: `course-${c.id}`,
        kind: "course" as const,
        title: lc.title,
        subtitle: lc.description,
        href: `/courses/${c.slug}`,
        meta: lc.category,
        score: 10,
      };
    }),
    ...matchedPosts.map((p) => {
      const lp = localizedPost(lang, p);
      return {
        id: `post-${p.id}`,
        kind: "post" as const,
        title: lp.title,
        subtitle: lp.excerpt,
        href: `/blog/${p.slug}`,
        meta: fa ? "مجله معماری" : "Journal",
        score: 5,
      };
    }),
    ...matchedResources.map((r) => ({
      id: `res-${r.id}`,
      kind: "resource" as const,
      title: r.title,
      subtitle: r.description || "",
      href: "/resources",
      meta: fa ? "منبع آموزشی" : "Resource",
      score: 2,
    })),
  ];

  return (
    <PublicShell>
      <SmartSearchPageClient initialQuery={q} initialItems={initialItems} />
    </PublicShell>
  );
}
