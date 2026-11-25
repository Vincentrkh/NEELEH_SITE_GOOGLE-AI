import { HomeInteractive } from "@/components/home-interactive";
import { FeaturedCoursesSection } from "@/components/home-featured-courses";
import { LatestPostsSection } from "@/components/home-latest-posts";
import { ConsultationSection } from "@/components/home-consultation";
import { SiteFooter } from "@/components/site-footer";
import { getMenu } from "@/lib/menu";
import { getSkin } from "@/lib/skin";
import { TmHome } from "@/components/tm/tm-home";

export const dynamic = "force-dynamic";

export default async function Home() {
  const skin = await getSkin();

  if (skin === "tresmares") {
    return <TmHome />;
  }

  const headerMenu = await getMenu("header");

  return (
    <div className="flex min-h-screen flex-col">
      <HomeInteractive menu={headerMenu}>
        <FeaturedCoursesSection />
        <ConsultationSection />
        <LatestPostsSection />
      </HomeInteractive>
      <SiteFooter />
    </div>
  );
}
