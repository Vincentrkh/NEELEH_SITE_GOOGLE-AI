"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { faDateTime, COMMENT_STATUS_LABEL } from "@/lib/format";
import {
  Check,
  X,
  Trash2,
  Loader2,
  MessageSquare,
  Search,
} from "lucide-react";
import Link from "next/link";

type Comment = {
  id: string;
  name: string;
  email: string | null;
  content: string;
  status: "PENDING" | "APPROVED" | "SPAM" | "REJECTED";
  createdAt: string;
  post: { id: string; title: string; slug: string };
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  SPAM: "bg-rose-100 text-rose-800",
  REJECTED: "bg-zinc-200 text-zinc-600",
};

export function CommentsModerator({
  initialComments,
}: {
  initialComments: Comment[];
}) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [busy, setBusy] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return comments.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q) ||
          c.post.title.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [comments, statusFilter, search]);

  async function updateStatus(id: string, status: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/dashboard/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast({ title: "خطا", variant: "destructive" });
        return;
      }
      setComments((list) =>
        list.map((c) => (c.id === id ? { ...c, status: status as Comment["status"] } : c))
      );
      toast({ title: "به‌روزرسانی شد" });
    } finally {
      setBusy(null);
    }
  }

  async function deleteComment(id: string) {
    if (!confirm("این نظر حذف شود؟")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/dashboard/comments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast({ title: "خطا", variant: "destructive" });
        return;
      }
      setComments((list) => list.filter((c) => c.id !== id));
      toast({ title: "حذف شد" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در نام، متن یا مقاله..."
            className="w-full bg-card border border-border rounded-md py-2.5 ps-10 pe-3 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-foreground transition-colors min-h-[44px]"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="PENDING">در انتظار</option>
          <option value="APPROVED">تأیید شده</option>
          <option value="SPAM">اسپم</option>
          <option value="REJECTED">رد شده</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <MessageSquare className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {comments.length === 0 ? "هنوز نظری ثبت نشده است." : "موردی یافت نشد."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-medium shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{c.name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${STATUS_BADGE[c.status]}`}>
                      {COMMENT_STATUS_LABEL[c.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{c.content}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <Link
                      href={`/blog/${c.post.slug}`}
                      className="hover:text-foreground transition-colors truncate"
                    >
                      روی: {c.post.title}
                    </Link>
                    <span>•</span>
                    <span>{faDateTime(c.createdAt)}</span>
                  </div>
                </div>
                {busy === c.id && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              </div>

              <div className="mt-3 flex items-center gap-1 flex-wrap">
                {c.status !== "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => updateStatus(c.id, "APPROVED")}
                    className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <Check className="size-3" />
                    تأیید
                  </button>
                )}
                {c.status !== "SPAM" && (
                  <button
                    type="button"
                    onClick={() => updateStatus(c.id, "SPAM")}
                    className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3 text-xs text-rose-800 hover:bg-rose-100 transition-colors"
                  >
                    <X className="size-3" />
                    اسپم
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteComment(c.id)}
                  className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-border px-3 text-xs text-destructive hover:bg-destructive/5 transition-colors ms-auto"
                >
                  <Trash2 className="size-3" />
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
