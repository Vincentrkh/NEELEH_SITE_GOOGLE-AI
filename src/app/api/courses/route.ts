import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/courses — کاتالوگ دوره‌های منتشر شده
 * فیلتر با query: ?tier=BEGINNER | ?category=... | ?featured=true
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tier = url.searchParams.get("tier");
  const category = url.searchParams.get("category");
  const featured = url.searchParams.get("featured");

  const where: { [k: string]: unknown } = { published: true };
  if (tier) where.tier = tier;
  if (category) where.category = category;
  if (featured === "true") where.featured = true;

  const courses = await db.course.findMany({
    where,
    orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      tier: true,
      category: true,
      tags: true,
      description: true,
      about: true,
      durationHrs: true,
      price: true,
      capacity: true,
      regStatus: true,
      featured: true,
      bannerUrl: true,
      sortOrder: true,
      _count: {
        select: {
          registrations: { where: { status: { not: "CANCELLED" } } },
        },
      },
    },
  });

  return NextResponse.json({
    courses: courses.map((c) => ({
      ...c,
      tagsArray: c.tags ? c.tags.split(",").filter(Boolean) : [],
      remainingSeats: Math.max(0, c.capacity - c._count.registrations),
      _count: undefined,
    })),
  });
}
