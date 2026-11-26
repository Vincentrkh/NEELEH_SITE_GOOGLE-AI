import { db } from "@/lib/db";

type SeedQuestion = {
  prompt: string;
  promptEn: string;
  options: Array<{ id: string; text: string; textEn: string }>;
  correctOptionId: string;
  explanation: string;
  explanationEn: string;
};

const COURSE_EXAM_TEMPLATES: Record<
  string,
  {
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    questions: SeedQuestion[];
  }
> = {
  "autocad-phase2": {
    title: "آزمون جامع نقشه‌کشی اجرایی و استاندارد فاز ۲",
    titleEn: "Phase-2 Architectural Drafting & CAD Final Exam",
    description: "ارزیابی تسلط بر لایه‌بندی استاندارد دفتر فنی، Xref، Annotation Scale و خروجی شیت اجرایی.",
    descriptionEn: "Evaluates CAD layering standards, Xref workflows, annotation scaling, and Phase-2 sheet plotting.",
    questions: [
      {
        prompt: "بهترین روش برای ارجاع فایل پلان سازه درون فایل معماری بدون افزایش بی‌رویه حجم فایل کدام است؟",
        promptEn: "Which method links a structural plan into an architectural sheet without bloating the host DWG?",
        options: [
          { id: "a", text: "کپی‌پیست مستقیم تمام آبجکت‌ها", textEn: "Copy-paste all geometry directly" },
          { id: "b", text: "استفاده از External Reference (Xref) با حالت Overlay", textEn: "Attach via External Reference (Xref) Overlay" },
          { id: "c", text: "تبدیل کل پلان به Block تکی در مدل‌اسپیس", textEn: "Explode and merge into a single Block" },
          { id: "d", text: "ذخیره فایل با فرمت DXF قدیمی", textEn: "Save as legacy DXF format" },
        ],
        correctOptionId: "b",
        explanation: "Xref با حالت Overlay از ایجاد حلقه‌های تکرارشونده بین فایل‌های تیم جلوگیری کرده و همگام‌سازی خودکار تغییرات را ممکن می‌سازد.",
        explanationEn: "Xref Overlay prevents circular references and keeps linked team drawings automatically synchronized.",
      },
      {
        prompt: "برای اینکه اندازه نوشته‌ها و دایمنشن‌ها در ویوپورت‌های با مقیاس ۱:۵۰ و ۱:۱۰۰ ارتفاع چاپی یکسانی داشته باشند از چه قابلیتی استفاده می‌شود؟",
        promptEn: "Which CAD feature keeps text and dimension sizes consistent across 1:50 and 1:100 viewports?",
        options: [
          { id: "a", text: "تغییر دستی Scale در مدل‌اسپیس برای هر پلان", textEn: "Manually scaling model-space entities" },
          { id: "b", text: "Annotative Scaling در استایل متن و دایمنشن", textEn: "Annotative Scaling on text and dimension styles" },
          { id: "c", text: "استفاده از دستور Flatten روی شیت‌ها", textEn: "Running Flatten on paper space" },
          { id: "d", text: "قفل کردن لایه Defpoints", textEn: "Locking the Defpoints layer" },
        ],
        correctOptionId: "b",
        explanation: "قابلیت Annotative Scale ارتفاع چاپی المان‌های شرح نقشه را مستقل از مقیاس ویوپورت تنظیم می‌کند.",
        explanationEn: "Annotative Scaling automatically adjusts annotation size per viewport scale to guarantee uniform plotted height.",
      },
      {
        prompt: "تفاوت کلیدی فایل CTB با STB در تنظیمات چاپ شیت‌های اجرایی چیست؟",
        promptEn: "What is the key difference between CTB and STB plot style tables?",
        options: [
          { id: "a", text: "CTB بر اساس رنگ لایه ضخامت چاپ را تعیین می‌کند و STB بر اساس نام استایل", textEn: "CTB maps lineweights by color, whereas STB maps by named plot styles" },
          { id: "b", text: "CTB فقط برای نقشه‌های سه‌بعدی است", textEn: "CTB is strictly for 3D meshes" },
          { id: "c", text: "STB اجازه چاپ PDF رنگی نمی‌دهد", textEn: "STB disables colored PDF output" },
          { id: "d", text: "هیچ تفاوتی در ضخامت خط ندارند", textEn: "Both ignore lineweight overrides" },
        ],
        correctOptionId: "a",
        explanation: "جدول CTB (Color-Dependent) ضخامت و رنگ چاپ را به رنگ آبجکت متصل می‌کند، در حالی که STB مستقل از رنگ عمل می‌کند.",
        explanationEn: "CTB relies on object/layer color for lineweights, while STB assigns named plot styles independently of display color.",
      },
      {
        prompt: "برای جلوگیری از چاپ خطوط کمکی ویوپورت و شبکه‌های راهنما در خروجی نهایی، چه تنظیمی در Layer Properties لازم است؟",
        promptEn: "How do you prevent viewport frames or construction lines from appearing in the final PDF plot?",
        options: [
          { id: "a", text: "خاموش کردن گزینه Plot (آیکون پرینتر) برای آن لایه", textEn: "Disable the Plot toggle on that dedicated layer" },
          { id: "b", text: "تغییر رنگ لایه به سفید", textEn: "Set layer color to pure white" },
          { id: "c", text: "کاهش شفافیت به ۱۰ درصد", textEn: "Set transparency to 10%" },
          { id: "d", text: "انتقال لایه به فایل جداگانه", textEn: "Move entities to an unlinked file" },
        ],
        correctOptionId: "a",
        explanation: "غیرفعال کردن آیکون Plot باعث می‌شود لایه در محیط کار دیده شود اما در چاپ و PDF نهایی ظاهر نشود.",
        explanationEn: "Turning off the Plot column keeps guidelines visible on screen without outputting them on PDF/paper.",
      },
    ],
  },
  "revit-bim": {
    title: "آزمون نهایی مدلسازی اطلاعات ساختمان (Revit BIM)",
    titleEn: "Revit BIM & Coordination Final Exam",
    description: "سنجش دانش فمیلی‌ها، Worksharing، متره خودکار Schedule و سطوح جزئیات LOD.",
    descriptionEn: "Assesses parametric families, worksharing, live Schedules, and BIM LOD coordination standards.",
    questions: [
      {
        prompt: "در سیستم Worksharing رویت، قبل از ذخیره تغییرات به فایل مرکزی (Synchronize with Central) چه رفتاری صحیح‌تر است؟",
        promptEn: "In Revit Worksharing, which practice keeps Central model coordination clean?",
        options: [
          { id: "a", text: "کار هم‌زمان همه اعضا مستقیم روی فایل Central", textEn: "Everyone opens the Central file directly without Local copies" },
          { id: "b", text: "کار روی Local File، بررسی تداخل‌ها و همگام‌سازی منظم با Workset مشخص", textEn: "Work in Local files with assigned Worksets and sync regularly" },
          { id: "c", text: "حذف Worksetهای معماری پس از مدلسازی", textEn: "Delete all architectural Worksets after modeling" },
          { id: "d", text: "تغییر پسوند RVT به RFA", textEn: "Rename RVT files to RFA" },
        ],
        correctOptionId: "b",
        explanation: "هر کاربر باید نسخه Local بسازد و تغییرات خود را در Workset مرتبط ذخیره و با فایل مرکزی سینک کند.",
        explanationEn: "Team members edit individual Local copies segmented by Worksets and synchronize changes safely with Central.",
      },
      {
        prompt: "برای اینکه یک پارامتر داخل Family هم در جدول متره (Schedule) و هم در برچسب نقشه (Tag) قابل نمایش باشد از چه نوع پارامتری استفاده می‌شود؟",
        promptEn: "Which parameter type can appear simultaneously inside both Revit Schedules and Tags?",
        options: [
          { id: "a", text: "Family Parameter معمولی", textEn: "Standard Family Parameter" },
          { id: "b", text: "Shared Parameter", textEn: "Shared Parameter" },
          { id: "c", text: "Global Temporary Text", textEn: "Global Temporary Text" },
          { id: "d", text: "View Template Filter", textEn: "View Template Filter" },
        ],
        correctOptionId: "b",
        explanation: "Shared Parameter از طریق فایل TXT مشترک بین فمیلی‌ها و پروژه تعریف شده و در Tag و Schedule خوانده می‌شود.",
        explanationEn: "Shared Parameters carry a consistent GUID across families and project files so Tags and Schedules can read them.",
      },
      {
        prompt: "سطح جزئیات LOD 350 در پروژه‌های BIM به چه معناست؟",
        promptEn: "What does LOD 350 specify in BIM coordination deliverables?",
        options: [
          { id: "a", text: "حجم اولیه کانسپت بدون اطلاعات ابعادی دقیق", textEn: "Conceptual massing with approximate dimensions only" },
          { id: "b", text: "مدلسازی دقیق المان‌ها به همراه محل اتصال و تداخل با سایر دیسیپلین‌ها", textEn: "Precise element geometry including interfaces with other building systems" },
          { id: "c", text: "فقط دیاگرام دوبعدی شماتیک", textEn: "2D schematic diagram only" },
          { id: "d", text: "مدل رندر تبلیغاتی بدون متره", textEn: "Marketing visualization without quantities" },
        ],
        correctOptionId: "b",
        explanation: "LOD 350 شامل هندسه دقیق، محل قرارگیری، و روابط/اتصالات بین معماری، سازه و تاسیسات برای تشخیص تداخل است.",
        explanationEn: "LOD 350 models exact geometry plus system interfaces needed for multi-discipline clash detection.",
      },
      {
        prompt: "بهترین ابزار رویت برای یکسان‌سازی مقیاس، لایه‌بندی گرافیکی و فیلترها بین ده‌ها پلان مشابه چیست؟",
        promptEn: "Which Revit tool standardizes visibility, scale, and graphic filters across dozens of floor plans?",
        options: [
          { id: "a", text: "View Template", textEn: "View Template" },
          { id: "b", text: "Linework Override دستی در تک‌تک ویوها", textEn: "Manual Linework overrides in each view" },
          { id: "c", text: "Hide in View", textEn: "Hide in View per element" },
          { id: "d", text: "Crop Region Resize", textEn: "Crop Region Resize" },
        ],
        correctOptionId: "a",
        explanation: "تغییر یک View Template بلافاصله روی تمام نماها و پلان‌های متصل به آن اعمال می‌شود.",
        explanationEn: "A single View Template change propagates consistently to every assigned view.",
      },
    ],
  },
};

function buildGenericCourseQuestions(courseTitle: string, courseTitleEn: string): SeedQuestion[] {
  return [
    {
      prompt: `در استاندارد اجرایی دوره «${courseTitle}»، مهم‌ترین اصل پیش از تحویل فایل نهایی به تیم پروژه چیست؟`,
      promptEn: `In "${courseTitleEn}", what is the top priority before handing off deliverables to a project team?`,
      options: [
        { id: "a", text: "ساختار لایه‌بندی/نام‌گذاری استاندارد، مقیاس واحد و کنترل تداخل", textEn: "Standardized naming/layer structure, unified scale, and QA checks" },
        { id: "b", text: "حذف تمام المان‌های راهنما و توضیحات نقشه", textEn: "Removing all annotations and reference legends" },
        { id: "c", text: "کار بدون ذخیره نسخه‌های پشتیبان و تاریخچه", textEn: "Working without version backups" },
        { id: "d", text: "ارسال فایل خام بدون چک لیست خروجی", textEn: "Sending raw unverified files" },
      ],
      correctOptionId: "a",
      explanation: "استانداردسازی ساختار فایل، نام‌گذاری شفاف و کنترل کیفیت پیش از تحویل پایه کار حرفه‌ای در دفاتر معماری است.",
      explanationEn: "Clean file organization, consistent naming, and pre-delivery QA prevent costly office rework.",
    },
    {
      prompt: "چگونه می‌توان سرعت اصلاحات کارفرما را در فرآیند طراحی و مستندسازی به حداکثر رساند؟",
      promptEn: "How do you minimize rework time during client or coordinator revisions?",
      options: [
        { id: "a", text: "طراحی پارامتریک/ماژولار با المان‌ها و پارامترهای قابل کنترل", textEn: "Use modular, parametric components and linked references" },
        { id: "b", text: "تبدیل تمام آبجکت‌ها به خطوط منفجرشده در ابتدای کار", textEn: "Explode every parametric object into loose lines early" },
        { id: "c", text: "نگهداری نسخه نهایی فقط در پیام‌رسان", textEn: "Store the only copy inside chat threads" },
        { id: "d", text: "نادیده گرفتن واحد اندازه‌گیری پروژه", textEn: "Ignore project unit standards" },
      ],
      correctOptionId: "a",
      explanation: "ساختار ماژولار و پارامتریک اجازه می‌دهد با تغییر یک متغیر یا کامپوننت، تمام خروجی‌ها هم‌زمان به‌روز شوند.",
      explanationEn: "Modular and parametric workflows update downstream views and quantities automatically on change.",
    },
    {
      prompt: "پیش از استفاده از ابزارهای هوش مصنوعی یا اتوماسیون در خروجی‌های مهندسی، چه کنترلی ضروری است؟",
      promptEn: "Before adopting AI or automated outputs in architectural engineering deliverables, what step is mandatory?",
      options: [
        { id: "a", text: "راستی‌آزمایی هندسی، ابعادی و انطباق با ضوابط فنی توسط معمار", textEn: "Human geometric, dimensional, and code-compliance verification" },
        { id: "b", text: "ارسال مستقیم خروجی خام به کارگاه اجرا بدون بازبینی", textEn: "Send raw unreviewed output straight to construction site" },
        { id: "c", text: "حذف تمام متره‌ها و جدول‌های کنترل", textEn: "Delete quantity schedules" },
        { id: "d", text: "عدم مستندسازی فرضیات طراحی", textEn: "Omit design assumptions" },
      ],
      correctOptionId: "a",
      explanation: "هوش مصنوعی دستیار تسریع ایده‌پردازی و اتوماسیون است، اما مسئولیت صحت ابعادی و مهندسی بر عهده معمار است.",
      explanationEn: "AI accelerates exploration and drafting, while licensed architectural review ensures buildability and code accuracy.",
    },
    {
      prompt: "کدام معیار کیفیت خروجی حرفه‌ای یک پروژه معماری در پورتفولیو و کارفرما را متمایز می‌کند؟",
      promptEn: "Which quality standard distinguishes professional architectural deliverables?",
      options: [
        { id: "a", text: "وضوح سلسله‌مراتب بصری، دقت اجرایی و خوانایی کامل اطلاعات", textEn: "Clear visual hierarchy, constructible precision, and legible documentation" },
        { id: "b", text: "افزودن افکت‌های تزئینی سنگین که خوانایی پلان را کاهش دهد", textEn: "Heavy decorative effects that obscure technical clarity" },
        { id: "c", text: "عدم تطابق بین پلان و برش‌های اجرایی", textEn: "Discrepancies between plans and sections" },
        { id: "d", text: "حذف مقیاس و خط‌کش گرافیکی", textEn: "Omitting scale bars and titleblocks" },
      ],
      correctOptionId: "a",
      explanation: "سلسله‌مراتب گرافیکی شفاف و تطابق کامل مستندات، نشانه بلوغ فنی پروژه است.",
      explanationEn: "Coherent visual hierarchy paired with cross-sheet dimensional consistency defines studio-grade work.",
    },
  ];
}

export async function ensureDefaultCourseExams() {
  const courses = await db.course.findMany({
    where: { published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      titleEn: true,
      exam: { select: { id: true } },
    },
  });

  for (const c of courses) {
    if (c.exam) continue;
    const tpl = COURSE_EXAM_TEMPLATES[c.slug];
    const title = tpl?.title ?? `آزمون پایان دوره: ${c.title}`;
    const titleEn = tpl?.titleEn ?? `Final Exam: ${c.titleEn || c.title}`;
    const description =
      tpl?.description ??
      `ارزیابی نهایی مهارت‌های کلیدی دوره ${c.title} — با کسب حداقل ۷۰٪ نمره، گواهینامه رسمی با کد اعتبارسنجی صادر می‌شود.`;
    const descriptionEn =
      tpl?.descriptionEn ??
      `Final assessment for ${c.titleEn || c.title}. Achieve 70% or higher to earn your verifiable completion certificate.`;
    const questions =
      tpl?.questions ?? buildGenericCourseQuestions(c.title, c.titleEn || c.title);

    await db.courseExam.create({
      data: {
        courseId: c.id,
        title,
        titleEn,
        description,
        descriptionEn,
        passingScore: 70,
        durationMins: 20,
        maxAttempts: 3,
        requireCourseCompletion: true,
        minProgressPercent: 70,
        isPublished: true,
        questions: {
          create: questions.map((q, idx) => ({
            order: idx + 1,
            prompt: q.prompt,
            promptEn: q.promptEn,
            optionsJson: JSON.stringify(q.options),
            correctOptionId: q.correctOptionId,
            explanation: q.explanation,
            explanationEn: q.explanationEn,
            points: 1,
          })),
        },
      },
    });
  }
}
