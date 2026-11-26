import { requireAdmin } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { getSafeUpdateStatus } from "@/lib/system-updater";
import { SystemUpdaterPanel } from "@/components/system-updater-panel";

export const dynamic = "force-dynamic";

export default async function DashboardUpdatesPage() {
  const lang = await getServerLang();
  const fa = lang === "fa";
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {fa ? "فقط مدیر کل به این بخش دسترسی دارد" : "Admin access required"}
      </div>
    );
  }

  const initialData = await getSafeUpdateStatus();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {fa ? "بروزرسانی مداوم و بدون اختلال" : "Continuous Zero-Downtime Delivery"}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {fa ? "بروزرسانی دوره‌ای و گیت" : "Periodic & Git Updates"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {fa
            ? "همگام‌سازی کدها از مخزن گیت همراه با بکاپ خودکار، بدون پاک شدن داده‌ها و بدون قطعی برای کاربران."
            : "Pull code releases from any Git repository with automatic pre-update snapshots and zero data loss."}
        </p>
      </div>

      <SystemUpdaterPanel initialData={initialData} />
    </div>
  );
}
