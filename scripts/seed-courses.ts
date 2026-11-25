/**
 * Seed دوره‌های آکادمی نیله — ۹ دوره در ۳ سطح
 * اجرا: bun scripts/seed-courses.ts   (idempotent — بر اساس slug آپسرت می‌کند)
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const TIER_BEGINNER_BANNER = "/images/tier-beginner.svg";
const TIER_INTERMEDIATE_BANNER = "/images/tier-intermediate.svg";
const TIER_PRO_BANNER = "/images/tier-pro.svg";

type SectionSeed = { title: string; items: string[] };
type CourseSeed = {
  slug: string;
  title: string;
  tier: "BEGINNER" | "INTERMEDIATE" | "PRO";
  category: string;
  tags: string[];
  description: string;
  about: string;
  outputs: string[];
  prereqs: string;
  durationHrs: number;
  price: number;
  capacity: number;
  regStatus: "OPEN" | "FULL" | "CLOSED";
  featured: boolean;
  bannerUrl: string;
  sortOrder: number;
  sections: SectionSeed[];
};

const COURSES: CourseSeed[] = [
  // ═══════════════ لایه ۱ — مبتدی ═══════════════
  {
    slug: "autocad-phase2",
    title: "مسترفصل نقشه‌کشی اجرایی و فاز دو با AutoCAD / GstarCAD",
    tier: "BEGINNER",
    category: "نقشه‌کشی و فاز دو",
    tags: ["مبتدی", "پروژه‌محور", "حضوری"],
    description:
      "تسلط بر ضوابط شهرداری و نظام مهندسی، لایه‌بندی اصولی و ترسیم پکیج کامل فاز دو ساختمان مسکونی رایج در بازار کار.",
    about:
      "بزرگ‌ترین چالش هنرجویان معماری، فاصله بین ترسیم دانشگاهی و نقشه‌ای است که شهرداری و نظام مهندسی قبول می‌کند. در این دوره به‌جای آموزش صرف دستورات نرم‌افزار، یک پروژه کامل ساختمان مسکونی را از صفر تا آماده‌سازی برای اخذ پروانه پیش می‌بریم و ضوابط واقعی را روی همان پروژه تمرین می‌کنیم.",
    outputs: [
      "پکیج کامل فاز ۲ یک ساختمان مسکونی (پلان‌ها، نما، مقطع، جزئیات)",
      "تسلط بر ضوابط شهرداری و نظام مهندسی در ترسیم نقشه‌های اجرایی",
      "کار حرفه‌ای با لایه‌ها، بلوک‌ها و استانداردهای تحویل نقشه به مهندس ناظر",
      "رزومه‌ای با یک نمونه‌کار واقعی قابل ارائه در دفاتر معماری",
    ],
    prereqs: "آشنایی مقدماتی با ویندوز؛ نیازی به سابقه ترسیم نیست",
    durationHrs: 48,
    price: 6500000,
    capacity: 12,
    regStatus: "OPEN",
    featured: true,
    bannerUrl: TIER_BEGINNER_BANNER,
    sortOrder: 1,
    sections: [
      {
        title: "فصل اول — استاندارد ترسیم اجرایی",
        items: [
          "محیط AutoCAD / GstarCAD و تنظیمات پروژه",
          "لایه‌بندی استاندارد نقشه‌های فاز ۲",
          "مقیاس، شیت‌بندی و Plot حرفه‌ای",
        ],
      },
      {
        title: "فصل دوم — ترسیم پلان‌های اجرایی",
        items: [
          "پلان مبلمان و پلان تفکیک مطابق ضوابط شهرداری",
          "پلان سقف، جانمایی تاسیسات و مقاطع",
          "نشیمن، پارکینگ، اختلاف سطح و رامپ",
        ],
      },
      {
        title: "فصل سوم — نما، جزئیات و بستن پکیج",
        items: [
          "ترسیم نما و مصالح‌گذاری",
          "جزئیات اجرایی و نرم‌افزارهای کمکی",
          "بستن پکیج نهایی برای تحویل به مهندس ناظر",
        ],
      },
    ],
  },
  {
    slug: "sketchup-modeling",
    title: "مدلسازی سریع حجم، دکوراسیون و حجم‌پردازی با SketchUp",
    tier: "BEGINNER",
    category: "مدلسازی ۳ بعدی",
    tags: ["مبتدی", "حضوری"],
    description:
      "یادگیری سریع ابزارهای مدلسازی حجمی، مدیریت دقیق کامپوننت‌ها و آماده‌سازی احجام برای رندرینگ و ارائه.",
    about:
      "مدلسازی با SketchUp ساده است، اما مدلسازی حرفه‌ای که بتواند به رندر و آماده‌سازی برای کارفرما وصل شود، فنون خاص خود را دارد. در این دوره فراتر از ابزارهای ابتدایی، مدیریت کامپوننت، سازماندهی لایه‌ها و افزونه‌های کاربردی را هم می‌آموزید.",
    outputs: [
      "مدلسازی سریع و تمیز از حجم شهری، نمای ساختمان و فضای داخلی",
      "مدیریت کامپوننت و گروه برای ویرایش آسان در پروژه‌های بزرگ",
      "آماده‌سازی مدل برای رندرینگ با V-Ray یا Enscape",
      "خروجی‌های حرفه‌ای: صحنه‌های مرتب و آماده ارائه",
    ],
    prereqs: "آشنایی مقدماتی با ویندوز",
    durationHrs: 32,
    price: 4500000,
    capacity: 12,
    regStatus: "FULL",
    featured: true,
    bannerUrl: TIER_BEGINNER_BANNER,
    sortOrder: 2,
    sections: [
      {
        title: "فصل اول — ابزارهای پایه و مدیریت اجزا",
        items: [
          "ابزارهای Push/Pull و Group & Component",
          "مدیریت لایه‌ها و صحنه‌ها (Scenes)",
          "استایل‌ها، سایه و خروجی‌های اولیه",
        ],
      },
      {
        title: "فصل دوم — مدلسازی شهری و داخلی",
        items: [
          "مدلسازی بدنه شهری و نمای ساختمان",
          "جزئیات دکوراسیون داخلی و مبلمان",
          "افزونه‌های کاربردی برای سرعت",
        ],
      },
      {
        title: "فصل سوم — آماده‌سازی برای رندر",
        items: [
          "متریال‌گذاری اولیه",
          "جانمایی نور و دوربین",
          "خروجی صحنه نهایی برای V-Ray / Enscape",
        ],
      },
    ],
  },
  {
    slug: "revit-bim",
    title: "مدلسازی اطلاعات ساختمان (BIM) با Revit Architecture",
    tier: "BEGINNER",
    category: "سیستم‌های BIM",
    tags: ["مبتدی", "حضوری"],
    description:
      "ورود به دنیای مدلسازی هوشمند BIM، استخراج نقشه‌ها و جداول متریال استانداردهای مهندسی.",
    about:
      "BIM یعنی فراتر از ترسیم: یک مدل هوشمند که اطلاعات هر جزء (دیوار، در، پنجره) را در خود نگه می‌دارد و نقشه‌ها و جداول متریال را به‌صورت خودکار استخراج می‌کند. در این دوره روی یک پروژه مسکونی کامل، از تنظیمات اولیه تا استخراج Schedule را کار می‌کنیم.",
    outputs: [
      "ساخت یک مدل BIM کامل از یک ساختمان مسکونی",
      "استخراج خودکار پلان، مقطع، نما و جدول متریال (Schedules)",
      "کار با خانواده‌ها (Families) و تنظیمات پروژه",
      "آمادگی برای ورود به دفاتری که BIM-first کار می‌کنند",
    ],
    prereqs: "آشنایی با مفاهیم معماری و اتوکد مقدماتی",
    durationHrs: 56,
    price: 8500000,
    capacity: 10,
    regStatus: "OPEN",
    featured: true,
    bannerUrl: TIER_BEGINNER_BANNER,
    sortOrder: 3,
    sections: [
      {
        title: "فصل اول — مفاهیم BIM و تنظیمات",
        items: [
          "مفاهیم BIM و تفاوت با CAD سنتی",
          "تنظیمات اولیه، Levels و Grids",
          "کار با Views و Sheet layout",
        ],
      },
      {
        title: "فصل دوم — المان‌های معماری",
        items: [
          "ترسیم هوشمند دیوار، در، پنجره، کف و پله",
          "ساخت بام و سقف کاذب",
          "جزئیات معماری داخلی",
        ],
      },
      {
        title: "فصل سوم — مستندسازی",
        items: [
          "تگ‌گذاری و annotation",
          "استخراج جدول متریال (Schedules)",
          "خروجی نهایی پکیج نقشه‌ها",
        ],
      },
    ],
  },
  // ═══════════════ لایه ۲ — متوسط ═══════════════
  {
    slug: "rhino-nurbs",
    title: "مدلسازی پیشرفته، هندسه‌های پیچیده و سطوح NURBS با Rhino",
    tier: "INTERMEDIATE",
    category: "مدلسازی پیشرفته",
    tags: ["متوسط", "فرم‌پردازی"],
    description:
      "تسلط بر هندسه‌های آزاد، سطوح پیچیده و ساخت احجام دقیق معماری بدون خطا.",
    about:
      "وقتی فرم از خطوط راست فراتر می‌رود، AutoCAD و SketchUp دیگر جواب نمی‌دهند. Rhino با سطوح NURBS امکان ساخت هر فرم پیچیده‌ای را فراهم می‌کند — از پوسته‌های ارگانیک تا فرم‌های پارامتریک. در این دوره روی هندسه آزاد و تبادل داده با دیگر نرم‌افزارها تمرکز می‌کنیم.",
    outputs: [
      "مدلسازی پوسته‌ها و احجام ارگانیک پیچیده",
      "تبدیل مدل به نقشه‌های اجرایی و اتوکد",
      "آماده‌سازی مدل برای رندر و تحلیل ساختاری",
      "یک نمونه‌کار فرم‌پردازی برای رزومه",
    ],
    prereqs: "تسلط بر AutoCAD یا SketchUp در سطح متوسط",
    durationHrs: 40,
    price: 7000000,
    capacity: 10,
    regStatus: "OPEN",
    featured: false,
    bannerUrl: TIER_INTERMEDIATE_BANNER,
    sortOrder: 4,
    sections: [
      {
        title: "فصل اول — مبانی هندسه NURBS",
        items: [
          "خطوط Curve، سطوح Surface و Polysurface",
          "تحلیل و ویرایش سطوح",
          "مدیریت خطاهای رایج مدلسازی",
        ],
      },
      {
        title: "فصل دوم — فرم‌پردازی پیشرفته",
        items: [
          "ساخت پوسته‌ها و احجام ارگانیک",
          "تکنیک‌های فرم‌یابی و pipeline",
          "تبدیل به مش (Mesh) برای رندر",
        ],
      },
      {
        title: "فصل سوم — تبادل داده",
        items: [
          "خروجی DWG برای AutoCAD",
          "خروجی برای Revit و SketchUp",
          "خروجی برای Grasshopper",
        ],
      },
    ],
  },
  {
    slug: "enscape-vray",
    title: "رندرینگ رئال، نورپردازی و انیمیشن با Enscape / Lumion / V-Ray",
    tier: "INTERMEDIATE",
    category: "رندرینگ و ارائه",
    tags: ["متوسط", "حضوری"],
    description:
      "تنظیمات حرفه‌ای نور و اقلیم، متریال‌سازی فیزیکی و ساخت تورهای مجازی رئال برای ارائه به کارفرما.",
    about:
      "مدل خوب، با رندر خوب فروخته می‌شود. در این دوره نورپردازی فیزیکی، متریال‌های PBR و خروجی‌های حرفه‌ای (تصویر، انیمیشن و تور مجازی) را روی یک پروژه واقعی کار می‌کنیم.",
    outputs: [
      "نورپردازی روز و شب برای یک پروژه مسکونی",
      "متریال‌سازی PBR کامل (بتن، شیشه، فلز، چوب)",
      "تور مجازی ۳۶۰ درجه برای ارائه به کارفرما",
      "انیمیشن کوتاه از پروژه",
    ],
    prereqs: "مدلسازی با SketchUp یا Revit در سطح متوسط",
    durationHrs: 36,
    price: 6000000,
    capacity: 12,
    regStatus: "OPEN",
    featured: false,
    bannerUrl: TIER_INTERMEDIATE_BANNER,
    sortOrder: 5,
    sections: [
      {
        title: "فصل اول — نورپردازی فیزیکی",
        items: [
          "تنظیمات خورشید، سایه و آسمان",
          "نورهای مصنوعی داخلی و خارجی",
          "HDRI و نور محیطی",
        ],
      },
      {
        title: "فصل دوم — متریال‌سازی PBR",
        items: [
          "Roughness، Bump و Displacement",
          "متریال شیشه، فلز و مایع",
          "متریال‌های طبیعی (چوب، سنگ، بتن)",
        ],
      },
      {
        title: "فصل سوم — خروجی‌های حرفه‌ای",
        items: [
          "قاب‌بندی و اصول عکاسی معماری",
          "Depth of Field و Bokeh",
          "انیمیشن و تور مجازی ۳۶۰",
        ],
      },
    ],
  },
  {
    slug: "excel-smart-takeoff",
    title: "اکسل کاربردی، متره هوشمند و مدیریت پروژه‌های معماری",
    tier: "INTERMEDIATE",
    category: "مدیریت دفتر و متره",
    tags: ["متوسط", "کاربردی"],
    description:
      "فرمول‌نویسی پیشرفته برای متره مصالح، محاسبه هزینه ساخت و تنظیم پروپوزال‌های مالی دفاتر.",
    about:
      "اکسل ابزار اصلی مدیریت دفتر معماری است. در این دوره فراتر از فرمول‌های پایه، ساخت متره هوشمند متصل به داده‌های نقشه و فرمول‌های محاسبه حق‌الزحمه طراحی را کار می‌کنیم.",
    outputs: [
      "یک فایل متره هوشمند قابل استفاده مجدد برای پروژه‌ها",
      "فرمول‌های محاسبه هزینه ساخت",
      "قالب قرارداد طراحی",
      "داشبورد مدیریت پروژه در اکسل",
    ],
    prereqs: "آشنایی مقدماتی با اکسل",
    durationHrs: 24,
    price: 4000000,
    capacity: 14,
    regStatus: "OPEN",
    featured: false,
    bannerUrl: TIER_INTERMEDIATE_BANNER,
    sortOrder: 6,
    sections: [
      {
        title: "فصل اول — فرمول‌نویسی و توابع کلیدی",
        items: [
          "توابع متنی، عددی و شرطی",
          "VLOOKUP / XLOOKUP و INDEX-MATCH",
          "مدیریت داده‌های حجیم",
        ],
      },
      {
        title: "فصل دوم — متره هوشمند",
        items: [
          "اتصال داده‌های نقشه به اکسل",
          "ساخت جدول متره داینامیک",
          "محاسبه خودکار مصالح",
        ],
      },
      {
        title: "فصل سوم — مدیریت پروژه",
        items: [
          "محاسبه حق‌الزحمه طراحی",
          "تنظیم قراردادهای تیپ",
          "داشبورد مدیریت پروژه",
        ],
      },
    ],
  },
  // ═══════════════ لایه ۳ — حرفه‌ای ═══════════════
  {
    slug: "grasshopper-parametric",
    title: "طراحی پارامتریک و الگوریتمیک با Grasshopper (از پایه تا Facade Generator)",
    tier: "PRO",
    category: "Computational Design",
    tags: ["حرفه‌ای", "الگوریتمیک"],
    description:
      "یادگیری منطق داده‌ها و ساخت سیستم‌های هوشمند هندسی برای تولید نماها و پوسته‌های متغیر.",
    about:
      "پارامتریک یعنی طراحی با منطق داده، نه فقط با دست. در Grasshopper شما یک سیستم هندسی می‌سازید که با تغییر پارامترها، فرم‌های مختلف تولید می‌کند. در این دوره از Data Trees تا Facade Generator پیش می‌رویم.",
    outputs: [
      "ساخت یک Facade Generator قابل استفاده مجدد",
      "تسلط بر Data Trees و مدیریت داده‌ها",
      "تبدیل کانسپت به پارامتر قابل تنظیم",
      "یک نمونه‌کار پارامتریک برای رزومه",
    ],
    prereqs: "تسلط بر Rhino در سطح متوسط",
    durationHrs: 60,
    price: 12000000,
    capacity: 10,
    regStatus: "OPEN",
    featured: true,
    bannerUrl: TIER_PRO_BANNER,
    sortOrder: 7,
    sections: [
      {
        title: "فصل اول — مبانی Grasshopper",
        items: [
          "شناخت ساختار داده‌ها (Data Trees)",
          "لیست‌ها و مدیریت شاخه‌ها",
          "عملیات ریاضی و منطقی",
        ],
      },
      {
        title: "فصل دوم — هندسه محاسباتی",
        items: [
          "ترسیم و تبدیل هندسه در گرس‌هاپر",
          "کنترل فرم با پارامترها",
          "الگوریتم‌های تولید فرم",
        ],
      },
      {
        title: "فصل سوم — پروژه Facade Generator",
        items: [
          "ساخت سیستم هوشمند طراحی نما",
          "پنل‌های متحرک و مشبک",
          "بهینه‌سازی با Galapagos",
        ],
      },
    ],
  },
  {
    slug: "b2b-automation",
    title: "اتوماسیون فرآیندها و بهینه‌سازی مستندات دفاتر معماری",
    tier: "PRO",
    category: "اتوماسیون B2B",
    tags: ["حرفه‌ای", "ویژه دفاتر"],
    description:
      "شناسایی گلوگاه‌های تکراری در دفاتر و ساخت ابزارهای کمکی برای افزایش سرعت و کاهش خطای مستندات.",
    about:
      "این دوره مخصوص دفاتر معماری است. شروع با تحلیل کارهای تکراری در نقشه‌کشی فاز ۲ و مستندسازی، سپس ساخت اسکریپت‌ها و ابزارهای کوچک برای اتوماسیون نام‌گذاری، خطوط تراز و یکپارچه‌سازی گردش کار دفتری.",
    outputs: [
      "نقشه گردش کار دفتری با شناسایی گلوگاه‌ها",
      "ساخت اسکریپت‌های اتوماسیون نام‌گذاری و تراز",
      "قالب‌های استاندارد نقشه و شیت",
      "یکپارچه‌سازی با AutoCAD و Revit",
    ],
    prereqs: "تجربه کار در دفتر معماری؛ تسلط بر AutoCAD",
    durationHrs: 32,
    price: 9000000,
    capacity: 8,
    regStatus: "OPEN",
    featured: false,
    bannerUrl: TIER_PRO_BANNER,
    sortOrder: 8,
    sections: [
      {
        title: "فصل اول — تحلیل فرآیند دفتر",
        items: [
          "شناسایی کارهای تکراری",
          "نقشه گردش کار فعلی",
          "گلوگاه‌های رایج",
        ],
      },
      {
        title: "فصل دوم — ساخت ابزارهای اتوماسیون",
        items: [
          "اسکریپت نام‌گذاری خودکار لایه‌ها",
          "تراز خطوط و پاکسازی نقشه",
          "استخراج آمار از نقشه",
        ],
      },
      {
        title: "فصل سوم — یکپارچه‌سازی",
        items: [
          "اتصال به AutoCAD با Lisp",
          "اتصال به Revit با Dynamo",
          "تعریف قالب استاندارد دفتر",
        ],
      },
    ],
  },
  {
    slug: "ai-architecture",
    title: "معماری در عصر هوش مصنوعی (تلفیق AI + Rhino + BIM)",
    tier: "PRO",
    category: "هوش مصنوعی در معماری",
    tags: ["پیشرفته", "آینده‌نگرانه"],
    description:
      "بهره‌گیری از هوش مصنوعی در ایده‌پردازی فاز صفر و تبدیل سریع کانسپت‌ها به مدل‌های دقیق قابل ساخت.",
    about:
      "هوش مصنوعی در حال بازنویسی فرآیند طراحی است. در این دوره یاد می‌گیرید چطور AI را در فاز صفر (ایده‌پردازی) به کار بگیرید و خروجی‌های آن را به هندسه قابل پردازش در Rhino/Grasshopper تبدیل کنید. همچنین ساختاردهی AI Agents برای تحلیل اولیه طرح‌ها را پوشش می‌دهیم.",
    outputs: [
      "ایده‌پردازی فرمی با ابزارهای AI",
      "تبدیل خروجی AI به هندسه Rhino",
      "ساخت AI Agent برای تحلیل طرح",
      "یک نمونه‌کار AI-driven برای رزومه",
    ],
    prereqs: "تسلط بر Rhino و Grasshopper",
    durationHrs: 40,
    price: 15000000,
    capacity: 10,
    regStatus: "OPEN",
    featured: true,
    bannerUrl: TIER_PRO_BANNER,
    sortOrder: 9,
    sections: [
      {
        title: "فصل اول — ایده‌پردازی با AI",
        items: [
          "ابزارهای AI تصویرساز (Midjourney، Stable Diffusion)",
          "پرامپت‌نویسی معماری",
          "تحلیل و انتخاب خروجی‌ها",
        ],
      },
      {
        title: "فصل دوم — تبدیل به هندسه",
        items: [
          "از تصویر به Curve در Rhino",
          "بازسازی مدل در Grasshopper",
          "بهینه‌سازی و قابل‌ساخت‌کردن",
        ],
      },
      {
        title: "فصل سوم — AI Agents در معماری",
        items: [
          "ساختاردهی Agent برای تحلیل طرح",
          "تحلیل سایت و اقلیم",
          "گزارش‌گیری خودکار",
        ],
      },
    ],
  },
];

async function main() {
  console.log("🌱 شروع seed دوره‌های آکادمی نیله...\n");

  let created = 0;
  let updated = 0;

  for (const c of COURSES) {
    const { sections, tags, outputs, ...rest } = c;
    const data = {
      ...rest,
      tags: tags.join(","),
      outputs: outputs.join("\n"),
    };

    const existing = await db.course.findUnique({ where: { slug: c.slug } });
    if (existing) {
      // آپدیت دوره (بدون دست زدن به sections)
      await db.course.update({ where: { slug: c.slug }, data });
      // بازنویسی sections (idempotent)
      await db.courseSection.deleteMany({ where: { courseId: existing.id } });
      await db.courseSection.createMany({
        data: sections.map((s, i) => ({
          courseId: existing.id,
          title: s.title,
          items: (s.items || []).join("\n"),
          order: i,
        })),
      });
      updated++;
      console.log(`  ↻ آپدیت شد: ${c.slug}`);
    } else {
      const course = await db.course.create({
        data: {
          ...data,
          sections: {
            create: sections.map((s, i) => ({
              title: s.title,
              items: (s.items || []).join("\n"),
              order: i,
            })),
          },
        },
      });
      created++;
      console.log(`  ✓ ساخته شد: ${course.slug}`);
    }
  }

  const total = await db.course.count();
  console.log(`\n✅ seed دوره‌ها کامل شد: ${created} ساخته، ${updated} آپدیت، مجموع ${total} دوره در دیتابیس.`);
}

main()
  .catch((e) => {
    console.error("seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
