/* ═══════════════════════════════════════════════════════════════════════════
   TM Theme Config — Source of truth for Tres Mares visual & motion tokens
   ═══════════════════════════════════════════════════════════════════════════ */

export const TMX_COLORS = {
  red: "#e41613",
  redDark: "#d30000",
  graphite: "#2b2b2b",
  overlay: "#18181a",
  greyMid: "#d5d5d5",
  greyPale: "#f2f2f2",
  greyLightest: "#f7f7f7",
  hairline: "rgba(43, 43, 43, 0.2)",
  white: "#ffffff",
} as const;

export const TMX_FONTS = {
  sans: '"Instrument Sans Var", "Estedad Var", "Vazirmatn Var", Helvetica, Arial, sans-serif',
  numeric: 'var(--font-tm-serif), "Instrument Serif", "Estedad Var", Georgia, serif',
} as const;

export const TMX_EASE = {
  out: [0.16, 1, 0.3, 1] as const,
  p2out: [0.5, 1, 0.89, 1] as const,
  inOut: [0.87, 0, 0.13, 1] as const,
} as const;

export const TMX_HERO_SCENE = {
  scrollScaleFrom: 1.04,
  scrollScaleTo: 1.24,
} as const;

export const TMX_STRATEGY = {
  stageViewports: 4,
  imageYPercent: 18,
  textYPercent: 28,
} as const;

export const TMX_TIMELINE = {
  frameOpenSeconds: 1.4,
  frameOpenFrom: "inset(50%)",
  frameOpenTo: "inset(0%)",
  rollSeconds: 1.4,
  rollStagger: 0.035,
} as const;

export const TMX_REVEAL = {
  headingOpacityFrom: 0.08,
  headingStagger: 0.02,
} as const;

export const TMX_WHEEL = {
  items: 11,
  rotationRangeDeg: 95,
} as const;

/* ── 4 Core Educational Pillars matching Tres Mares 4-part Strategy Stage ─ */

export const TMX_STRATEGIES = [
  {
    id: "drafting",
    label: { fa: "ترسیم فاز دوم", en: "Phase-2 Drafting" },
    title: { fa: ["ترسیم", "فاز دوم"], en: ["Phase-2", "Drafting"] },
    desc: {
      fa: "از اصول ترسیم فاز دوم تا نقشه‌کشی اجرایی حرفه‌ای؛ پایه‌ای دقیق که هر معمار و دفتر معماری برای اجرای بی‌نقص نیاز دارد.",
      en: "From Phase-2 drafting principles to complete construction documentation — the technical backbone every studio needs.",
    },
    kpi: [
      { key: { fa: "سطح", en: "Level" }, value: { fa: "مبتدی → حرفه‌ای", en: "Foundation → Pro" } },
      { key: { fa: "مدت دوره", en: "Duration" }, value: { fa: "+۲۴ ساعت", en: "24h+" } },
      { key: { fa: "خروجی", en: "Output" }, value: { fa: "ست نقشه اجرایی", en: "Execution Set" } },
      { key: { fa: "نرم‌افزار", en: "Tools" }, value: { fa: "AutoCAD · Standards", en: "AutoCAD · Codes" } },
    ],
    art: "slab" as const,
    href: "/courses?tier=BEGINNER",
  },
  {
    id: "bim",
    label: { fa: "مدل‌سازی BIM", en: "BIM & Revit" },
    title: { fa: ["مدل‌سازی", "BIM & Revit"], en: ["BIM &", "Revit"] },
    desc: {
      fa: "مدل‌سازی اطلاعات ساختمان، فمیلی‌سازی استاندارد، هماهنگی بین رشته‌ای و خروجی متره دقیق برای پروژه‌های واقعی.",
      en: "Building Information Modeling workflows combining federated Revit models, clash coordination, and automated schedules.",
    },
    kpi: [
      { key: { fa: "سطح", en: "Level" }, value: { fa: "متوسط", en: "Intermediate" } },
      { key: { fa: "مدت دوره", en: "Duration" }, value: { fa: "+۳۰ ساعت", en: "30h+" } },
      { key: { fa: "خروجی", en: "Output" }, value: { fa: "مدل LOD 350", en: "LOD 350 Model" } },
      { key: { fa: "نرم‌افزار", en: "Tools" }, value: { fa: "Revit · Navisworks", en: "Revit · BIM 360" } },
    ],
    art: "cross" as const,
    href: "/courses?tier=INTERMEDIATE",
  },
  {
    id: "parametric",
    label: { fa: "طراحی پارامتریک", en: "Parametric Design" },
    title: { fa: ["طراحی", "پارامتریک"], en: ["Parametric", "Design"] },
    desc: {
      fa: "هندسه الگوریتمی، پوسته و سازه‌های پیچیده با Rhino و Grasshopper؛ طراحی که از منطق و داده شکل می‌گیرد.",
      en: "Algorithmic geometry, façade rationalization, and structural form-finding built with Rhino and Grasshopper.",
    },
    kpi: [
      { key: { fa: "سطح", en: "Level" }, value: { fa: "متوسط → پیشرفته", en: "Mid → Senior" } },
      { key: { fa: "تخصص", en: "Focus" }, value: { fa: "هندسه الگوریتمی", en: "Computational Geometry" } },
      { key: { fa: "خروجی", en: "Output" }, value: { fa: "اسکریپت ساخت", en: "Fabrication Files" } },
      { key: { fa: "نرم‌افزار", en: "Tools" }, value: { fa: "Rhino · Grasshopper", en: "Rhino · Grasshopper" } },
    ],
    art: "circle" as const,
    href: "/paths",
  },
  {
    id: "ai",
    label: { fa: "هوش مصنوعی", en: "AI Workflows" },
    title: { fa: ["معماری", "با AI"], en: ["AI Studio", "Systems"] },
    desc: {
      fa: "اتوماسیون مراحل کانسپت، پرزانته، تحلیل پلان و کدنویسی ابزارهای هوشمند در کنار معمار — بدون حذف خلاقیت انسانی.",
      en: "AI-augmented concept exploration, rendering automation, and studio agents engineered to amplify the practicing architect.",
    },
    kpi: [
      { key: { fa: "سطح", en: "Level" }, value: { fa: "همه سطوح", en: "All Levels" } },
      { key: "Duration" === "Duration" ? { fa: "مدت دوره", en: "Duration" } : { fa: "مدت", en: "Duration" }, value: { fa: "+۱۶ ساعت", en: "16h+" } },
      { key: { fa: "خروجی", en: "Output" }, value: { fa: "پایپ‌لاین AI", en: "Studio Pipeline" } },
      { key: { fa: "فرمت", en: "Format" }, value: { fa: "زنده آنلاین", en: "Live Online" } },
    ],
    art: "gable" as const,
    href: "/ai-lab",
  },
] as const;

export const TMX_MILESTONES = [
  {
    year: 1376,
    fa: "شروع ورود حرفه‌ای به دنیای BIM با Archicad",
    en: "Entering the professional BIM world with Archicad",
    faSub: "آغاز طراحی و مستندسازی یکپارچه معماری بر پایه مدل‌سازی اطلاعات ساختمان.",
    enSub: "First structured architectural workflows grounded in Archicad object-based BIM.",
  },
  {
    year: 1378,
    fa: "طراحی سردر دانشگاه پیام نور (تیپ شده در استان)",
    en: "Payame Noor University Portal — standardized provincial prototype",
    faSub: "طراحی سردر شاخص دانشگاهی با قابلیت تکرار تیپ و تطبیق با اقلیم استان.",
    enSub: "Monumental gateway architecture adopted as a modular provincial standard.",
  },
  {
    year: 1389,
    fa: "طراحی و ساخت ساعت آفتابی قطبی - افقی (دانش و رفتار خورشید و اقلیم)",
    en: "Design & fabrication of Polar-Horizontal Sundial",
    faSub: "مطالعه و پیاده‌سازی دقیق زاویه تابش خورشید، محور قطبی و رفتار اقلیمی در فضا.",
    enSub: "Applied solar geometry, latitude calibration, and climatic orientation built in full scale.",
  },
  {
    year: 1400,
    fa: "طراحی پلازای شهری - Archicad (و شکل‌گیری هم‌افزایی تجربه‌ها زیر نام نیله)",
    en: "Urban Plaza design in Archicad & emergence of Neeleh",
    faSub: "مدل‌سازی کامل فضای عمومی شهری در Archicad و تجمیع تجربه‌های ۱۳۷۹ تا امروز در نیله.",
    enSub: "Comprehensive public plaza BIM delivery alongside the unification of practice since 2000 under Neeleh.",
  },
  {
    year: 1401,
    fa: "طراحی الگوریتم پارامتریک آجری",
    en: "Parametric brick masonry algorithm design",
    faSub: "تدوین منطق محاسباتی برای آجرچینی هوشمند، گردش نور و کنترل زوایای چیدمان نما.",
    enSub: "Computational Grasshopper definitions driving perforated and rotated brickwork facades.",
  },
  {
    year: 1402,
    fa: "تلفیق GFRC در طراحی BIM",
    en: "Integrating GFRC modular panels into BIM workflows",
    faSub: "مدل‌سازی دقیق پنل‌های بتن مسلح به الیاف شیشه، اتصالات خشک و لیست‌وفر در محیط BIM.",
    enSub: "Panel rationalization, shop-drawing scheduling, and fabrication tolerances inside BIM.",
  },
  {
    year: 1403,
    fa: "مدل‌سازی BIM و مستندسازی میراث دامغان و کارگاه‌های تخصصی",
    en: "Heritage BIM documentation in Damghan & specialized workshops",
    faSub: "بازآفرینی دیجیتال آثار معماری دامغان و انتقال تجربه مستقیم در کارگاه‌های حضوری و آنلاین.",
    enSub: "3D architectural documentation of Damghan landmarks and studio-led BIM cohorts.",
  },
  {
    year: 1404,
    fa: "گسترش گردش‌کارهای هوش مصنوعی و طراحی محاسباتی",
    en: "Expanding AI-augmented architecture & computational systems",
    faSub: "تلفیق هوش مصنوعی مولد، اتوماسیون نقشه و مدل‌سازی پارامتریک در مسیرهای آموزشی.",
    enSub: "Integrating generative AI pipelines and automated BIM coordination across curriculum tiers.",
  },
  {
    year: 1405,
    fa: "اکوسیستم جامع آموزش CAD · BIM · Parametric · AI در نیله",
    en: "Unified Neeleh Academy ecosystem for CAD, BIM & AI",
    faSub: "آکادمی بدون وابستگی به مکان خاص، با برگزاری کلاس‌های حضوری در دامغان و آنلاین سراسری.",
    enSub: "Location-independent academy connecting in-person Damghan cohorts with studios nationwide.",
  },
] as const;

/* Cities shown on the Semi-Circular Expansion Arc */
export const TMX_CITIES = [
  { caption: "Tabriz", captionFa: "تبریز", note: "Online" },
  { caption: "Rasht", captionFa: "رشت", note: "Online" },
  { caption: "Shiraz", captionFa: "شیراز", note: "Online" },
  { caption: "Isfahan", captionFa: "اصفهان", note: "Online" },
  { caption: "Mashhad", captionFa: "مشهد", note: "Online" },
  { caption: "Damghan", captionFa: "دامغان", note: "Class Venue" },
  { caption: "Yazd", captionFa: "یزد", note: "Online" },
  { caption: "Ahvaz", captionFa: "اهواز", note: "Online" },
  { caption: "Kerman", captionFa: "کرمان", note: "Online" },
  { caption: "Dubai", captionFa: "دبی", note: "Alumni" },
  { caption: "London", captionFa: "لندن", note: "Alumni" },
] as const;

export const TMX_STATS_FALLBACK = {
  founded: "2000",
  foundedShamsi: "1379",
  years: "+26",
  graduates: "+300",
  hours: "16 - 36",
  courses: "9",
  paths: "3",
} as const;
