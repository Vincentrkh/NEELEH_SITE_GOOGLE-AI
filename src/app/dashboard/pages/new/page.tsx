import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { PageEditor } from "@/components/page-editor";

export const dynamic = "force-dynamic";

export default async function NewPagePage() {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("page.manage")) {
    redirect("/dashboard/pages");
  }
  const lang = await getServerLang();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/pages"
          className="inline-flex min-h-[44px] items-center gap-1 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowRight className="size-3.5 rtl:-scale-x-100" />
          {lang === "fa" ? "بازگشت به صفحات" : "Back to pages"}
        </Link>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          [{lang === "fa" ? " صفحه جدید " : " New page "}]
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {lang === "fa" ? "ساخت صفحه ساکن" : "Create a static page"}
        </h1>
      </div>
      <PageEditor />
    </div>
  );
}
