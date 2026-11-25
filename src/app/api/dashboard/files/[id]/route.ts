import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";
import { apiMsg } from "@/lib/i18n";

/** DELETE /api/dashboard/files/[id] — حذف فایل (از دیسک و دیتابیس) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("file.delete");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const file = await db.fileAsset.findUnique({
    where: { id },
    include: { _count: { select: { resources: true } } },
  });
  if (!file) return NextResponse.json({ error: await apiMsg("فایل یافت نشد", "File not found") }, { status: 404 });

  // اگر فایل در حال استفاده در منابع دوره است، مانع حذف می‌شویم
  if (file._count.resources > 0) {
    return NextResponse.json(
      { error: await apiMsg(`این فایل در ${file._count.resources} منبع دوره در حال استفاده است. ابتدا منابع را حذف کنید.`, `This file is used by ${file._count.resources} course resources. Remove them first.`) },
      { status: 409 }
    );
  }

  // حذف از دیسک با کنترل مرز دایرکتوری آپلود
  try {
    const uploadRoot = path.resolve(process.cwd(), "public", "uploads");
    const rel = String(file.path || "").replace(/^\/+/, "");
    const resolved = path.resolve(process.cwd(), "public", rel);
    if (resolved.startsWith(uploadRoot + path.sep)) {
      await unlink(resolved);
    }
  } catch {
    // اگر فایل فیزیکی وجود نداشت، فقط از دیتابیس حذف می‌کنیم
  }

  await db.fileAsset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
