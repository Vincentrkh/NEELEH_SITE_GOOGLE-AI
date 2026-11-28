import { HomeInteractive } from "@/components/home-interactive";
import { FeaturedCoursesSection } from "@/components/home-featured-courses";
import { LatestPostsSection } from "@/components/home-latest-posts";
import { ConsultationSection } from "@/components/home-consultation";
import { SiteFooter } from "@/components/site-footer";
import { getMenu } from "@/lib/menu";
import { getSkin } from "@/lib/skin";
import { getCurrentUser, getPortalRole } from "@/lib/auth";
import { TmHome } from "@/components/tm/tm-home";

export const dynamic = "force-dynamic";

export default async function Home() {
  const skin = await getSkin();

  if (skin === "tresmares") {
    return <TmHome />;
  }

  const [headerMenu, currentUser] = await Promise.all([
    getMenu("header"),
    getCurrentUser().catch(() => null),
  ]);
  const initialPortalRole = getPortalRole(currentUser);

  return (
    <div className="flex min-h-screen flex-col">
      <HomeInteractive menu={headerMenu} initialPortalRole={initialPortalRole}>
        <FeaturedCoursesSection />
        <ConsultationSection />
        <LatestPostsSection />
      </HomeInteractive>
      <SiteFooter />
    </div>
  );
}
