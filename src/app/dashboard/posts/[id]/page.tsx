import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { PostEditor, type PostData } from "@/components/post-editor";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("post.update")) {
    redirect("/dashboard/posts");
  }
  const lang = await getServerLang();

  const { id } = await params;
  const post = await db.post.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });
  if (!post) notFound();

  const [categories, tags] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true, nameEn: true, slug: true }, orderBy: { name: "asc" } }),
    db.tag.findMany({ select: { id: true, name: true, nameEn: true, slug: true }, orderBy: { name: "asc" } }),
  ]);

  const initial: PostData = {
    id: post.id,
    title: post.title,
    titleEn: post.titleEn ?? "",
    excerpt: post.excerpt,
    excerptEn: post.excerptEn,
    content: post.content,
    contentEn: post.contentEn,
    coverUrl: post.coverUrl ?? "",
    status: post.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    featured: post.featured,
    readingMins: post.readingMins,
    categoryIds: post.categories.map((pc) => pc.category.id),
    tagIds: post.tags.map((pt) => pt.tag.id),
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/dashboard/posts"
            className="inline-flex min-h-[44px] items-center gap-1 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowRight className="size-3.5 rtl:-scale-x-100" />
            {lang === "fa" ? "بازگشت به مقالات" : "Back to posts"}
          </Link>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            [{lang === "fa" ? " ویرایش مقاله " : " Edit post "}]
          </p>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] line-clamp-2 max-w-3xl">
            {post.title}
          </h1>
        </div>
        {post.status === "PUBLISHED" && (
          <a
            href={`/blog/${post.slug}`}
            target="_blank"
            className="flex min-h-[44px] items-center gap-2 border border-border rounded-md px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors shrink-0"
          >
            <ExternalLink className="size-3.5" />
            {lang === "fa" ? "مشاهده در سایت" : "View on site"}
          </a>
        )}
      </div>

      <PostEditor initial={initial} categories={categories} tags={tags} />
    </div>
  );
}
