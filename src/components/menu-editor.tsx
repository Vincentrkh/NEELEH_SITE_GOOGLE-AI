"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import { dict } from "@/lib/i18n";
import {
  isHeaderMenuLocation,
  type MenuDivision,
  type MenuLocation,
} from "@/lib/menu-defaults";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

export type MenuItemRow = {
  id: string;
  location: MenuLocation | string;
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
  const [division, setDivision] = useState<MenuDivision>("academy");
  const [slot, setSlot] = useState<"header" | "footer">("header");
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Add item form
  const [labelFa, setLabelFa] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [href, setHref] = useState("");
  const [bgColor, setBgColor] = useState("#cbcccd");
  const [kind, setKind] = useState<"block" | "archive">("block");

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFa, setEditFa] = useState("");
  const [editEn, setEditEn] = useState("");
  const [editHref, setEditHref] = useState("");
  const [editBgColor, setEditBgColor] = useState("#cbcccd");
  const [editKind, setEditKind] = useState<"block" | "archive">("block");

  const activeLocation: MenuLocation =
    division === "academy"
      ? slot
      : slot === "header"
        ? "office_header"
        : "office_footer";

  const isHeaderSlot = isHeaderMenuLocation(activeLocation);

  const filtered = items
    .filter((i) => i.location === activeLocation)
    .sort((a, b) => a.order - b.order);

  async function refreshList() {
    const res = await fetch("/api/dashboard/menus", { cache: "no-store" });
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
          location: activeLocation,
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

  function startEdit(item: MenuItemRow) {
    setEditingId(item.id);
    setEditFa(item.labelFa);
    setEditEn(item.labelEn);
    setEditHref(item.href);
    setEditBgColor(item.bgColor || "#cbcccd");
    setEditKind(item.kind === "archive" ? "archive" : "block");
  }

  async function saveEdit(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/menus/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelFa: editFa,
          labelEn: editEn,
          href: editHref,
          ...(isHeaderSlot ? { bgColor: editBgColor, kind: editKind } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: fa ? "خطا" : "Error", description: data.error, variant: "destructive" });
        return;
      }
      setEditingId(null);
      await refreshList();
      toast({ title: fa ? "آیتم ویرایش شد" : "Menu item updated" });
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
      if (editingId === id) setEditingId(null);
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

  async function resetDivisionDefaults() {
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/menus/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division }),
      });
      if (res.ok) {
        setConfirmReset(false);
        setEditingId(null);
        await refreshList();
        toast({
          title: fa
            ? `منوی ${division === "academy" ? "آکادمی نیله" : "دفتر نیله"} بازنشانی شد`
            : `${division === "academy" ? "Neeleh Academy" : "Neeleh Office"} menus reset`,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const academyCount = items.filter((i) => i.location === "header" || i.location === "footer").length;
  const officeCount = items.filter((i) => i.location === "office_header" || i.location === "office_footer").length;

  return (
    <div className="space-y-6">
      {/* Division Switcher + Slot Tabs */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border border-border p-1 bg-background">
            <button
              type="button"
              onClick={() => {
                setDivision("academy");
                setEditingId(null);
                setConfirmReset(false);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded transition-colors ${
                division === "academy"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="size-3.5" aria-hidden />
              <span>{fa ? "آکادمی نیله (Neeleh Academy)" : "Neeleh Academy"}</span>
              <span className="opacity-65 tabular-nums">({academyCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDivision("office");
                setEditingId(null);
                setConfirmReset(false);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded transition-colors ${
                division === "office"
                  ? "bg-[#e41613] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="size-3.5" aria-hidden />
              <span>{fa ? "دفتر نیله (Neeleh Office)" : "Neeleh Office"}</span>
              <span className="opacity-75 tabular-nums">({officeCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {confirmReset ? (
              <div className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs">
                <span className="text-destructive font-medium">
                  {fa
                    ? `بازنشانی منوی ${division === "academy" ? "آکادمی" : "دفتر"}؟`
                    : `Reset ${division === "academy" ? "Academy" : "Office"} defaults?`}
                </span>
                <button
                  type="button"
                  onClick={resetDivisionDefaults}
                  disabled={busy}
                  className="rounded bg-destructive px-2.5 py-1 text-white font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {fa ? "بله، بازنشانی" : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground"
                >
                  {fa ? "لغو" : "Cancel"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                disabled={busy}
                className="inline-flex min-h-[38px] items-center gap-2 border border-border rounded-md px-3.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="size-3.5" />
                {fa ? "بازنشانی پیش‌فرض این بخش" : "Reset section defaults"}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="inline-flex rounded-md border border-border p-1 bg-background">
            {(["header", "footer"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSlot(s);
                  setEditingId(null);
                }}
                className={`px-4 py-1.5 text-xs uppercase tracking-[0.1em] rounded transition-colors ${
                  slot === s
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "header" ? (fa ? "منوی هدر" : "Header menu") : (fa ? "منوی فوتر" : "Footer menu")}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {division === "academy"
              ? slot === "header"
                ? fa
                  ? "در نوار بالای آکادمی نیله و بلوک‌های پلکانی نمایش داده می‌شود."
                  : "Rendered in Neeleh Academy top bar & staircase overlay."
                : fa
                  ? "در ستون دسترسی سریع فوتر آکادمی نیله نمایش داده می‌شود."
                  : "Rendered in Neeleh Academy footer quick links column."
              : slot === "header"
                ? fa
                  ? "در نوار ناوبری بالای دفتر نیله و منوی کشویی موبایل نمایش داده می‌شود."
                  : "Rendered in Neeleh Office top navigation & offcanvas drawer."
                : fa
                  ? "در نوار پایینی فوتر دفتر نیله نمایش داده می‌شود."
                  : "Rendered in Neeleh Office footer bottom link bar."}
          </p>
        </div>
      </div>

      {/* Add item */}
      <form onSubmit={addItem} className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {fa ? "افزودن آیتم جدید به این جایگاه" : "Add menu item to current slot"}
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
            {isHeaderSlot && (
              <>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-9 w-12 rounded border border-border bg-background p-0.5 cursor-pointer"
                  aria-label="Block color"
                />
                {division === "academy" && (
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as "block" | "archive")}
                    className="rounded-md border border-border bg-background px-2 py-2 text-xs"
                  >
                    <option value="block">block</option>
                    <option value="archive">archive</option>
                  </select>
                )}
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
            {fa ? "آیتمی در این جایگاه وجود ندارد." : "No menu items in this location."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((item, idx) => {
              const isEditing = editingId === item.id;
              return (
                <li key={item.id} className="px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isHeaderSlot && (
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
                        onClick={() => (isEditing ? setEditingId(null) : startEdit(item))}
                        className="p-2 text-muted-foreground hover:text-foreground"
                        aria-label={fa ? "ویرایش" : "Edit"}
                      >
                        {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
                      </button>
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
                        {item.isActive ? (
                          <Eye className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <EyeOff className="size-4" />
                        )}
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
                  </div>

                  {isEditing && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-border/60">
                      <input
                        value={editFa}
                        onChange={(e) => setEditFa(e.target.value)}
                        placeholder={fa ? "عنوان فارسی" : "Persian label"}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                      />
                      <input
                        value={editEn}
                        onChange={(e) => setEditEn(e.target.value)}
                        placeholder="English label"
                        dir="ltr"
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                      />
                      <input
                        value={editHref}
                        onChange={(e) => setEditHref(e.target.value)}
                        placeholder="/courses"
                        dir="ltr"
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                      />
                      <div className="flex items-center gap-2">
                        {isHeaderSlot && (
                          <>
                            <input
                              type="color"
                              value={editBgColor}
                              onChange={(e) => setEditBgColor(e.target.value)}
                              className="h-8 w-10 rounded border border-border bg-background p-0.5 cursor-pointer"
                            />
                            {division === "academy" && (
                              <select
                                value={editKind}
                                onChange={(e) =>
                                  setEditKind(e.target.value as "block" | "archive")
                                }
                                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                              >
                                <option value="block">block</option>
                                <option value="archive">archive</option>
                              </select>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          disabled={busy}
                          className="flex-1 inline-flex min-h-[34px] items-center justify-center gap-1 rounded-md bg-foreground text-background px-3 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          <Check className="size-3.5" />
                          {fa ? "ذخیره" : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
