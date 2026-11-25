import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { localeNumber, localeDateTime, commentStatusLabel } from "@/lib/format";
import { dict, getServerLang } from "@/lib/i18n";
import { CommentsModerator } from "@/components/comments-moderator";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  SPAM: "bg-rose-100 text-rose-800",
  REJECTED: "bg-zinc-200 text-zinc-600",
};

export default async function DashboardCommentsPage() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  const t = dict[lang].dashboard;
  if (!user?.permissions.includes("comment.moderate")) {
    return <div className="p-8 text-center text-muted-foreground">{lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}</div>;
  }

  const [comments, pendingCount, approvedCount] = await Promise.all([
    db.comment.findMany({
      orderBy: { createdAt: "desc" },
      include: { post: { select: { id: true, title: true, titleEn: true, slug: true } } },
    }),
    db.comment.count({ where: { status: "PENDING" } }),
    db.comment.count({ where: { status: "APPROVED" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {t.commentsEyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">{t.commentsTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.commentsSummary
            .replace("{count}", localeNumber(lang, comments.length))
            .replace("{pending}", localeNumber(lang, pendingCount))}
        </p>
      </div>

      <CommentsModerator
        initialComments={comments.map((c) => ({
          ...c,
          status: c.status as "PENDING" | "APPROVED" | "SPAM" | "REJECTED",
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
