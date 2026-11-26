import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { listAiProvidersAndSections } from "@/lib/ai/connections";
import { AiConnectionsManager } from "@/components/ai-connections-manager";

export const dynamic = "force-dynamic";

export default async function DashboardAiConnectionsPage() {
  const lang = await getServerLang();
  const fa = lang === "fa";
  const user = await requirePermission("setting.manage");
  if (!user) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {fa ? "دسترسی مجاز نیست" : "Access denied"}
      </div>
    );
  }

  const [{ providers, sections }, usage] = await Promise.all([
    listAiProvidersAndSections(),
    db.aIUsageLedger.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        feature: true,
        provider: true,
        model: true,
        status: true,
        latencyMs: true,
        errorCode: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {fa ? "معماری امن اتصال مدل‌های هوشمند" : "Secure Multi-Provider AI Gateway"}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {fa ? "اتصال امن هوش مصنوعی" : "AI Connections & Routing"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {fa
            ? "مدل‌های مختلف هوش مصنوعی را با ذخیره‌سازی رمزنگاری‌شده کلید به هر بخش سایت متصل و آزمایش کنید."
            : "Connect and test AI providers with encrypted credentials and route each section independently."}
        </p>
      </div>

      <AiConnectionsManager
        initialProviders={providers}
        initialSections={sections}
        initialUsage={usage.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
