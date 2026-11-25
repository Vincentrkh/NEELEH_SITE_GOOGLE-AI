"use client";

import { useState } from "react";
import { useLang } from "@/components/language-provider";
import { dict } from "@/lib/i18n";
import { Loader2, Send, Sparkles } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  tool?: string;
};

export function AssistantChat({ userName }: { userName: string }) {
  const { lang } = useLang();
  const t = dict[lang].dashboard;
  const fa = lang === "fa";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const nextHistory = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/dashboard/assistant", {
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          [{fa ? " دستیار هوشمند " : " Smart Assistant "}]
        </p>
        <h1 className="text-3xl font-medium tracking-[-0.03em]">
          {fa ? `سلام ${userName}` : `Hello ${userName}`}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.assistantWelcomeIntro}</p>
      </div>

      <div className="rounded-lg border border-border bg-card min-h-[360px] flex flex-col">
        <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[520px]">
          {messages.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground space-y-2">
              <Sparkles className="size-6 mx-auto opacity-60" />
              <p>{t.assistantWelcomeIntro}</p>
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
        </div>

        <form onSubmit={onSubmit} className="border-t border-border p-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={fa ? "دستور خود را بنویسید..." : "Type a command..."}
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-foreground text-background px-4 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {fa ? "ارسال" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
