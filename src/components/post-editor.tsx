"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  Plus,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

export type Category = { id: string; name: string; slug: string };
export type Tag = { id: string; name: string; slug: string };

export type PostData = {
  id?: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;
  readingMins: number;
  categoryIds: string[];
  tagIds: string[];
};

const EMPTY: PostData = {
  title: "",
  excerpt: "",
  content: "",
  coverUrl: "",
  status: "DRAFT",
  featured: false,
  readingMins: 0,
  categoryIds: [],
  tagIds: [],
};

export function PostEditor({
  initial,
  categories,
  tags,
}: {
  initial?: PostData;
  categories: Category[];
  tags: Tag[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<PostData>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  const isEdit = !!data.id;

  function update<K extends keyof PostData>(key: K, value: PostData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function toggleCategory(id: string) {
    setData((d) => ({
      ...d,
      categoryIds: d.categoryIds.includes(id)
        ? d.categoryIds.filter((x) => x !== id)
        : [...d.categoryIds, id],
    }));
  }

  function toggleTag(id: string) {
    setData((d) => ({
      ...d,
      tagIds: d.tagIds.includes(id)
        ? d.tagIds.filter((x) => x !== id)
        : [...d.tagIds, id],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.title.trim()) {
      toast({ title: "خطا", description: "عنوان الزامی است", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const url = isEdit ? `/api/dashboard/posts/${data.id}` : "/api/dashboard/posts";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          title: data.title.trim(),
        }),
      });
      const result = (await res.json()) as { error?: string; post?: { id: string } };
      if (!res.ok) {
        toast({ title: "خطا", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: isEdit ? "مقاله به‌روزرسانی شد" : "مقاله ساخته شد",
        description: data.title,
      });
      router.push("/dashboard/posts");
      router.refresh();
    } catch {
      toast({ title: "خطا", description: "ارتباط برقرار نشد", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Header with title + actions */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <input
            type="text"
            value={data.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="عنوان مقاله..."
            required
            className="w-full bg-transparent border-b border-border py-3 text-2xl font-medium outline-none focus:border-foreground transition-colors min-h-[44px]"
          />
          <input
            type="text"
            value={data.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            placeholder="خلاصه کوتاه (برای کارت مقاله)..."
            className="w-full bg-transparent border-b border-border py-2 text-sm text-muted-foreground outline-none focus:border-foreground transition-colors min-h-[44px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <select
            value={data.status}
            onChange={(e) => update("status", e.target.value as PostData["status"])}
            className="bg-card border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
          >
            <option value="DRAFT">پیش‌نویس</option>
            <option value="PUBLISHED">منتشر شده</option>
            <option value="ARCHIVED">بایگانی</option>
          </select>
          <button
            type="button"
            onClick={() => update("featured", !data.featured)}
            className={`flex min-h-[44px] items-center gap-2 px-3 rounded-md border transition-colors ${
              data.featured
                ? "border-foreground bg-secondary"
                : "border-border hover:bg-secondary/40"
            }`}
          >
            <Eye className="size-4" />
            <span className="text-sm flex-1 text-start">
              {data.featured ? "برجسته ✓" : "برجسته؟"}
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Content editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              محتوای مقاله (Markdown)
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
              placeholder={"عنوان با # شروع می‌شود\n\nزیرعنوان با ## \n\nمتن پاراگراف...\n\n- آیتم لیست\n- آیتم دیگر\n\n> نقل قول"}
              className="w-full bg-card border border-border rounded-md p-4 text-sm font-mono outline-none focus:border-foreground transition-colors resize-y min-h-[400px]"
              dir="rtl"
            />
          )}
        </div>

        {/* Sidebar: cover, reading, categories, tags */}
        <div className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
              تصویر کاور (URL)
            </label>
            <input
              type="text"
              value={data.coverUrl}
              onChange={(e) => update("coverUrl", e.target.value)}
              dir="ltr"
              placeholder="/uploads/image.jpg"
              className="w-full bg-transparent border-b border-border py-2 text-sm outline-none focus:border-foreground transition-colors min-h-[44px] text-start"
            />
            {data.coverUrl && (
              <div className="mt-2 h-24 rounded-md overflow-hidden border border-border bg-secondary/40">
                <img src={data.coverUrl} alt="" className="size-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
              زمان مطالعه (دقیقه)
            </label>
            <input
              type="number"
              value={data.readingMins}
              onChange={(e) => update("readingMins", Number(e.target.value) || 0)}
              dir="ltr"
              className="w-full bg-transparent border-b border-border py-2 text-sm tabular-nums outline-none focus:border-foreground transition-colors min-h-[44px]"
            />
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                دسته‌بندی‌ها
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={`flex min-h-[36px] w-full items-center gap-2 px-2 py-1 rounded text-sm transition-colors ${
                      data.categoryIds.includes(c.id)
                        ? "bg-secondary"
                        : "hover:bg-secondary/40"
                    }`}
                  >
                    <span className="size-3 rounded border border-border flex items-center justify-center">
                      {data.categoryIds.includes(c.id) && <span className="size-1.5 bg-foreground rounded-full" />}
                    </span>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                برچسب‌ها
              </label>
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      data.tagIds.includes(t.id)
                        ? "border-foreground bg-secondary"
                        : "border-border hover:bg-secondary/40"
                    }`}
                  >
                    #{t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 sticky bottom-4 z-10 bg-background/80 backdrop-blur py-3 -mx-2 px-2 rounded">
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
          {isEdit ? "ذخیره تغییرات" : "ساخت مقاله"}
        </button>
      </div>
    </form>
  );
}
