"use client";

import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { faDateTime, formatFileSize } from "@/lib/format";
import {
  Upload,
  File as FileIcon,
  Image as ImageIcon,
  FileText,
  FileArchive,
  Film,
  Music,
  Trash2,
  Loader2,
  Copy,
  Check,
  X,
} from "lucide-react";

type FileAsset = {
  id: string;
  filename: string;
  storedName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  uploaderName: string | null;
  usedCount: number;
};

function iconForMime(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Film;
  if (mime.startsWith("audio/")) return Music;
  if (mime === "application/pdf") return FileText;
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("compressed")) return FileArchive;
  if (mime.includes("word") || mime.includes("document")) return FileText;
  if (mime.includes("sheet") || mime.includes("excel")) return FileText;
  return FileIcon;
}

export function FilesManager({
  initialFiles,
  canDelete,
}: {
  initialFiles: FileAsset[];
  canDelete: boolean;
}) {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileAsset[]>(initialFiles);
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/dashboard/files", { method: "POST", body: fd });
        const data = (await res.json()) as { error?: string; file?: FileAsset };
        if (!res.ok) {
          toast({ title: "آپلود نشد", description: data.error, variant: "destructive" });
          return;
        }
        if (data.file) {
          setFiles((list) => [
            { ...data.file!, uploaderName: null, usedCount: 0 },
            ...list,
          ]);
          toast({ title: "فایل آپلود شد", description: file.name });
        }
      } catch {
        toast({ title: "خطا", description: "ارتباط برقرار نشد", variant: "destructive" });
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(uploadFile);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    items.forEach((item) => {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) uploadFile(file);
      }
    });
  };

  async function deleteFile(id: string) {
    if (!confirm("این فایل حذف شود؟")) return;
    setDeleteBusy(id);
    try {
      const res = await fetch(`/api/dashboard/files/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "حذف نشد", description: data.error, variant: "destructive" });
        return;
      }
      setFiles((list) => list.filter((f) => f.id !== id));
      toast({ title: "حذف شد" });
    } finally {
      setDeleteBusy(null);
    }
  }

  async function copyUrl(url: string, id: string) {
    const fullUrl = `${window.location.origin}${url}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "کپی نشد", variant: "destructive" });
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-6" onPaste={onPaste} tabIndex={0}>
      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-foreground bg-secondary"
            : "border-border hover:border-foreground/50 hover:bg-secondary/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={onInputChange}
          className="hidden"
        />
        {busy ? (
          <Loader2 className="size-8 mx-auto animate-spin text-muted-foreground mb-3" />
        ) : (
          <Upload className="size-8 mx-auto text-muted-foreground mb-3" />
        )}
        <p className="text-sm font-medium">
          {busy ? "در حال آپلود..." : "فایل‌ها را اینجا رها کنید یا کلیک کنید"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          حداکثر ۵۰ مگابایت — تصویر، PDF، ZIP، ویدیو، صدا، اسناد آفیس
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          یا Ctrl+V برای جای‌گذاری از کلیپ‌بورد
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{files.length} فایل</span>
        <span>مجموع حجم: {formatFileSize(totalSize)}</span>
      </div>

      {/* Files grid */}
      {files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <FileIcon className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            هنوز فایلی آپلود نشده است.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {files.map((f) => {
            const Icon = iconForMime(f.mimeType);
            const isImage = f.mimeType.startsWith("image/");
            return (
              <div
                key={f.id}
                className="rounded-lg border border-border bg-card overflow-hidden hover:border-foreground/30 transition-colors"
              >
                {/* Preview */}
                <div className="h-32 bg-secondary/40 relative overflow-hidden">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.url}
                      alt={f.filename}
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="size-10 text-muted-foreground" />
                    </div>
                  )}
                  {f.usedCount > 0 && (
                    <span className="absolute top-2 end-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                      {f.usedCount} استفاده
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="text-sm font-medium truncate" title={f.filename}>
                    {f.filename}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                    <span>{formatFileSize(f.size)}</span>
                    <span>{faDateTime(f.createdAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-1">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-xs hover:bg-secondary transition-colors"
                    >
                      <FileIcon className="size-3" />
                      باز کردن
                    </a>
                    <button
                      type="button"
                      onClick={() => copyUrl(f.url, f.id)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="کپی URL"
                    >
                      {copiedId === f.id ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteFile(f.id)}
                        disabled={deleteBusy === f.id}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-destructive hover:bg-destructive/5 rounded-md transition-colors disabled:opacity-50"
                        aria-label="حذف فایل"
                      >
                        {deleteBusy === f.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
