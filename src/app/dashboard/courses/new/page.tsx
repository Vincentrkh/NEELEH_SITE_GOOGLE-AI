import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CourseEditor } from "@/components/course-editor";
import { getCurrentUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("course.create")) {
    redirect("/dashboard/courses");
  }
  const lang = await getServerLang();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/courses"
          className="inline-flex min-h-[44px] items-center gap-1 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowRight className="size-3.5 rtl:-scale-x-100" />
          {lang === "fa" ? "بازگشت به دوره‌ها" : "Back to courses"}
        </Link>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          [{lang === "fa" ? " دوره جدید " : " New course "}]
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {lang === "fa" ? "ساخت دوره" : "Create a course"}
        </h1>
      </div>

      <CourseEditor />
    </div>
  );
}
