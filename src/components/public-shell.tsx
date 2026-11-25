import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TmHeader, TmFooter } from "@/components/tm/tm-chrome";
import { TmCursor } from "@/components/tm/tm-effects";
import { TmScrollProgress } from "@/components/tm/tm-sections";
import { getMenu } from "@/lib/menu";
import { getSkin } from "@/lib/skin";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const skin = await getSkin();

  if (skin === "tresmares") {
    return (
      <div className="tm-root min-h-screen flex flex-col bg-white text-[#2b2b2b]">
        <TmCursor />
        <TmScrollProgress />
        <TmHeader />
        <main className="flex-1 pt-[72px]">{children}</main>
        <TmFooter />
      </div>
    );
  }

  const headerMenu = await getMenu("header");
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader menu={headerMenu} />
      <main className="flex-1 pt-14">{children}</main>
      <SiteFooter />
    </div>
  );
}
