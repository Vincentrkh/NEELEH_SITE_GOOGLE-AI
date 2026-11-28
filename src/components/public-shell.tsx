import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TmHeader, TmFooter } from "@/components/tm/tm-chrome";
import { TmCursor } from "@/components/tm/tm-effects";
import { TmScrollProgress } from "@/components/tm/tm-sections";
import { getMenu } from "@/lib/menu";
import { getSkin } from "@/lib/skin";
import { getCurrentUser, getPortalRole } from "@/lib/auth";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const [skin, currentUser] = await Promise.all([
    getSkin(),
    getCurrentUser().catch(() => null),
  ]);
  const initialPortalRole = getPortalRole(currentUser);

  if (skin === "tresmares") {
    const [officeHeaderMenu, officeFooterMenu] = await Promise.all([
      getMenu("office_header"),
      getMenu("office_footer"),
    ]);
    return (
      <div className="tm-root min-h-screen flex flex-col bg-[var(--tm-white)] text-[var(--tm-darkest)]">
        <TmCursor />
        <TmScrollProgress />
        <TmHeader menu={officeHeaderMenu} initialPortalRole={initialPortalRole} />
        <main className="flex-1 pt-[72px]">{children}</main>
        <TmFooter menu={officeFooterMenu} />
      </div>
    );
  }

  const headerMenu = await getMenu("header");
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader menu={headerMenu} initialPortalRole={initialPortalRole} />
      <main className="flex-1 pt-14">{children}</main>
      <SiteFooter />
    </div>
  );
}
