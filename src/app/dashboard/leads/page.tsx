import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LeadsTable } from "@/components/leads-table";
import { localeNumber, leadStatusLabel } from "@/lib/format";
import { dict, getServerLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardLeadsPage() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  const isAdmin = user?.roles.includes("ADMIN");
  if (!isAdmin && !user?.permissions.includes("lead.view")) {
    return <div className="p-8 text-center text-muted-foreground">{lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}</div>;
  }
  const canUpdate = isAdmin || user?.permissions.includes("lead.update");
  const canDelete = isAdmin || user?.permissions.includes("lead.delete");
  const t = dict[lang].dashboard;

  const [leads, newCount, contactedCount, convertedCount] = await Promise.all([
    db.lead.findMany({ orderBy: { createdAt: "desc" } }),
    db.lead.count({ where: { status: "NEW" } }),
    db.lead.count({ where: { status: "CONTACTED" } }),
    db.lead.count({ where: { status: "CONVERTED" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {t.leadsEyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {t.leadsTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.leadsSummary
            .replace("{count}", localeNumber(lang, leads.length))
            .replace("{new}", localeNumber(lang, newCount))}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label={t.commonAll} value={localeNumber(lang, leads.length)} />
        <StatBox label={leadStatusLabel(lang, "NEW")} value={localeNumber(lang, newCount)} color="amber" />
        <StatBox label={leadStatusLabel(lang, "CONTACTED")} value={localeNumber(lang, contactedCount)} />
        <StatBox label={leadStatusLabel(lang, "CONVERTED")} value={localeNumber(lang, convertedCount)} color="emerald" />
      </div>

      <LeadsTable
        initialLeads={leads.map((l) => ({
          ...l,
          status: l.status as "NEW" | "CONTACTED" | "CONVERTED",
        }))}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "amber" | "emerald";
}) {
  const colorClass =
    color === "amber" ? "text-amber-700" : color === "emerald" ? "text-emerald-700" : "";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className={`text-2xl font-medium tabular-nums ${colorClass}`}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
