import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/**
 * GET /api/courses/[slug] — جزئیات یک دوره منتشر شده
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const course = await db.course.findUnique({
    where: { slug },
    include: {
      sections: { orderBy: { order: "asc" } },
      resources: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          registrations: { where: { status: { not: "CANCELLED" } } },
        },
      },
    },
  });

  if (!course || !course.published) {
    return NextResponse.json({ error: await apiMsg("دوره یافت نشد", "Course not found") }, { status: 404 });
  }

  let canSeePrivateResources = false;
  if (user) {
    if (
      user.roles.includes("ADMIN") ||
      user.roles.includes("EDITOR") ||
      user.permissions.includes("course.update")
    ) {
      canSeePrivateResources = true;
    } else {
      const reg = await db.registration.findFirst({
        where: {
          studentId: user.id,
          courseId: course.id,
          status: "CONFIRMED",
        },
        select: { id: true },
      });
      canSeePrivateResources = Boolean(reg);
    }
  }

  const visibleResources = canSeePrivateResources
    ? course.resources
    : course.resources.filter((r) => r.isPublic);

  return NextResponse.json({
    course: {
      ...course,
      resources: visibleResources,
      tagsArray: course.tags ? course.tags.split(",").filter(Boolean) : [],
      outputsArray: course.outputs ? course.outputs.split("\n").filter(Boolean) : [],
      sections: course.sections.map((s) => ({
        ...s,
        itemsArray: s.items ? s.items.split("\n").filter(Boolean) : [],
      })),
      remainingSeats: Math.max(0, course.capacity - course._count.registrations),
      _count: undefined,
    },
  });
}
