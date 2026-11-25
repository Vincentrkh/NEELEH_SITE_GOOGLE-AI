"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Save, X } from "lucide-react";

/**
 * ویرایشگر دوره — فرم کامل برای ساخت/ویرایش دوره.
 *
 * فیلدها: عنوان، سطح، دسته، توضیح، درباره، تگ‌ها، خروجی‌ها، پیش‌نیازها،
 * مدت، قیمت، ظرفیت، وضعیت ثبت‌نام، بنر، برجسته، انتشار، sortOrder.
 * + سرفصل‌ها (آکاردئون، چندتایی، ترتیب قابل تغییر).
 */

export type Section = {
  id?: string;
  title: string;
  items: string[];
};

export type CourseData = {
  id?: string;
  title: string;
  tier: "BEGINNER" | "INTERMEDIATE" | "PRO";
  category: string;
  description: string;
  about: string;
  tags: string[];
  outputs: string[];
  prereqs: string;
  durationHrs: number;
  price: number;
  capacity: number;
  regStatus: "OPEN" | "FULL" | "CLOSED";
  featured: boolean;
  published: boolean;
  bannerUrl: string;
  sortOrder: number;
  sections: Section[];
};

const EMPTY_COURSE: CourseData = {
  title: "",
  tier: "BEGINNER",
  category: "",
  description: "",
  about: "",
  tags: [],
  outputs: [],
  prereqs: "",
  durationHrs: 0,
  price: 0,
  capacity: 12,
  regStatus: "OPEN",
  featured: false,
  published: true,
  bannerUrl: "",
  sortOrder: 0,
  sections: [{ title: "", items: [""] }],
};

export function CourseEditor({ initial }: { initial?: CourseData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<CourseData>(initial ?? EMPTY_COURSE);
  const [busy, setBusy] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [openSection, setOpenSection] = useState<number | null>(0);

  const isEdit = !!data.id;

  function update<K extends keyof CourseData>(key: K, value: CourseData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  // ── Tags ──
  function addTag() {
    const t = tagInput.trim();
    if (!t || data.tags.includes(t)) return;
    update("tags", [...data.tags, t]);
    setTagInput("");
  }
  function removeTag(t: string) {
    update("tags", data.tags.filter((x) => x !== t));
  }

  // ── Outputs (multiline) ──
  function addOutput() {
    update("outputs", [...data.outputs, ""]);
  }
  function updateOutput(i: number, v: string) {
    const next = [...data.outputs];
    next[i] = v;
    update("outputs", next);
  }
  function removeOutput(i: number) {
    update("outputs", data.outputs.filter((_, j) => j !== i));
  }

  // ── Sections ──
  function addSection() {
    update("sections", [...data.sections, { title: "", items: [""] }]);
    setOpenSection(data.sections.length);
  }
  function updateSectionTitle(i: number, title: string) {
    const next = [...data.sections];
    next[i] = { ...next[i], title };
    update("sections", next);
  }
  function addSectionItem(si: number) {
    const next = [...data.sections];
    next[si] = { ...next[si], items: [...next[si].items, ""] };
    update("sections", next);
  }
  function updateSectionItem(si: number, ii: number, v: string) {
    const next = [...data.sections];
    const items = [...next[si].items];
    items[ii] = v;
    next[si] = { ...next[si], items };
    update("sections", next);
  }
  function removeSectionItem(si: number, ii: number) {
    const next = [...data.sections];
    next[si] = { ...next[si], items: next[si].items.filter((_, j) => j !== ii) };
    update("sections", next);
  }
  function removeSection(si: number) {
    update("sections", data.sections.filter((_, j) => j !== si));
    if (openSection === si) setOpenSection(null);
  }
  function moveSection(si: number, dir: -1 | 1) {
    const target = si + dir;
    if (target < 0 || target >= data.sections.length) return;
    const next = [...data.sections];
    [next[si], next[target]] = [next[target], next[si]];
    update("sections", next);
    setOpenSection(target);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.title.trim()) {
      toast({ title: "خطا", description: "عنوان دوره الزامی است", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...data,
        // خروجی‌های خالی را فیلتر کن
        outputs: data.outputs.filter((o) => o.trim()),
        // سرفصل‌های خالی را حذف کن و آیتم‌های خالی را فیلتر کن
        sections: data.sections
          .filter((s) => s.title.trim())
          .map((s) => ({
            ...(s.id ? { id: s.id } : {}),
            title: s.title.trim(),
            items: s.items.filter((i) => i.trim()),
          })),
      };
      const url = isEdit
        ? `/api/dashboard/courses/${data.id}`
        : "/api/dashboard/courses";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await res.json()) as { error?: string; course?: { id: string; slug: string } };
      if (!res.ok) {
        toast({ title: "خطا", description: result.error ?? "ذخیره نشد", variant: "destructive" });
        return;
      }
      toast({
        title: isEdit ? "دوره به‌روزرسانی شد" : "دوره ساخته شد",
        description: data.title,
      });
      router.push("/dashboard/courses");
      router.refresh();
    } catch {
      toast({ title: "خطا", description: "ارتباط برقرار نشد", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Section: Basic info */}
      <fieldset className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-6">
        <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          اطلاعات پایه
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="عنوان دوره *">
            <Input
              value={data.title}
              onChange={(v) => update("title", v)}
              placeholder="مثلاً: مسترفصل نقشه‌کشی فاز ۲ با AutoCAD"
              required
            />
          </Field>
          <Field label="دسته‌بندی">
            <Input
              value={data.category}
              onChange={(v) => update("category", v)}
              placeholder="مثلاً: نقشه‌کشی و فاز دو"
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="سطح دوره">
            <Select
              value={data.tier}
              onChange={(v) => update("tier", v as CourseData["tier"])}
              options={[
                { value: "BEGINNER", label: "مبتدی (Foundation)" },
                { value: "INTERMEDIATE", label: "متوسط (Intermediate)" },
                { value: "PRO", label: "حرفه‌ای (Advanced)" },
              ]}
            />
          </Field>
          <Field label="وضعیت ثبت‌نام">
            <Select
              value={data.regStatus}
              onChange={(v) => update("regStatus", v as CourseData["regStatus"])}
              options={[
                { value: "OPEN", label: "ثبت‌نام فعال" },
                { value: "FULL", label: "تکمیل ظرفیت" },
                { value: "CLOSED", label: "بسته" },
              ]}
            />
          </Field>
        </div>

        <Field label="توضیح کوتاه (برای کارت دوره)">
          <Textarea
            value={data.description}
            onChange={(v) => update("description", v)}
            rows={2}
            placeholder="یک جمله کوتاه که دوره را معرفی می‌کند"
          />
        </Field>

        <Field label="درباره دوره (چالش و راه‌حل)">
          <Textarea
            value={data.about}
            onChange={(v) => update("about", v)}
            rows={4}
            placeholder="چرا این دوره مهم است و چه چیزی را حل می‌کند؟"
          />
        </Field>

        {/* Tags */}
        <Field label="برچسب‌ها">
          <div className="flex flex-wrap gap-2 mb-2">
            {data.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 border border-border px-2 py-1 text-xs"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="text-muted-foreground hover:text-foreground min-h-[28px] min-w-[28px] flex items-center"
                  aria-label={`حذف ${t}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="مثلاً: پروژه‌محور، حضوری"
              className="flex-1 bg-transparent border-b border-border py-2 text-sm outline-none focus:border-foreground transition-colors"
            />
            <button
              type="button"
              onClick={addTag}
              className="flex min-h-[44px] items-center gap-1 border border-border px-3 text-xs hover:bg-secondary transition-colors"
            >
              <Plus className="size-3" />
              افزودن
            </button>
          </div>
        </Field>
      </fieldset>

      {/* Section: Logistics */}
      <fieldset className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-6">
        <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          جزئیات دوره
        </legend>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="مدت (ساعت)">
            <NumberInput value={data.durationHrs} onChange={(v) => update("durationHrs", v)} />
          </Field>
          <Field label="قیمت (تومان)">
            <NumberInput value={data.price} onChange={(v) => update("price", v)} />
          </Field>
          <Field label="ظرفیت (نفر)">
            <NumberInput value={data.capacity} onChange={(v) => update("capacity", v)} />
          </Field>
          <Field label="ترتیب نمایش">
            <NumberInput value={data.sortOrder} onChange={(v) => update("sortOrder", v)} />
          </Field>
        </div>

        <Field label="پیش‌نیازها">
          <Textarea
            value={data.prereqs}
            onChange={(v) => update("prereqs", v)}
            rows={2}
            placeholder="مثلاً: آشنایی با اتوکد مقدماتی"
          />
        </Field>

        <Field label="آدرس بنر (اختیاری)">
          <Input
            value={data.bannerUrl}
            onChange={(v) => update("bannerUrl", v)}
            placeholder="/images/tier-beginner.svg"
            dir="ltr"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="دوره برجسته (نمایش در صفحه اصلی)"
            value={data.featured}
            onChange={(v) => update("featured", v)}
          />
          <Toggle
            label="منتشر شده (قابل مشاهده در سایت)"
            value={data.published}
            onChange={(v) => update("published", v)}
          />
        </div>
      </fieldset>

      {/* Section: Outputs */}
      <fieldset className="space-y-3 rounded-lg border border-border bg-card p-5 sm:p-6">
        <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          خروجی‌های دوره
        </legend>
        {data.outputs.map((o, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-xs text-muted-foreground pt-3 tabular-nums">{i + 1}.</span>
            <input
              type="text"
              value={o}
              onChange={(e) => updateOutput(i, e.target.value)}
              placeholder="مثلاً: پکیج کامل فاز ۲ یک ساختمان مسکونی"
              className="flex-1 bg-transparent border-b border-border py-2 text-sm outline-none focus:border-foreground transition-colors"
            />
            <button
              type="button"
              onClick={() => removeOutput(i)}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              aria-label="حذف"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addOutput}
          className="flex min-h-[44px] items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="size-3.5" />
          افزودن خروجی
        </button>
      </fieldset>

      {/* Section: Sections */}
      <fieldset className="space-y-3 rounded-lg border border-border bg-card p-5 sm:p-6">
        <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          سرفصل‌های دوره
        </legend>
        {data.sections.map((s, si) => {
          const open = openSection === si;
          return (
            <div key={si} className="rounded-md border border-border bg-background/50">
              {/* Section header */}
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setOpenSection(open ? null : si)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={open ? "جمع کردن" : "باز کردن"}
                >
                  {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4 rotate-90" />}
                </button>
                <input
                  type="text"
                  value={s.title}
                  onChange={(e) => updateSectionTitle(si, e.target.value)}
                  placeholder={`فصل ${si + 1} — عنوان`}
                  className="flex-1 bg-transparent border-b border-border py-3 text-sm font-medium outline-none focus:border-foreground transition-colors min-h-[44px]"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSection(si, -1)}
                    disabled={si === 0}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    aria-label="بالا"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(si, 1)}
                    disabled={si === data.sections.length - 1}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    aria-label="پایین"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(si)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="حذف فصل"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {/* Items list */}
              {open && (
                <div className="px-3 pb-3 space-y-2">
                  {s.items.map((item, ii) => (
                    <div key={ii} className="flex gap-2 items-start">
                      <span className="text-xs text-muted-foreground pt-3">—</span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateSectionItem(si, ii, e.target.value)}
                        placeholder={`سرفصل ${ii + 1}`}
                        className="flex-1 bg-transparent border-b border-border py-2.5 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => removeSectionItem(si, ii)}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="حذف"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addSectionItem(si)}
                    className="flex min-h-[44px] items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="size-3" />
                    افزودن سرفصل
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={addSection}
          className="flex min-h-[44px] items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="size-3.5" />
          افزودن فصل جدید
        </button>
      </fieldset>

      {/* Submit */}
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
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {isEdit ? "ذخیره تغییرات" : "ساخت دوره"}
        </button>
      </div>
    </form>
  );
}

// ─── Reusable form controls ───

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  required,
  dir,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      dir={dir}
      className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/60 min-h-[44px]"
    />
  );
}

function Textarea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full bg-transparent border border-border rounded-md p-3 text-sm outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/60 resize-y min-h-[44px]"
    />
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-full bg-transparent border-b border-border py-3 text-sm tabular-nums outline-none focus:border-foreground transition-colors min-h-[44px]"
      dir="ltr"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex min-h-[44px] items-center gap-3 px-3 py-2 text-start hover:bg-secondary/40 rounded-md transition-colors"
    >
      <span
        className={`relative inline-block w-10 h-5 rounded-full transition-colors ${
          value ? "bg-foreground" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-background transition-transform ${
            value ? "translate-x-0.5 rtl:-translate-x-[1.125rem] translate-x-[1.125rem]" : "translate-x-0.5 rtl:-translate-x-0.5"
          }`}
        />
      </span>
      <span className="text-sm flex-1">{label}</span>
    </button>
  );
}
