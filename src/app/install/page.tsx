import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isInstalled, getInstallInfo } from "@/lib/installer";
import { InstallerWizard } from "@/components/installer-wizard";

export const dynamic = "force-dynamic";

/**
 * صفحه نصب — /install
 *
 * اگر سیستم قبلاً نصب شده باشد (.installed یا وجود کاربر در دیتابیس)،
 * به /login هدایت می‌شود.
 */
export default async function InstallPage() {
  let hasUsers = false;
  try {
    hasUsers = (await db.user.count()) > 0;
  } catch {
    hasUsers = false;
  }

  if (isInstalled() || hasUsers) {
    const info = getInstallInfo();
    redirect(`/login/?installed=${encodeURIComponent(info?.installedAt ?? "locked")}`);
  }

  return (
    <main className="min-h-[100svh] bg-background">
      <InstallerWizard />
    </main>
  );
}
