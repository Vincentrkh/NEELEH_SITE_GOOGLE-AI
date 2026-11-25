import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/backup
 * Admin-only endpoint that creates a fresh portable full-project ZIP backup
 * (excluding node_modules, .next, .env, and .session_secret) and streams it for download.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: await apiMsg("فقط مدیر کل امکان دریافت بکاپ کامل را دارد", "Admin access required") },
      { status: 403 },
    );
  }

  const root = process.cwd();
  const scriptPath = path.join(root, "scripts", "create-backup-zip.py");
  const backupDir = path.join(os.tmpdir(), "neeleh-backups");
  const dateStamp = new Date().toISOString().slice(0, 10);
  const zipFilename = `neeleh-academy-backup-${dateStamp}.zip`;
  const zipPath = path.join(backupDir, `neeleh-academy-backup-${Date.now()}.zip`);

  const cleanup = () => {
    void fs.promises.unlink(zipPath).catch(() => {});
  };

  try {
    await fs.promises.mkdir(backupDir, { recursive: true });
    await execFileAsync("/usr/bin/python3", [scriptPath, zipPath], {
      cwd: root,
      timeout: 120_000,
    });

    const stat = await fs.promises.stat(zipPath);
    const nodeStream = fs.createReadStream(zipPath);
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => controller.enqueue(chunk));
        nodeStream.on("end", () => {
          controller.close();
          cleanup();
        });
        nodeStream.on("error", (err) => {
          controller.error(err);
          cleanup();
        });
      },
      cancel() {
        nodeStream.destroy();
        cleanup();
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (err) {
    console.error("full backup zip error:", err);
    return NextResponse.json(
      { error: await apiMsg("خطا در ساخت فایل بکاپ", "Failed to build backup archive") },
      { status: 500 },
    );
  }
}
