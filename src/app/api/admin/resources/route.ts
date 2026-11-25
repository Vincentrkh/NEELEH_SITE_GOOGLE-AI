import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import { sanitizeSvgMarkup } from "@/lib/brand-logo";
import { sanitizeSafeHref } from "@/lib/security";

const MAX_SIZE = 15 * 1024 * 1024; // ۱۵ مگابایت

const ALLOWED_EXTS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg",
  "pdf", "zip", "rar", "mp4", "webm", "mp3",
  "txt", "md", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "json", "gh", "3dm", "dwg", "rvt",
]);

/** افزودن فایل/منبع برای دوره (ادمین) — آپلود ایمن فایل یا لینک معتبر */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const form = await req.formData();
  const courseId = String(form.get("courseId") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const kind = String(form.get("kind") ?? "HANDOUT");
  const externalUrl = String(form.get("url") ?? "").trim();
  const file = form.get("file");

  if (!courseId || !title) {
    return NextResponse.json({ error: await apiMsg("دوره و عنوان الزامی است", "Course and title are required") }, { status: 400 });
  }
  if (!["EXERCISE", "PROJECT", "HANDOUT"].includes(kind)) {
    return NextResponse.json({ error: await apiMsg("نوع فایل نامعتبر است", "Invalid file type") }, { status: 400 });
  }

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: await apiMsg("دوره یافت نشد", "Course not found") }, { status: 404 });

  let url = sanitizeSafeHref(externalUrl);

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: await apiMsg("حجم فایل باید کمتر از ۱۵ مگابایت باشد", "File must be smaller than 15 MB") },
        { status: 400 }
      );
    }

    const rawName = (file.name || "resource").trim();
    const rawExt = rawName.includes(".") ? rawName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const isSvg = file.type === "image/svg+xml" || rawExt === "svg";

    if (!isSvg && (!rawExt || !ALLOWED_EXTS.has(rawExt))) {
      return NextResponse.json(
        { error: await apiMsg("فرمت یا پسوند فایل مجاز نیست", "File extension is not allowed") },
        { status: 400 }
      );
    }

    let buffer: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());
    let ext = rawExt;
    if (isSvg) {
      const cleanedSvg = sanitizeSvgMarkup(buffer.toString("utf8"));
      if (!cleanedSvg) {
        return NextResponse.json(
          { error: await apiMsg("فایل SVG معتبر نیست", "Invalid SVG file") },
          { status: 400 }
        );
      }
      buffer = Buffer.from(`<?xml version="1.0" encoding="utf-8"?>\n${cleanedSvg}`, "utf8");
      ext = "svg";
    }

    const filename = `${Date.now()}-${randomBytes(3).toString("hex")}.${ext}`;
    const dir = path.resolve(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.resolve(dir, filename), buffer);
    url = `/uploads/${filename}`;
  }

  if (!url) {
    return NextResponse.json(
      { error: await apiMsg("یک فایل معتبر انتخاب کنید یا لینک امن وارد کنید", "Choose an allowed file or enter a safe link") },
      { status: 400 }
    );
  }

  const resource = await db.courseResource.create({
    data: { courseId, title, kind, url },
  });

  return NextResponse.json({ ok: true, resource });
}
