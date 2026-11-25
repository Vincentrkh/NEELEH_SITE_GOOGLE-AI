"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import { dict } from "@/lib/i18n";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

export type MenuItemRow = {
  id: string;
  location: "header" | "footer" | string;
  labelFa: string;
  labelEn: string;
  href: string;
  bgColor: string;
  kind: string;
  fillIndicator: boolean;
  order: number;
  isActive: boolean;
};

export function MenuEditor({ initialItems }: { initialItems: MenuItemRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { lang } = useLang();
  const t = dict[lang].dashboard;
  const fa = lang === "fa";

  const [items, setItems] = useState<MenuItemRow[]>(initialItems);
  const [location, setLocation] = useState<"header" | "footer">("header");
  const [busy, setBusy] = useState(false);

  const [labelFa, setLabelFa] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [href, setHref] = useState("");
  const [bgColor, setBgColor] = useState("#cbcccd");
  const [kind, setKind] = useState<"block" | "archive">("block");

  const filtered = items
    .filter((i) => i.location === location)
    .sort((a, b) => a.order - b.order);

  async function refreshList() {
    const res = await fetch("/api/dashboard/menus");
    if (res.ok) {
      const data = (await res.json()) as { items: MenuItemRow[] };
      setItems(data.items);
    }
    router.refresh();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          labelFa,
          labelEn,
          href,
          bgColor,
          kind,
        }),
      });
      const data = (await res.json()) as { item?: MenuItemRow; error?: string };
      if (!res.ok) {
        toast({ title: fa ? "خطا" : "Error", description: data.error, variant: "destructive" });
        return;
      }
      setLabelFa("");
      setLabelEn("");
      setHref("");
      await refreshList();
      toast({ title: fa ? "آیتم اضافه شد" : "Menu item added" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: MenuItemRow) {
    const res = await fetch(`/api/dashboard/menus/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    if (res.ok) await refreshList();
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/dashboard/menus/${id}`, { method: "DELETE" });
    if (res.ok) {
      await refreshList();
      toast({ title: fa ? "آیتم حذف شد" : "Item deleted" });
    }
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= filtered.length) return;
    const reordered = [...filtered];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    const ids = reordered.map((x) => x.id);
    const res = await fetch("/api/dashboard/menus", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) await refreshList();
  }

  async function resetDefaults() {
    if (!confirm(fa ? "منوها به حالت پیش‌فرض بازگردانی شوند؟" : "Reset menus to default?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/menus/reset", { method: "POST" });
      if (res.ok) {
        await refreshList();
        toast({ title: fa ? "بازنشانی شد" : "Menus reset to default" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border p-1 bg-card">
          {(["header", "footer"] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocation(loc)}
              className={`px-4 py-2 text-xs uppercase tracking-[0.12em] rounded transition-colors ${
                location === loc
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {loc === "header" ? (fa ? "منوی هدر" : "Header menu") : (fa ? "منوی فوتر" : "Footer menu")}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={resetDefaults}
          disabled={busy}
          className="inline-flex min-h-[40px] items-center gap-2 border border-border rounded-md px-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="size-3.5" />
          {fa ? "بازنشانی پیش‌فرض" : "Reset defaults"}
        </button>
      </div>

      {/* Add item */}
      <form onSubmit={addItem} className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {fa ? "افزودن آیتم جدید" : "Add menu item"}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            value={labelFa}
            onChange={(e) => setLabelFa(e.target.value)}
            placeholder={fa ? "عنوان فارسی" : "Persian label"}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
            placeholder="English label"
            dir="ltr"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="/courses or #work"
            dir="ltr"
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            {location === "header" && (
              <>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-9 w-12 rounded border border-border bg-background p-0.5 cursor-pointer"
                  aria-label="Block color"
                />
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as "block" | "archive")}
                  className="rounded-md border border-border bg-background px-2 py-2 text-xs"
                >
                  <option value="block">block</option>
                  <option value="archive">archive</option>
                </select>
              </>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-md bg-foreground text-background px-3 text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              {fa ? "افزودن" : "Add"}
            </button>
          </div>
        </div>
      </form>

      {/* Items table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {fa ? "آیتمی وجود ندارد." : "No menu items in this location."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((item, idx) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  {location === "header" && (
                    <span
                      className="size-4 rounded border border-border shrink-0"
                      style={{ backgroundColor: item.bgColor }}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {fa ? item.labelFa : item.labelEn}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({fa ? item.labelEn : item.labelFa})
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {item.href}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === filtered.length - 1}
                    className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(item)}
                    className="p-2 text-muted-foreground hover:text-foreground"
                    aria-label={t.menusColVisible}
                  >
                    {item.isActive ? <Eye className="size-4 text-emerald-600" /> : <EyeOff className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    className="p-2 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
