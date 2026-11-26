"use client";

import { useState } from "react";
import { useLang } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";
import { localeDateTime, localeNumber } from "@/lib/format";
import {
  Activity,
  CheckCircle2,
  Cpu,
  KeyRound,
  Loader2,
  Plus,
  Save,
  Server,
  ShieldCheck,
  Sliders,
  Trash2,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

export type SafeProvider = {
  id: string;
  key: string;
  name: string;
  nameEn: string | null;
  providerType: string;
  baseUrl: string | null;
  defaultModel: string;
  hasKey: boolean;
  keyHint: string | null;
  enabled: boolean;
  lastTestedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
};

export type SafeSectionBinding = {
  id: string;
  sectionKey: string;
  labelFa: string;
  labelEn: string;
  descriptionFa: string;
  descriptionEn: string;
  providerId: string | null;
  modelOverride: string | null;
  systemPrompt: string | null;
  enabled: boolean;
  requireConsent: boolean;
};

export type UsageLedgerRow = {
  id: string;
  feature: string;
  provider: string;
  model: string;
  status: string;
  latencyMs: number;
  errorCode: string | null;
  createdAt: string;
};

type ProviderDraft = {
  id?: string;
  name: string;
  nameEn: string;
  providerType: "OPENAI_COMPAT" | "OLLAMA_LOCAL" | "CUSTOM_REST" | "GEMINI_ENV";
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  enabled: boolean;
};

const EMPTY_DRAFT: ProviderDraft = {
  name: "",
  nameEn: "",
  providerType: "OPENAI_COMPAT",
  baseUrl: "https://api.openai.com/v1",
  defaultModel: "gpt-4o-mini",
  apiKey: "",
  enabled: true,
};

export function AiConnectionsManager({
  initialProviders,
  initialSections,
  initialUsage,
}: {
  initialProviders: SafeProvider[];
  initialSections: SafeSectionBinding[];
  initialUsage: UsageLedgerRow[];
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const { toast } = useToast();

  const [providers, setProviders] = useState<SafeProvider[]>(initialProviders);
  const [sections, setSections] = useState<SafeSectionBinding[]>(initialSections);
  const [usage, setUsage] = useState<UsageLedgerRow[]>(initialUsage);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [savingSectionKey, setSavingSectionKey] = useState<string | null>(null);
  const [savingProvider, setSavingProvider] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<ProviderDraft>(EMPTY_DRAFT);

  // Local edits per section binding
  const [sectionEdits, setSectionEdits] = useState<
    Record<
      string,
      {
        providerId: string;
        modelOverride: string;
        systemPrompt: string;
        enabled: boolean;
      }
    >
  >(() => {
    const map: Record<
      string,
      { providerId: string; modelOverride: string; systemPrompt: string; enabled: boolean }
    > = {};
    for (const s of initialSections) {
      map[s.sectionKey] = {
        providerId: s.providerId ?? "",
        modelOverride: s.modelOverride ?? "",
        systemPrompt: s.systemPrompt ?? "",
        enabled: s.enabled,
      };
    }
    return map;
  });

  async function refreshAll() {
    const res = await fetch("/api/dashboard/ai-connections/");
    if (!res.ok) return;
    const data = (await res.json()) as {
      providers: SafeProvider[];
      sections: SafeSectionBinding[];
      recentUsage: UsageLedgerRow[];
    };
    setProviders(data.providers);
    setSections(data.sections);
    setUsage(data.recentUsage);
  }

  function openNewProvider() {
    setDraft(EMPTY_DRAFT);
    setModalOpen(true);
  }

  function openEditProvider(p: SafeProvider) {
    setDraft({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn ?? "",
      providerType:
        (p.providerType as ProviderDraft["providerType"]) || "OPENAI_COMPAT",
      baseUrl: p.baseUrl ?? "",
      defaultModel: p.defaultModel,
      apiKey: "",
      enabled: p.enabled,
    });
    setModalOpen(true);
  }

  async function saveProvider(e: React.FormEvent) {
    e.preventDefault();
    setSavingProvider(true);
    try {
      const res = await fetch("/api/dashboard/ai-connections/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as {
        providers?: SafeProvider[];
        sections?: SafeSectionBinding[];
        error?: string;
      };
      if (!res.ok) {
        toast({
          title: fa ? "خطا در ذخیره سرویس‌دهنده" : "Failed to save provider",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      if (data.providers) setProviders(data.providers);
      if (data.sections) setSections(data.sections);
      setModalOpen(false);
      toast({
        title: fa ? "سرویس‌دهنده هوش مصنوعی ذخیره شد" : "AI provider saved",
      });
    } finally {
      setSavingProvider(false);
    }
  }

  async function testProvider(providerId: string) {
    setTestingId(providerId);
    try {
      const res = await fetch("/api/dashboard/ai-connections/test/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        latencyMs?: number;
        message?: string;
        error?: string;
      };
      await refreshAll();
      if (res.ok && data.ok) {
        toast({
          title: fa ? "اتصال با موفقیت برقرار شد" : "Connection healthy",
          description: `${localeNumber(lang, data.latencyMs ?? 0)} ms`,
        });
      } else {
        toast({
          title: fa ? "تست اتصال ناموفق بود" : "Connection test failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } finally {
      setTestingId(null);
    }
  }

  async function deleteProvider(id: string) {
    const res = await fetch(`/api/dashboard/ai-connections/?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as {
      providers?: SafeProvider[];
      sections?: SafeSectionBinding[];
      error?: string;
    };
    if (!res.ok) {
      toast({
        title: fa ? "امکان حذف وجود ندارد" : "Cannot delete provider",
        description: data.error,
        variant: "destructive",
      });
      return;
    }
    if (data.providers) setProviders(data.providers);
    if (data.sections) setSections(data.sections);
    toast({ title: fa ? "سرویس‌دهنده حذف شد" : "Provider removed" });
  }

  async function saveSection(sectionKey: string) {
    const edit = sectionEdits[sectionKey];
    if (!edit) return;
    setSavingSectionKey(sectionKey);
    try {
      const res = await fetch("/api/dashboard/ai-connections/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionKey,
          providerId: edit.providerId || null,
          modelOverride: edit.modelOverride || null,
          systemPrompt: edit.systemPrompt || null,
          enabled: edit.enabled,
        }),
      });
      const data = (await res.json()) as {
        providers?: SafeProvider[];
        sections?: SafeSectionBinding[];
        error?: string;
      };
      if (!res.ok) {
        toast({
          title: fa ? "خطا در بروزرسانی بخش" : "Failed to save section routing",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      if (data.sections) setSections(data.sections);
      toast({
        title: fa ? "تنظیمات اتصال بخش ذخیره شد" : "Section AI routing updated",
      });
    } finally {
      setSavingSectionKey(null);
    }
  }

  const activeProvidersCount = providers.filter((p) => p.enabled).length;
  const activeSectionsCount = sections.filter((s) => s.enabled && s.providerId).length;
  const avgLatency =
    usage.length > 0
      ? Math.round(usage.reduce((sum, u) => sum + u.latencyMs, 0) / usage.length)
      : 0;

  return (
    <div className="space-y-8">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{fa ? "درگاه‌های فعال" : "Active Providers"}</span>
            <Server className="size-4" />
          </div>
          <div className="text-2xl font-medium tabular-nums">
            {localeNumber(lang, activeProvidersCount)} / {localeNumber(lang, providers.length)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{fa ? "بخش‌های متصل" : "Routed Sections"}</span>
            <Sliders className="size-4" />
          </div>
          <div className="text-2xl font-medium tabular-nums">
            {localeNumber(lang, activeSectionsCount)} / {localeNumber(lang, sections.length)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{fa ? "درخواست‌های اخیر" : "Recent AI Calls"}</span>
            <Activity className="size-4" />
          </div>
          <div className="text-2xl font-medium tabular-nums">
            {localeNumber(lang, usage.length)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{fa ? "میانگین تاخیر پاسخ" : "Avg Latency"}</span>
            <Cpu className="size-4" />
          </div>
          <div className="text-2xl font-medium tabular-nums">
            {localeNumber(lang, avgLatency)} <span className="text-xs text-muted-foreground">ms</span>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900 flex items-start gap-3">
        <ShieldCheck className="size-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {fa
            ? "تمام کلیدهای API خارجی با رمزنگاری AES-256-GCM در سرور ذخیره می‌شوند و هرگز به مرورگر ارسال نمی‌گردند. آدرس‌های سرورهای خارجی برای جلوگیری از نفوذ شبکه داخلی (SSRF) بررسی می‌شوند و درگاه رسمی Gemini مستقیماً از کلید امن محیط سرور استفاده می‌کند."
            : "External API keys are encrypted at rest with AES-256-GCM on the server and never returned to the browser. External endpoints are validated against SSRF, and the built-in Gemini gateway uses the server environment secret automatically."}
        </p>
      </div>

      {/* Providers Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">
              {fa ? "سرویس‌دهنده‌های هوش مصنوعی" : "AI Provider Connections"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fa
                ? "مدیریت درگاه رسمی Gemini، سرویس‌های سازگار با OpenAI یا مدل‌های لوکال Ollama."
                : "Manage Gemini server gateway, OpenAI-compatible endpoints, or local Ollama."}
            </p>
          </div>
          <button
            type="button"
            onClick={openNewProvider}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-foreground text-background px-4 text-xs font-medium hover:opacity-90"
          >
            <Plus className="size-4" />
            <span>{fa ? "افزودن سرویس‌دهنده جدید" : "Add AI Provider"}</span>
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {providers.map((p) => {
            const isGeminiEnv = p.providerType === "GEMINI_ENV";
            return (
              <div
                key={p.id}
                className="rounded-lg border border-border bg-card p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">
                          {fa ? p.name : p.nameEn || p.name}
                        </h3>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {p.providerType}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono" dir="ltr">
                        {p.defaultModel}
                        {p.baseUrl ? ` · ${p.baseUrl}` : ""}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        p.lastStatus === "OK"
                          ? "text-emerald-700"
                          : p.lastStatus === "ERROR"
                            ? "text-rose-700"
                            : "text-muted-foreground"
                      }`}
                    >
                      {p.lastStatus === "OK" ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : p.lastStatus === "ERROR" ? (
                        <XCircle className="size-3.5" />
                      ) : null}
                      <span>
                        {p.lastStatus === "OK"
                          ? fa
                            ? "متصل"
                            : "Healthy"
                          : p.lastStatus === "ERROR"
                            ? fa
                              ? "خطا"
                              : "Error"
                            : fa
                              ? "تست نشده"
                              : "Untested"}
                      </span>
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <KeyRound className="size-3.5 shrink-0" />
                    {isGeminiEnv ? (
                      <span>
                        {p.hasKey
                          ? fa
                            ? "کلید سرور (GEMINI_API_KEY) فعال و ایمن است"
                            : "Server GEMINI_API_KEY active"
                          : fa
                            ? "کلید محیط سرور (GEMINI_API_KEY) هنوز تنظیم نشده"
                            : "Server GEMINI_API_KEY not set"}
                      </span>
                    ) : (
                      <span>
                        {p.hasKey
                          ? `${fa ? "کلید رمزنگاری‌شده:" : "Encrypted key:"} ${p.keyHint || "••••"}`
                          : fa
                            ? "بدون کلید (مناسب سرورهای بدون احراز هویت)"
                            : "No key configured"}
                      </span>
                    )}
                  </div>

                  {p.lastError && (
                    <div className="rounded border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-800">
                      {p.lastError}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={testingId === p.id}
                      onClick={() => void testProvider(p.id)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      {testingId === p.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Activity className="size-3.5" />
                      )}
                      <span>{fa ? "تست اتصال" : "Test"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditProvider(p)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-secondary"
                    >
                      <Wrench className="size-3.5" />
                      <span>{fa ? "تنظیم" : "Edit"}</span>
                    </button>
                  </div>

                  {p.key !== "gemini-server" && (
                    <button
                      type="button"
                      onClick={() => void deleteProvider(p.id)}
                      className="inline-flex min-h-[36px] items-center gap-1 text-xs text-destructive hover:underline px-2"
                    >
                      <Trash2 className="size-3.5" />
                      <span>{fa ? "حذف" : "Delete"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section Routing Matrix */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">
            {fa ? "تخصیص هوش مصنوعی به هر بخش" : "Per-Section AI Routing"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fa
              ? "برای دستیار مدیریت، راهنمای دوره‌ها، بازرس صحنه، طراح آزمون و نگارش مقاله، سرویس‌دهنده و دستور پایه مستقل تعیین کنید."
              : "Assign an AI provider, optional model override, and system prompt per module."}
          </p>
        </div>

        <div className="space-y-3">
          {sections.map((sec) => {
            const edit = sectionEdits[sec.sectionKey] ?? {
              providerId: sec.providerId ?? "",
              modelOverride: sec.modelOverride ?? "",
              systemPrompt: sec.systemPrompt ?? "",
              enabled: sec.enabled,
            };
            const saving = savingSectionKey === sec.sectionKey;

            return (
              <div
                key={sec.id}
                className="rounded-lg border border-border bg-card p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        {fa ? sec.labelFa : sec.labelEn}
                      </h3>
                      <span dir="ltr" className="text-[11px] font-mono text-muted-foreground">
                        {sec.sectionKey}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fa ? sec.descriptionFa : sec.descriptionEn}
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={edit.enabled}
                      onChange={(e) =>
                        setSectionEdits((prev) => ({
                          ...prev,
                          [sec.sectionKey]: { ...edit, enabled: e.target.checked },
                        }))
                      }
                      className="size-4 accent-foreground"
                    />
                    <span>{edit.enabled ? (fa ? "فعال" : "Enabled") : fa ? "غیرفعال" : "Disabled"}</span>
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-xs text-muted-foreground">
                      {fa ? "سرویس‌دهنده متصل" : "Assigned Provider"}
                    </label>
                    <select
                      value={edit.providerId}
                      onChange={(e) =>
                        setSectionEdits((prev) => ({
                          ...prev,
                          [sec.sectionKey]: { ...edit, providerId: e.target.value },
                        }))
                      }
                      className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-foreground"
                    >
                      <option value="">{fa ? "انتخاب سرویس‌دهنده..." : "Select provider..."}</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {fa ? p.name : p.nameEn || p.name} ({p.defaultModel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-xs text-muted-foreground">
                      {fa ? "مدل اختصاصی این بخش (اختیاری)" : "Model Override (Optional)"}
                    </label>
                    <input
                      value={edit.modelOverride}
                      onChange={(e) =>
                        setSectionEdits((prev) => ({
                          ...prev,
                          [sec.sectionKey]: { ...edit, modelOverride: e.target.value },
                        }))
                      }
                      dir="ltr"
                      placeholder={fa ? "خالی = مدل پیش‌فرض سرویس‌دهنده" : "Default provider model"}
                      className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-foreground"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    {fa ? "دستورالعمل سیستمی (System Prompt)" : "System Prompt"}
                  </label>
                  <textarea
                    rows={2}
                    value={edit.systemPrompt}
                    onChange={(e) =>
                      setSectionEdits((prev) => ({
                        ...prev,
                        [sec.sectionKey]: { ...edit, systemPrompt: e.target.value },
                      }))
                    }
                    className="rounded-md border border-border bg-background p-2.5 text-xs outline-none focus:border-foreground resize-y"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveSection(sec.sectionKey)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-foreground text-background px-4 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    <span>{fa ? "ذخیره اتصال بخش" : "Save Routing"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Usage Ledger */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          {fa ? "گزارش مصرف اخیر هوش مصنوعی" : "Recent AI Execution Ledger"}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-secondary/30 text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-start font-medium">{fa ? "بخش" : "Section"}</th>
                <th className="py-3 px-4 text-start font-medium">{fa ? "سرویس" : "Provider"}</th>
                <th className="py-3 px-4 text-start font-medium">{fa ? "مدل" : "Model"}</th>
                <th className="py-3 px-4 text-start font-medium">{fa ? "وضعیت" : "Status"}</th>
                <th className="py-3 px-4 text-start font-medium">{fa ? "تاخیر" : "Latency"}</th>
                <th className="py-3 px-4 text-start font-medium">{fa ? "زمان" : "Timestamp"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usage.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    {fa ? "هنوز درخواستی ثبت نشده است." : "No AI requests logged yet."}
                  </td>
                </tr>
              ) : (
                usage.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 px-4 font-mono">{u.feature}</td>
                    <td className="py-2.5 px-4 font-mono">{u.provider}</td>
                    <td className="py-2.5 px-4 font-mono">{u.model}</td>
                    <td
                      className={`py-2.5 px-4 font-medium ${
                        u.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {u.status}
                    </td>
                    <td className="py-2.5 px-4 tabular-nums">{localeNumber(lang, u.latencyMs)} ms</td>
                    <td className="py-2.5 px-4 text-muted-foreground tabular-nums">
                      {localeDateTime(lang, u.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Add / Edit Provider */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={saveProvider}
            className="w-full max-w-lg rounded-lg border border-border bg-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold">
                {draft.id
                  ? fa
                    ? "ویرایش سرویس‌دهنده هوش مصنوعی"
                    : "Edit AI Provider"
                  : fa
                    ? "افزودن سرویس‌دهنده جدید"
                    : "Add AI Provider"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex size-8 items-center justify-center rounded border border-border hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            {!draft.id && (
              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">
                  {fa ? "نوع پروتکل اتصال" : "Protocol Type"}
                </label>
                <select
                  value={draft.providerType}
                  onChange={(e) => {
                    const t = e.target.value as ProviderDraft["providerType"];
                    setDraft((d) => ({
                      ...d,
                      providerType: t,
                      baseUrl:
                        t === "OLLAMA_LOCAL"
                          ? "http://127.0.0.1:11434/v1"
                          : "https://api.openai.com/v1",
                      defaultModel: t === "OLLAMA_LOCAL" ? "qwen2.5:14b" : "gpt-4o-mini",
                    }));
                  }}
                  className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs outline-none"
                >
                  <option value="OPENAI_COMPAT">OpenAI-Compatible (OpenAI / OpenRouter / DeepSeek / Groq)</option>
                  <option value="OLLAMA_LOCAL">Local Ollama (127.0.0.1:11434)</option>
                  <option value="CUSTOM_REST">Custom HTTPS Chat Completions</option>
                </select>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">{fa ? "نام نمایشی" : "Display Name"}</label>
                <input
                  required
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder={fa ? "مثلاً: OpenRouter معماری" : "e.g. OpenRouter Pro"}
                  className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs outline-none"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">{fa ? "مدل پیش‌فرض" : "Default Model"}</label>
                <input
                  required
                  dir="ltr"
                  value={draft.defaultModel}
                  onChange={(e) => setDraft((d) => ({ ...d, defaultModel: e.target.value }))}
                  placeholder="gpt-4o-mini"
                  className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs outline-none"
                />
              </div>
            </div>

            {draft.providerType !== "GEMINI_ENV" && (
              <>
                <div className="grid gap-1.5">
                  <label className="text-xs text-muted-foreground">{fa ? "آدرس پایه (Base URL)" : "Base URL"}</label>
                  <input
                    required
                    dir="ltr"
                    value={draft.baseUrl}
                    onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                    placeholder="https://api.openai.com/v1"
                    className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs outline-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    {fa
                      ? draft.id
                        ? "کلید جدید (خالی = حفظ کلید رمزنگاری‌شده قبلی)"
                        : "کلید اتصال (رمزنگاری امن با AES-256 روی سرور)"
                      : "Access Token (encrypted at rest on server)"}
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    value={draft.apiKey}
                    onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
                    placeholder={draft.id ? "••••••••" : "sk-..."}
                    className="min-h-[40px] rounded-md border border-border bg-background px-3 text-xs outline-none"
                  />
                </div>
              </>
            )}

            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
                className="size-4 accent-foreground"
              />
              <span>{fa ? "این سرویس‌دهنده فعال باشد" : "Enable this provider"}</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[40px] rounded-md border border-border px-4 text-xs hover:bg-secondary"
              >
                {fa ? "انصراف" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={savingProvider}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-foreground text-background px-4 text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                {savingProvider && <Loader2 className="size-3.5 animate-spin" />}
                <span>{fa ? "ذخیره سرویس‌دهنده" : "Save Provider"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
