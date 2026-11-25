import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardSidebar, type DashboardUser } from "@/components/dashboard-sidebar";
import "./dashboard-motion.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard | Neeleh Academy",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/?next=/dashboard/");
  }

  const canAccessDashboard = user.roles.some((r) => ["ADMIN", "EDITOR"].includes(r));
  if (!canAccessDashboard) {
    redirect("/panel/");
  }

  const userForClient: DashboardUser = {
    id: user.id,
    name: user.name,
    nameEn: user.nameEn,
    phone: user.phone,
    email: user.email,
    avatarUrl: user.avatarUrl,
    roles: user.roles,
    permissions: user.permissions,
  };

  return (
    <div className="min-h-[100svh] bg-background text-foreground flex flex-col lg:flex-row">
      <DashboardSidebar user={userForClient} />
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
