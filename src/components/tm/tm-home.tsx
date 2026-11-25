import { db } from "@/lib/db";
import { TmHeader, TmFooter } from "@/components/tm/tm-chrome";
import { TmSmoothScroll, TmCursor } from "@/components/tm/tm-effects";
import { TmCityWheel } from "@/components/tm/tm-motion";
import { TmStrategyStage } from "@/components/tm/tm-morph-mark";
import {
  TmHero,
  TmTextBlock,
  TmGridNumbers,
  TmTeam,
  TmScrollProgress,
  type TmData,
} from "@/components/tm/tm-sections";
import { TMX_STRATEGIES, TMX_CITIES } from "@/config/tm-theme";
import { getServerLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * TmHome — Exact 8-Band Structure Matching https://www.tresmarescapital.com/en/
 *
 *   1. TmHero            (Cloudsea SVG landscape + stepped display H1 + bottom-right CTA)
 *   2. TmTextBlock       ("About Neeleh" centered scroll-fill statement)
 *   3. TmGridNumbers     (Sticky intro + 6 tall staggered KPI cards)
 *   4. TmTextBlock       ("Educational Architecture" centered scroll-fill intro)
 *   5. TmStrategyStage   (Pinned #D5D5D5 3600px stage + Red Morphing Mark + 4 slides)
 *   6. TmCityWheel       ("Our expansion" convex arch wheel + halftone map + 3 hubs)
 *   7. TmTeam            (#F7F7F7 statement + edge-to-edge monochrome portrait strip)
 *   8. TmFooter          (#F2F2F2 unified footer: CTA + horizontal 5-plate SVG strip + legal bar)
 */
export async function TmHome() {
  const data = await loadTmData();

  return (
    <main className="tm-root" style={{ background: "#fff", color: "#2b2b2b" }}>
      <TmSmoothScroll />
      <TmCursor />
      <TmScrollProgress />
      <TmHeader />

      {/* Band 1 */}
      <TmHero />

      {/* Band 2 */}
      <TmTextBlock
        id="about-intro"
        eyebrow={{ fa: "درباره آکادمی نیله", en: "About Neeleh" }}
        text={{
          fa: "آکادمی تخصصی سیستم‌های هوشمند معماری — از ترسیم فاز دوم تا BIM، دیزاین محاسباتی و معماری افزوده با هوش مصنوعی.",
          en: "An architecture education studio helping professionals master execution drafting, BIM, and AI-augmented systems.",
        }}
      />

      {/* Band 3 */}
      <TmGridNumbers stats={data.stats} />

      {/* Band 4 */}
      <TmTextBlock
        id="strategy-intro"
        eyebrow={{ fa: "معماری آموزش", en: "Educational architecture" }}
        text={{
          fa: "چهار ستون آموزشی ما بر پایه تجربه اجرا بنا شده‌اند؛ از میز نقشه‌کشی تا گردش‌کار هوشمند معماری.",
          en: "Our four core pillars guide architects across every career stage, from technical documentation to AI studios.",
        }}
      />

      {/* Band 5 */}
      <TmStrategyStage strategies={TMX_STRATEGIES} />

      {/* Band 6 */}
      <TmCityWheel
        cities={TMX_CITIES}
        address={data.address}
        phone={data.phone}
        email={data.email}
        hours={data.hours}
      />

      {/* Band 7 */}
      <TmTeam instructors={data.instructors} />

      {/* Band 8 */}
      <TmFooter />
    </main>
  );
}

/** Load live settings & published instructors with safe fallbacks */
async function loadTmData(): Promise<TmData> {
  const lang = await getServerLang();
  const fa = lang === "fa";
  const fallback: TmData = {
    stats: { years: "+26", courses: "9", graduates: "+300" },
    address: fa ? "دامغان — محل برگزاری کلاس‌های حضوری آکادمی نیله" : "Damghan — Neeleh Academy Class Venue",
    phone: "023-35230050 · 09120738211",
    email: "hello@neeleh.academy",
    hours: fa ? "شنبه تا چهارشنبه، ۹ تا ۱۸" : "Sat–Wed, 9:00–18:00",
    instructors: [],
  };

  try {
    const [settings, instructors] = await Promise.all([
      db.setting.findMany(),
      db.user.findMany({
        where: { coursesTaught: { some: { published: true } } },
        select: {
          id: true,
          name: true,
          nameEn: true,
          field: true,
          avatarUrl: true,
          _count: { select: { coursesTaught: { where: { published: true } } } },
        },
        take: 8,
        orderBy: { name: "asc" },
      }),
    ]);

    const map = new Map(settings.map((s) => [s.key, s.value] as const));

    return {
      stats: {
        years: map.get("stats.years") ?? fallback.stats.years,
        courses: map.get("stats.courses") ?? fallback.stats.courses,
        graduates: map.get("stats.graduates") ?? fallback.stats.graduates,
      },
      address: fa
        ? (map.get("contact.address") ?? fallback.address)
        : (map.get("contact.addressEn") || fallback.address),
      phone: map.get("contact.phone") ?? fallback.phone,
      email: map.get("contact.email") ?? fallback.email,
      hours: fa
        ? (map.get("contact.hours") ?? fallback.hours)
        : (map.get("contact.hoursEn") || fallback.hours),
      instructors: instructors.map((u) => ({
        id: u.id,
        name: fa ? u.name : (u.nameEn || u.name),
        field: u.field,
        avatarUrl: u.avatarUrl,
      })),
    };
  } catch {
    return fallback;
  }
}
