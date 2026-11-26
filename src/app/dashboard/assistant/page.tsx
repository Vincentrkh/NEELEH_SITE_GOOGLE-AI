import { requirePermission } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { AssistantChat } from "@/components/assistant-chat";

export const dynamic = "force-dynamic";

export default async function DashboardAssistantPage() {
  const lang = await getServerLang();
  const user = await requirePermission("automation.manage");
  if (!user) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}
      </div>
    );
  }

  return <AssistantChat userName={lang === "fa" ? user.name : user.nameEn || user.name} />;
}
