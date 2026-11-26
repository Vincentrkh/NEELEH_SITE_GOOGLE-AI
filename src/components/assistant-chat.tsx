"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/components/language-provider";
import { dict } from "@/lib/i18n";
import { Cpu, Loader2, Send, Sparkles, ArrowUpRight } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  tool?: string;
};

const QUICK_PROMPTS_FA = [
  "وضعیت کلی ثبت‌نام‌ها و دوره‌های فعال الان چطور است؟",
  "چه اقداماتی برای افزایش نرخ تبدیل ثبت‌نام‌های در انتظار پیشنهاد می‌دهی؟",
  "یک متن پیام صمیمی برای یادآوری شروع کلاس در کارتابل هنرجویان بنویس.",
  "یک ایده مقاله تخصصی معماری با تمرکز بر Revit و BIM پیشنهاد بده.",
];

const QUICK_PROMPTS_EN = [
  "Summarize current enrollments, pending reviews, and active courses.",
  "Suggest actionable steps to confirm pending student registrations.",
  "Draft a warm cartable welcome reminder for newly confirmed students.",
  "Propose an architectural journal article topic on BIM workflows.",
];

export function AssistantChat({ userName }: { userName: string }) {
  const { lang } = useLang();
  const t = dict[lang].dashboard;
  const fa = lang === "fa";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendPrompt(rawText: string) {
    const text = rawText.trim();
    if (!text || busy) return;

    const nextHistory = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/dashboard/assistant/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: nextHistory }),
      });
      const data = (await res.json()) as {
        message?: string;
        result?: string;
        tool?: string;
        thought?: string;
        error?: string;
      };
      const reply =
        data.message ||
        data.result ||
        data.error ||
        (fa ? "پاسخی دریافت نشد." : "No response received.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, tool: data.tool },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fa ? "ارتباط با دستیار برقرار نشد." : "Failed to reach assistant.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendPrompt(input);
  }

  const quickPrompts = fa ? QUICK_PROMPTS_FA : QUICK_PROMPTS_EN;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {fa ? "دستیار هوشمند عملیات آکادمی" : "Academy Operations Smart Assistant"}
          </p>
          <h1 className="text-3xl font-medium tracking-[-0.03em]">
            {fa ? `سلام ${userName}` : `Hello ${userName}`}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.assistantWelcomeIntro}</p>
        </div>

        <Link
          href="/dashboard/ai-connections/"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-border bg-card px-3.5 text-xs font-medium hover:bg-secondary transition-colors whitespace-nowrap"
        >
          <Cpu className="size-3.5 text-muted-foreground" />
          <span>{fa ? "تنظیمات مدل و اتصال هوش مصنوعی" : "Configure AI Connections"}</span>
          <ArrowUpRight className="size-3.5 text-muted-foreground" />
        </Link>
      </div>

      {/* Quick Prompts */}
      <div className="grid sm:grid-cols-2 gap-2.5">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={busy}
            onClick={() => void sendPrompt(prompt)}
            className="text-start rounded-lg border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card min-h-[420px] flex flex-col">
        <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[540px]">
          {messages.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground space-y-2.5">
              <Sparkles className="size-6 mx-auto opacity-60" />
              <p className="max-w-md mx-auto leading-relaxed">
                {fa
                  ? "یکی از دستورات سریع بالا را انتخاب کنید یا پرسش خود را درباره ثبت‌نام‌ها، دوره‌ها و محتوا بنویسید."
                  : "Pick a quick prompt above or ask anything about enrollments, courses, and academy content."}
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-foreground text-background ms-8"
                    : "bg-secondary text-foreground me-8"
                }`}
              >
                {m.tool && (
                  <div className="text-[10px] uppercase tracking-[0.12em] opacity-70 mb-1">
                    {m.tool}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))
          )}
          {busy && (
            <div className="rounded-lg bg-secondary text-muted-foreground me-8 px-4 py-3 text-xs flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" />
              <span>{fa ? "در حال پردازش و تحلیل داده‌های زنده..." : "Analyzing live academy data..."}</span>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-border p-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={fa ? "دستور یا سوال خود را بنویسید..." : "Type a command or question..."}
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-foreground text-background px-4 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            <span>{fa ? "ارسال" : "Send"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
