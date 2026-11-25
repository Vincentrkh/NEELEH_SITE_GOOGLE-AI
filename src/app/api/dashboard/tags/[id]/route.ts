import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";

/**
 * /api/dashboard/tags/[id]
 *
 * PATCH   ویرایش برچسب — مجوز: post.update
 * DELETE  حذف برچسب (اگر به نوشته‌ای وصل نباشد) — مجوز: post.delete
 */

type PatchBody = { name?: string; slug?: string };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePermission("post.update");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const { id } = await params;
  try {
    const body = (await req.json()) as PatchBody;
    const data: { name?: string; slug?: string } = {};
    if (body.name !== undefined) {
      if (!body.name.trim()) return NextResponse.json({ error: await apiMsg("نام برچسب نمی‌تواند خالی باشد", "Tag name cannot be empty") }, { status: 400 });
      data.name = body.name.trim();
    }
    if (body.slug !== undefined) {
      const slug = slugify(body.slug);
      if (!slug) return NextResponse.json({ error: await apiMsg("شناسه نامعتبر است", "Invalid id") }, { status: 400 });
      const clash = await db.tag.findFirst({ where: { slug, NOT: { id } } });
      if (clash) return NextResponse.json({ error: await apiMsg("این شناسه قبلاً استفاده شده است", "This identifier is already in use") }, { status: 409 });
      data.slug = slug;
    }

    const updated = await db.tag.update({ where: { id }, data });
    return NextResponse.json({ tag: updated });
  } catch {
    return NextResponse.json({ error: await apiMsg("برچسب پیدا نشد یا درخواست نامعتبر است", "Tag not found or invalid request") }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePermission("post.delete");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const { id } = await params;
  const linked = await db.postTag.count({ where: { tagId: id } });
  if (linked > 0) {
    return NextResponse.json(
      { error: await apiMsg(`این برچسب به ${linked} نوشته وصل است؛ اول از نوشته‌ها جدا کنید`, `This tag is linked to ${linked} posts — detach it from the posts first`) },
      { status: 409 }
    );
  }
  try {
    await db.tag.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: await apiMsg("برچسب پیدا نشد", "Tag not found") }, { status: 404 });
  }
}
