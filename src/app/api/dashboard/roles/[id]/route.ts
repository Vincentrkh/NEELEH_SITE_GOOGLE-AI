import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/**
 * PATCH /api/dashboard/roles/[id] — تغییر برچسب/توضیح/مجوزها
 * DELETE /api/dashboard/roles/[id] — حذف (فقط نقش‌های غیر سیستمی)
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("role.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  let body: {
    label?: string;
    description?: string;
    permissionIds?: string[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: await apiMsg("درخواست نامعتبر است", "Invalid request body") }, { status: 400 });
  }

  const existing = await db.role.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });

  if (existing.isSystem && !user.roles.includes("ADMIN")) {
    return NextResponse.json(
      { error: await apiMsg("فقط مدیر کل می‌تواند نقش‌های سیستمی را ویرایش کند", "Only ADMIN can edit system roles") },
      { status: 403 }
    );
  }

  if (existing.name === "ADMIN" && body.permissionIds !== undefined) {
    return NextResponse.json(
      { error: await apiMsg("مجوزهای نقش ADMIN قابل تغییر نیست", "ADMIN role permissions cannot be modified") },
      { status: 400 }
    );
  }

  let validatedPermissionIds: string[] | undefined;
  if (body.permissionIds !== undefined) {
    if (!Array.isArray(body.permissionIds)) {
      return NextResponse.json({ error: await apiMsg("مجوزها نامعتبر هستند", "Invalid permissionIds") }, { status: 400 });
    }
    const uniqueIds = Array.from(
      new Set(body.permissionIds.filter((p): p is string => typeof p === "string" && p.length > 0))
    );
    if (uniqueIds.length > 0) {
      const foundCount = await db.permission.count({ where: { id: { in: uniqueIds } } });
      if (foundCount !== uniqueIds.length) {
        return NextResponse.json({ error: await apiMsg("یک یا چند مجوز یافت نشد", "Invalid permission ID") }, { status: 400 });
      }
    }
    validatedPermissionIds = uniqueIds;
  }

  const data: { [k: string]: unknown } = {};
  if (typeof body.label === "string") {
    const label = body.label.trim().slice(0, 80);
    if (!label) {
      return NextResponse.json({ error: await apiMsg("برچسب نمی‌تواند خالی باشد", "Label cannot be empty") }, { status: 400 });
    }
    data.label = label;
  }
  if (body.description !== undefined) {
    data.description = String(body.description ?? "").trim().slice(0, 300);
  }

  const updated = await db.role.update({ where: { id }, data });

  // بازنویسی مجوزها
  if (validatedPermissionIds !== undefined) {
    await db.rolePermission.deleteMany({ where: { roleId: id } });
    if (validatedPermissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: validatedPermissionIds.map((pid) => ({ roleId: id, permissionId: pid })),
      });
    }
  }

  return NextResponse.json({ role: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("role.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const existing = await db.role.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });
  if (existing.isSystem) {
    return NextResponse.json(
      { error: await apiMsg("نقش‌های سیستمی قابل حذف نیستند", "System roles cannot be deleted") },
      { status: 400 }
    );
  }

  try {
    await db.role.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: await apiMsg("حذف نشد — ممکن است کاربری این نقش را داشته باشد", "Delete failed — a user may be assigned this role") }, { status: 400 });
  }
}
