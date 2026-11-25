import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { localeNumber } from "@/lib/format";
import { dict, getServerLang } from "@/lib/i18n";
import { UsersManager } from "@/components/users-manager";

export const dynamic = "force-dynamic";

export default async function DashboardUsersPage() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  const isAdmin = user?.roles.includes("ADMIN");
  if (!isAdmin && !user?.permissions.includes("user.view")) {
    return <div className="p-8 text-center text-muted-foreground">{lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}</div>;
  }
  const canUpdate = isAdmin || user?.permissions.includes("user.update");
  const canDelete = isAdmin || user?.permissions.includes("user.delete");
  const t = dict[lang].dashboard;

  const [users, roles] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        nameEn: true,
        phone: true,
        email: true,
        field: true,
        education: true,
        bio: true,
        createdAt: true,
        userRoles: { include: { role: { select: { id: true, name: true, label: true } } } },
        _count: {
          select: {
            registrations: { where: { status: { not: "CANCELLED" } } },
            posts: true,
            files: true,
          },
        },
      },
    }),
    db.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, label: true, isSystem: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {t.usersEyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {t.usersTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.usersSummary.replace("{count}", localeNumber(lang, users.length))}
        </p>
      </div>

      <UsersManager
        initialUsers={users.map((u) => ({
          ...u,
          rolesArray: u.userRoles.map((ur) => ur.role),
          userRoles: undefined,
          registrationCount: u._count.registrations,
          postCount: u._count.posts,
          fileCount: u._count.files,
          _count: undefined,
          isSelf: u.id === user?.id,
        }))}
        roles={roles}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
