import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { PageEditor, type PageData } from "@/components/page-editor";

export const dynamic = "force-dynamic";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("page.manage")) {
    redirect("/dashboard/pages");
  }
  const lang = await getServerLang();

  const { id } = await params;
  const page = await db.staticPage.findUnique({ where: { id } });
  if (!page) notFound();

  const initial: PageData = {
    id: page.id,
    title: page.title,
    titleEn: page.titleEn ?? "",
    slug: page.slug,
    content: page.content,
    contentEn: page.contentEn,
    excerpt: page.excerpt ?? "",
    status: page.status as "DRAFT" | "PUBLISHED",
    showInMenu: page.showInMenu,
    sortOrder: page.sortOrder,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/dashboard/pages"
            className="inline-flex min-h-[44px] items-center gap-1 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowRight className="size-3.5 rtl:-scale-x-100" />
            {lang === "fa" ? "بازگشت به صفحات" : "Back to pages"}
          </Link>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            [{lang === "fa" ? " ویرایش صفحه " : " Edit page "}]
          </p>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] line-clamp-2 max-w-3xl">
            {page.title}
          </h1>
        </div>
        {page.status === "PUBLISHED" && (
          <a
            href={`/page/${page.slug}`}
            target="_blank"
            className="flex min-h-[44px] items-center gap-2 border border-border rounded-md px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors shrink-0"
          >
            <ExternalLink className="size-3.5" />
            {lang === "fa" ? "مشاهده در سایت" : "View on site"}
          </a>
        )}
      </div>

      <PageEditor initial={initial} />
    </div>
  );
}
