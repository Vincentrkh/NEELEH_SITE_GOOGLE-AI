import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { apiMsg } from "@/lib/i18n";

/** GET /api/dashboard/roles — لیست نقش‌ها با مجوزها */
export async function GET() {
  const user = await requirePermission("role.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const roles = await db.role.findMany({
    orderBy: { name: "asc" },
    include: {
      rolePermissions: {
        include: { permission: { select: { id: true, key: true, label: true } } },
      },
      _count: { select: { userRoles: true } },
    },
  });

  return NextResponse.json({
    roles: roles.map((r) => ({
      ...r,
      permissionsArray: r.rolePermissions.map((rp) => rp.permission),
      userCount: r._count.userRoles,
      rolePermissions: undefined,
      _count: undefined,
    })),
    permissions: ALL_PERMISSIONS,
  });
}
