"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";

export type PageData = {
  id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: "DRAFT" | "PUBLISHED";
  showInMenu: boolean;
  sortOrder: number;
};

const EMPTY: PageData = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  status: "DRAFT",
  showInMenu: false,
  sortOrder: 0,
};

export function PageEditor({ initial }: { initial?: PageData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<PageData>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const isEdit = !!data.id;

  function update<K extends keyof PageData>(key: K, value: PageData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.title.trim()) {
      toast({ title: "خطا", description: "عنوان الزامی است", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const url = isEdit ? `/api/dashboard/pages/${data.id}` : "/api/dashboard/pages";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, title: data.title.trim() }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "خطا", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "صفحه به‌روزرسانی شد" : "صفحه ساخته شد" });
      router.push("/dashboard/pages");
      router.refresh();
    } catch {
      toast({ title: "خطا", description: "ارتباط برقرار نشد", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <input
            type="text"
            value={data.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="عنوان صفحه..."
            required
            className="w-full bg-transparent border-b border-border py-3 text-2xl font-medium outline-none focus:border-foreground transition-colors min-h-[44px]"
          />
          <input
            type="text"
            value={data.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="slug (اختیاری — خودکار از عنوان)"
            dir="ltr"
            className="w-full bg-transparent border-b border-border py-2 text-sm text-muted-foreground outline-none focus:border-foreground transition-colors min-h-[44px] text-start"
          />
          <input
            type="text"
            value={data.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            placeholder="خلاصه کوتاه (اختیاری)..."
            className="w-full bg-transparent border-b border-border py-2 text-sm text-muted-foreground outline-none focus:border-foreground transition-colors min-h-[44px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <select
            value={data.status}
            onChange={(e) => update("status", e.target.value as PageData["status"])}
            className="bg-card border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
          >
            <option value="DRAFT">پیش‌نویس</option>
            <option value="PUBLISHED">منتشر شده</option>
          </select>
          <button
            type="button"
            onClick={() => update("showInMenu", !data.showInMenu)}
            className={`flex min-h-[44px] items-center gap-2 px-3 rounded-md border transition-colors ${
              data.showInMenu
                ? "border-foreground bg-secondary"
                : "border-border hover:bg-secondary/40"
            }`}
          >
            {data.showInMenu ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            <span className="text-sm flex-1 text-start">
              {data.showInMenu ? "در منو ✓" : "نمایش در منو؟"}
            </span>
          </button>
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              ترتیب
            </label>
            <input
              type="number"
              value={data.sortOrder}
              onChange={(e) => update("sortOrder", Number(e.target.value) || 0)}
              dir="ltr"
              className="w-full bg-transparent border-b border-border py-2 text-sm tabular-nums outline-none focus:border-foreground transition-colors min-h-[44px]"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            محتوای صفحه (Markdown)
          </label>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="flex min-h-[36px] items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {preview ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            {preview ? "ویرایش" : "پیش‌نمایش"}
          </button>
        </div>
        {preview ? (
          <div className="min-h-[400px] rounded-md border border-border bg-card p-4 prose prose-sm max-w-none">
            {data.content.split("\n\n").map((p, i) => {
              const t = p.trim();
              if (!t) return null;
              if (t.startsWith("## ")) return <h2 key={i} className="text-xl font-medium mt-6 mb-3">{t.slice(3)}</h2>;
              if (t.startsWith("# ")) return <h1 key={i} className="text-2xl font-medium mt-6 mb-3">{t.slice(2)}</h1>;
              if (t.startsWith("> ")) return <blockquote key={i} className="border-e-4 border-foreground/30 ps-4 italic text-muted-foreground my-4">{t.slice(2)}</blockquote>;
              if (t.startsWith("- ") || t.startsWith("* ")) {
                const items = t.split("\n").filter((l) => l.startsWith("- ") || l.startsWith("* "));
                return <ul key={i} className="list-disc ps-5 my-4 space-y-1">{items.map((it, j) => <li key={j} className="text-sm leading-7">{it.slice(2)}</li>)}</ul>;
              }
              return <p key={i} className="text-sm leading-7 mb-3">{t}</p>;
            })}
            {!data.content && <p className="text-muted-foreground text-sm">محتوایی برای پیش‌نمایش نیست.</p>}
          </div>
        ) : (
          <textarea
            value={data.content}
            onChange={(e) => update("content", e.target.value)}
            rows={20}
            placeholder={"# عنوان بخش\n\nمتن پاراگراف...\n\n- آیتم لیست"}
            className="w-full bg-card border border-border rounded-md p-4 text-sm font-mono outline-none focus:border-foreground transition-colors resize-y min-h-[400px]"
            dir="rtl"
          />
        )}
      </div>

      <div className="flex items-center justify-end gap-3 sticky bottom-4 z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex min-h-[44px] items-center px-5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          انصراف
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-[48px] items-center gap-2 bg-foreground text-background rounded-md px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isEdit ? "ذخیره تغییرات" : "ساخت صفحه"}
        </button>
      </div>
    </form>
  );
}
