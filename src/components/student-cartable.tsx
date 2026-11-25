"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import { localeDateTime, localeNumber } from "@/lib/format";
import { Mail, CheckCheck, ChevronDown, ChevronUp, Inbox } from "lucide-react";

export type StudentCartableItem = {
  recipientId: string;
  messageId: string;
  title: string;
  body: string;
  channels: string[];
  isBroadcast: boolean;
  senderName: string | null;
  courseTitle: string | null;
  courseTitleEn: string | null;
  readAt: string | null;
  createdAt: string;
};

export function StudentCartable({
  initialMessages,
}: {
  initialMessages: StudentCartableItem[];
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const { toast } = useToast();

  const [messages, setMessages] = useState<StudentCartableItem[]>(initialMessages);
  const [expandedId, setExpandedId] = useState<string | null>(
    initialMessages.find((m) => !m.readAt)?.recipientId ?? initialMessages[0]?.recipientId ?? null,
  );
  const [busy, setBusy] = useState(false);

  const unreadCount = messages.filter((m) => !m.readAt).length;

  async function markRead(recipientId: string) {
    const target = messages.find((m) => m.recipientId === recipientId);
    if (!target || target.readAt) return;
    try {
      const res = await fetch("/api/panel/messages/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { readAt?: string };
      setMessages((prev) =>
        prev.map((m) =>
          m.recipientId === recipientId
            ? { ...m, readAt: data.readAt ?? new Date().toISOString() }
            : m,
        ),
      );
    } catch {
      // silent background mark-read fallback
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/panel/messages/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) return;
      const nowIso = new Date().toISOString();
      setMessages((prev) => prev.map((m) => ({ ...m, readAt: m.readAt ?? nowIso })));
      toast({ title: fa ? "همه پیام‌ها خوانده شدند" : "All messages marked as read" });
    } finally {
      setBusy(false);
    }
  }

  function toggleExpand(item: StudentCartableItem) {
    const opening = expandedId !== item.recipientId;
    setExpandedId(opening ? item.recipientId : null);
    if (opening && !item.readAt) {
      void markRead(item.recipientId);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Inbox className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-semibold">
            {fa ? "کارتابل پیام‌های آکادمی" : "Academy Inbox (Cartable)"}
          </h2>
          {unreadCount > 0 && (
            <span className="text-xs font-medium text-amber-700 tabular-nums">
              · {localeNumber(lang, unreadCount)} {fa ? "خوانده‌نشده" : "unread"}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={markAllRead}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-secondary transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <CheckCheck className="size-3.5" aria-hidden />
            <span>{fa ? "خواندن همه" : "Mark all read"}</span>
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          <Mail className="size-7 mx-auto mb-2 opacity-60" aria-hidden />
          <p>
            {fa
              ? "هنوز پیامی در کارتابل شما ثبت نشده است."
              : "No messages in your inbox yet."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {messages.map((m) => {
            const isExpanded = expandedId === m.recipientId;
            const courseLabel = fa ? m.courseTitle : m.courseTitleEn ?? m.courseTitle;
            return (
              <li
                key={m.recipientId}
                className={m.readAt ? "bg-card" : "bg-amber-50/40"}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(m)}
                  className="w-full px-5 py-3.5 text-start flex items-start justify-between gap-3 hover:bg-secondary/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!m.readAt && (
                        <span
                          className="size-2 rounded-full bg-amber-600 shrink-0"
                          title={fa ? "خوانده‌نشده" : "Unread"}
                        />
                      )}
                      <span className={`text-sm truncate ${!m.readAt ? "font-semibold" : "font-medium"}`}>
                        {m.title}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                      <span>{m.senderName ?? (fa ? "مدیریت آکادمی" : "Academy Admin")}</span>
                      {courseLabel && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{courseLabel}</span>
                        </>
                      )}
                      <span aria-hidden>·</span>
                      <span>{localeDateTime(lang, m.createdAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 pt-1 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 pt-1 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap border-t border-border/50">
                    {m.body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
