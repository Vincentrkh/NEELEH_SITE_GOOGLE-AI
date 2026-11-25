import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { CourseEditor, type CourseData } from "@/components/course-editor";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("course.update")) {
    redirect("/dashboard/courses");
  }
  const lang = await getServerLang();

  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { order: "asc" } },
    },
  });
  if (!course) notFound();

  const initial: CourseData = {
    id: course.id,
    title: course.title,
    titleEn: course.titleEn ?? "",
    tier: course.tier as "BEGINNER" | "INTERMEDIATE" | "PRO",
    category: course.category,
    categoryEn: course.categoryEn ?? "",
    description: course.description,
    descriptionEn: course.descriptionEn,
    about: course.about,
    aboutEn: course.aboutEn,
    tags: course.tags ? course.tags.split(",").filter(Boolean) : [],
    tagsEn: course.tagsEn ? course.tagsEn.split(",").filter(Boolean) : [],
    outputs: course.outputs ? course.outputs.split("\n").filter(Boolean) : [],
    outputsEn: course.outputsEn ? course.outputsEn.split("\n").filter(Boolean) : [],
    prereqs: course.prereqs,
    prereqsEn: course.prereqsEn,
    durationHrs: course.durationHrs,
    price: course.price,
    capacity: course.capacity,
    regStatus: course.regStatus as "OPEN" | "FULL" | "CLOSED",
    featured: course.featured,
    published: course.published,
    bannerUrl: course.bannerUrl ?? "",
    sortOrder: course.sortOrder,
    sections: course.sections.map((s) => ({
      id: s.id,
      title: s.title,
      items: s.items ? s.items.split("\n").filter(Boolean) : [],
    })),
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/dashboard/courses"
            className="inline-flex min-h-[44px] items-center gap-1 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowRight className="size-3.5 rtl:-scale-x-100" />
            {lang === "fa" ? "بازگشت به دوره‌ها" : "Back to courses"}
          </Link>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            [{lang === "fa" ? " ویرایش دوره " : " Edit course "}]
          </p>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] line-clamp-2">
            {course.title}
          </h1>
        </div>
        <a
          href={`/courses/${course.slug}`}
          target="_blank"
          className="flex min-h-[44px] items-center gap-2 border border-border rounded-md px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <ExternalLink className="size-3.5" />
          {lang === "fa" ? "مشاهده در سایت" : "View on site"}
        </a>
      </div>

      <CourseEditor initial={initial} />
    </div>
  );
}
