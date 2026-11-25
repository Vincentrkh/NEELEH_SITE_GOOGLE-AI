import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/**
 * PATCH /api/dashboard/users/[id] — تغییر نقش‌ها / اطلاعات کاربر
 * DELETE /api/dashboard/users/[id] — حذف کاربر
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await requirePermission("user.update");
  if (!actor) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 },
    );
  }

  let body: {
    name?: string;
    email?: string;
    field?: string;
    education?: string;
    bio?: string;
    roleIds?: string[];
    resetPassword?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: await apiMsg("درخواست نامعتبر است", "Invalid request body") },
      { status: 400 },
    );
  }

  const existing = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      userRoles: {
        select: { role: { select: { id: true, name: true } } },
      },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: await apiMsg("یافت نشد", "Not found") },
      { status: 404 },
    );
  }

  const actorIsAdmin = actor.roles.includes("ADMIN");
  const targetIsAdmin = existing.userRoles.some(
    (ur) => ur.role.name === "ADMIN",
  );

  // جلوگیری از تغییر یا بازنشانی رمز حساب ADMIN توسط کاربران غیر ادمین
  if (targetIsAdmin && !actorIsAdmin) {
    return NextResponse.json(
      {
        error: await apiMsg(
          "فقط مدیر کل می‌تواند حساب‌های مدیر را ویرایش کند",
          "Only ADMIN can modify an ADMIN account",
        ),
      },
      { status: 403 },
    );
  }

  const data: { [k: string]: unknown } = {};
  if (typeof body.name === "string") {
    const trimmed = body.name.trim().slice(0, 120);
    if (!trimmed) {
      return NextResponse.json(
        { error: await apiMsg("نام نمی‌تواند خالی باشد", "Name cannot be empty") },
        { status: 400 },
      );
    }
    data.name = trimmed;
  }
  if (body.email !== undefined) {
    const email = String(body.email ?? "").trim().slice(0, 160);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: await apiMsg("ایمیل نامعتبر است", "Invalid email format") },
        { status: 400 },
      );
    }
    data.email = email || null;
  }
  if (body.field !== undefined) {
    data.field = String(body.field ?? "").trim().slice(0, 120) || null;
  }
  if (body.education !== undefined) {
    data.education = String(body.education ?? "").trim().slice(0, 120) || null;
  }
  if (body.bio !== undefined) {
    data.bio = String(body.bio ?? "").trim().slice(0, 1000) || null;
  }

  let shouldRevokeSessions = false;

  if (body.resetPassword !== undefined && body.resetPassword !== "") {
    if (
      typeof body.resetPassword !== "string" ||
      body.resetPassword.length < 8 ||
      body.resetPassword.length > 128
    ) {
      return NextResponse.json(
        {
          error: await apiMsg(
            "رمز عبور باید بین ۸ تا ۱۲۸ کاراکتر باشد",
            "Password must be between 8 and 128 characters",
          ),
        },
        { status: 400 },
      );
    }
    data.password = hashPassword(body.resetPassword);
    shouldRevokeSessions = true;
  }

  let validatedRoleIds: string[] | undefined;
  if (body.roleIds !== undefined) {
    if (!Array.isArray(body.roleIds)) {
      return NextResponse.json(
        { error: await apiMsg("نقش‌ها نامعتبر هستند", "Invalid roleIds") },
        { status: 400 },
      );
    }
    const uniqueRoleIds = Array.from(
      new Set(body.roleIds.filter((r): r is string => typeof r === "string" && r.length > 0)),
    );
    const matchedRoles = uniqueRoleIds.length
      ? await db.role.findMany({
          where: { id: { in: uniqueRoleIds } },
          select: { id: true, name: true },
        })
      : [];
    if (matchedRoles.length !== uniqueRoleIds.length) {
      return NextResponse.json(
        { error: await apiMsg("یک یا چند نقش نامعتبر است", "One or more roles not found") },
        { status: 400 },
      );
    }
    const assignsAdmin = matchedRoles.some((r) => r.name === "ADMIN");
    if ((assignsAdmin || targetIsAdmin) && !actorIsAdmin) {
      return NextResponse.json(
        {
          error: await apiMsg(
            "فقط مدیر کل می‌تواند نقش ADMIN را اعطا یا لغو کند",
            "Only ADMIN can assign or revoke ADMIN role",
          ),
        },
        { status: 403 },
      );
    }
    // جلوگیری از حذف نقش ADMIN از خود ادمین
    if (actor.id === id && targetIsAdmin && !assignsAdmin) {
      return NextResponse.json(
        {
          error: await apiMsg(
            "نمی‌توانید نقش ADMIN خود را حذف کنید",
            "Cannot remove your own ADMIN role",
          ),
        },
        { status: 400 },
      );
    }
    validatedRoleIds = uniqueRoleIds;
    shouldRevokeSessions = true;
  }

  const updated = await db.user.update({
    where: { id },
    data,
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
    },
  });

  if (validatedRoleIds !== undefined) {
    await db.userRole.deleteMany({ where: { userId: id } });
    if (validatedRoleIds.length > 0) {
      await db.userRole.createMany({
        data: validatedRoleIds.map((rid) => ({ userId: id, roleId: rid })),
      });
    }
  }

  if (shouldRevokeSessions) {
    await db.session.deleteMany({ where: { userId: id } });
  }

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await requirePermission("user.delete");
  if (!actor) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 },
    );
  }

  // جلوگیری از حذف خود
  if (actor.id === id) {
    return NextResponse.json(
      {
        error: await apiMsg(
          "نمی‌توانید حساب خود را حذف کنید",
          "You cannot delete your own account",
        ),
      },
      { status: 400 },
    );
  }

  const target = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      userRoles: { select: { role: { select: { name: true } } } },
    },
  });
  if (!target) {
    return NextResponse.json(
      { error: await apiMsg("یافت نشد", "Not found") },
      { status: 404 },
    );
  }

  const targetIsAdmin = target.userRoles.some((ur) => ur.role.name === "ADMIN");
  if (targetIsAdmin && !actor.roles.includes("ADMIN")) {
    return NextResponse.json(
      {
        error: await apiMsg(
          "فقط مدیر کل می‌تواند حساب ADMIN را حذف کند",
          "Only ADMIN can delete an ADMIN account",
        ),
      },
      { status: 403 },
    );
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
