import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/**
 * GET /api/dashboard/users — لیست کاربران
 * POST /api/dashboard/users — ساخت کاربر جدید
 */

export async function GET(req: NextRequest) {
  const user = await requirePermission("user.view");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q");

  const where: { [k: string]: unknown } = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      nameEn: true,
      phone: true,
      email: true,
      avatarUrl: true,
      field: true,
      education: true,
      bio: true,
      bioEn: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: { role: { select: { id: true, name: true, label: true } } },
      },
      _count: {
        select: {
          registrations: { where: { status: { not: "CANCELLED" } } },
          posts: true,
          files: true,
        },
      },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      nameEn: u.nameEn,
      phone: u.phone,
      email: u.email,
      avatarUrl: u.avatarUrl,
      field: u.field,
      education: u.education,
      bio: u.bio,
      bioEn: u.bioEn,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      rolesArray: u.userRoles.map((ur) => ur.role),
      registrationCount: u._count.registrations,
      postCount: u._count.posts,
      fileCount: u._count.files,
    })),
  });
}
