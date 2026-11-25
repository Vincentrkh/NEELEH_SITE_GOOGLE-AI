import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = (raw || "http://localhost:3000").trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.toLowerCase()}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const now = new Date();

  const [courses, posts] = await Promise.all([
    db.course.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }).catch(() => []),
    db.post.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }).catch(() => []),
  ]);

  const staticRoutes = [
    "",
    "/courses",
    "/calendar",
    "/resources",
    "/ai-lab",
    "/blog",
    "/search",
    "/about",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
  }));

  const courseRoutes = courses.map((c) => ({
    url: `${baseUrl}/courses/${c.slug}`,
    lastModified: c.updatedAt,
  }));

  const postRoutes = posts.map((p) => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: p.updatedAt,
  }));

  return [...staticRoutes, ...courseRoutes, ...postRoutes];
}
