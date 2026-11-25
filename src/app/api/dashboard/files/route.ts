import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { apiMsg } from "@/lib/i18n";
import { sanitizeSvgMarkup } from "@/lib/brand-logo";

/**
 * GET /api/dashboard/files — لیست فایل‌های آپلودشده
 * POST /api/dashboard/files — آپلود فایل جدید (multipart/form-data)
 *
 * فایل‌ها در /public/uploads ذخیره می‌شوند تا مستقیم قابل دسترس باشند.
 * نام فایل برای جلوگیری از تداخل: <timestamp>-<random>.<ext>
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE = 50 * 1024 * 1024; // ۵۰ مگابایت

const ALLOWED_MIME = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/zip", "application/x-zip-compressed",
  "application/x-rar-compressed",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/mp3",
  "text/plain", "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/json",
  "application/octet-stream", // برای فایل‌های بدون نوع مشخص (مثل .gh، .3dm)
];

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/json": "json",
  "application/octet-stream": "bin",
};

export async function GET() {
  const user = await requirePermission("file.upload");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const files = await db.fileAsset.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      uploader: { select: { name: true } },
      _count: { select: { resources: true } },
    },
  });

  return NextResponse.json({
    files: files.map((f) => ({
      ...f,
      uploaderName: f.uploader?.name ?? null,
      usedCount: f._count.resources,
      _count: undefined,
      uploader: undefined,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await requirePermission("file.upload");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: await apiMsg("فایلی ارسال نشده است", "No file was sent") }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: await apiMsg(`حجم فایل نباید بیش از ${MAX_SIZE / 1024 / 1024} مگابایت باشد`, `File must be smaller than ${MAX_SIZE / 1024 / 1024} MB`) },
        { status: 400 }
      );
    }

    const rawName = (file.name || "file").trim();
    const rawExt = rawName.includes(".") ? rawName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const isSvg = file.type === "image/svg+xml" || rawExt === "svg";

    const ALLOWED_EXTS = new Set([
      "jpg", "jpeg", "png", "gif", "webp", "svg",
      "pdf", "zip", "rar", "mp4", "webm", "mp3",
      "txt", "md", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
      "json", "gh", "3dm", "dwg", "rvt", "bin",
    ]);

    if (!isSvg && file.type !== "" && !ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: await apiMsg("فرمت این فایل مجاز نیست", "This file type is not allowed") },
        { status: 400 },
      );
    }

    if (!isSvg && (!rawExt || !ALLOWED_EXTS.has(rawExt))) {
      return NextResponse.json(
        { error: await apiMsg("پسوند فایل مجاز نیست", "File extension is not allowed") },
        { status: 400 },
      );
    }

    // اطمینان از وجود دایرکتوری
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(bytes);
    let finalSize = file.size;
    let finalMime = file.type || "application/octet-stream";
    let ext = (file.type && EXT_BY_MIME[file.type]) || (ALLOWED_EXTS.has(rawExt) ? rawExt : "bin");

    if (isSvg) {
      const cleanedSvg = sanitizeSvgMarkup(buffer.toString("utf8"));
      if (!cleanedSvg) {
        return NextResponse.json(
          { error: await apiMsg("فایل SVG معتبر نیست (تگ <svg> یافت نشد)", "Invalid SVG file (<svg> tag not found)") },
          { status: 400 },
        );
      }
      buffer = Buffer.from(`<?xml version="1.0" encoding="utf-8"?>\n${cleanedSvg}`, "utf8");
      finalSize = buffer.byteLength;
      finalMime = "image/svg+xml";
      ext = "svg";
    }

    const random = randomBytes(3).toString("hex");
    const storedName = `${Date.now()}-${random}.${ext}`;
    const resolvedUploadRoot = path.resolve(UPLOAD_DIR);
    const filePath = path.resolve(resolvedUploadRoot, storedName);
    if (!filePath.startsWith(resolvedUploadRoot + path.sep)) {
      return NextResponse.json({ error: await apiMsg("مسیر نامعتبر", "Invalid path") }, { status: 400 });
    }

    await writeFile(filePath, buffer);

    // URL عمومی
    const url = `/uploads/${storedName}`;

    // ذخیره در دیتابیس
    const fileAsset = await db.fileAsset.create({
      data: {
        filename: rawName,
        storedName,
        mimeType: finalMime,
        size: finalSize,
        path: `/uploads/${storedName}`,
        url,
        uploaderId: user.id,
      },
    });

    return NextResponse.json({ file: fileAsset });
  } catch (e) {
    console.error("file upload error", e);
    return NextResponse.json({ error: await apiMsg("خطا در آپلود فایل", "File upload failed") }, { status: 500 });
  }
}
