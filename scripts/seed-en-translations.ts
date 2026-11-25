/**
 * Seed ترجمه‌های انگلیسی محتوا — دوره‌ها، دسته‌بندی‌ها و تگ‌ها
 * اجرا: bun scripts/seed-en-translations.ts   (idempotent — فقط فیلدهای *En را آپدیت می‌کند)
 *
 * این اسکریپت محتوای فارسی را دست نمی‌زند؛ فقط titleEn/categoryEn/
 * descriptionEn/aboutEn/outputsEn/prereqsEn/tagsEn را پر می‌کند.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type CourseEnSeed = {
  slug: string;
  titleEn: string;
  categoryEn: string;
  tagsEn: string[];
  descriptionEn: string;
  aboutEn: string;
  outputsEn: string[];
  prereqsEn: string;
};

const COURSE_EN: CourseEnSeed[] = [
  // ═══════════════ Tier 1 — Foundation ═══════════════
  {
    slug: "autocad-phase2",
    titleEn: "Construction Drawing Masterclass — Phase 2 with AutoCAD / GstarCAD",
    categoryEn: "Drafting & Phase 2",
    tagsEn: ["Beginner", "Project-based", "In-person"],
    descriptionEn:
      "Master municipality and engineering-organization standards, proper layering, and produce a complete Phase-2 drawing package for a typical residential building.",
    aboutEn:
      "The biggest challenge for architecture students is the gap between academic drafting and drawings that the municipality and the engineering organization actually accept. Instead of teaching software commands in isolation, this course walks you through a complete residential project from scratch to permit readiness, practicing real regulations on the same project.",
    outputsEn: [
      "A complete Phase-2 package for a residential building (plans, elevations, sections, details)",
      "Command of municipality and engineering-organization standards in construction drawings",
      "Professional work with layers, blocks, and submission standards for supervising engineers",
      "A resume with a real portfolio piece you can present to architecture offices",
    ],
    prereqsEn: "Basic familiarity with Windows; no prior drafting experience required",
  },
  {
    slug: "sketchup-modeling",
    titleEn: "Fast Massing, Interior & Concept Modeling with SketchUp",
    categoryEn: "3D Modeling",
    tagsEn: ["Beginner", "In-person"],
    descriptionEn:
      "Quickly learn solid-modeling tools, precise component management, and prepare volumes for rendering and presentation.",
    aboutEn:
      "Speed matters at the concept stage. This course teaches the fast SketchUp workflow — from clean base geometry to organized components — so your models stay light, editable, and ready for rendering from day one.",
    outputsEn: [
      "Fast, organized massing models ready for rendering",
      "Component and group management without messy geometry",
      "Interior modeling workflow for concept presentations",
      "A repeatable pipeline from idea to presentable volume",
    ],
    prereqsEn: "Basic familiarity with Windows",
  },
  {
    slug: "revit-bim",
    titleEn: "Building Information Modeling (BIM) with Revit Architecture",
    categoryEn: "BIM Systems",
    tagsEn: ["Beginner", "In-person"],
    descriptionEn:
      "Enter the world of intelligent BIM modeling — produce coordinated drawings and material schedules to engineering standards.",
    aboutEn:
      "BIM is the industry standard for delivering architecture projects. This course takes you from Revit fundamentals to a complete architectural model with sheets, schedules, and family basics — the way real offices work.",
    outputsEn: [
      "A full architectural BIM model with sheets and schedules",
      "Walls, floors, roofs, stairs, and curtain-wall workflows",
      "Material takeoff schedules to engineering standards",
      "Understanding of BIM deliverables in real projects",
    ],
    prereqsEn: "Familiarity with architectural concepts and basic AutoCAD",
  },
  // ═══════════════ Tier 2 — Intermediate ═══════════════
  {
    slug: "rhino-nurbs",
    titleEn: "Advanced Modeling — Complex Geometry & NURBS Surfaces with Rhino",
    categoryEn: "Advanced Modeling",
    tagsEn: ["Intermediate", "Form-finding"],
    descriptionEn:
      "Master freeform geometry, complex surfaces, and error-free precise architectural volumes.",
    aboutEn:
      "When standard tools hit their limits, Rhino takes over. This course covers NURBS fundamentals and advanced form-finding so you can model complex architectural geometry with precision and control.",
    outputsEn: [
      "Confident NURBS surface modeling for complex forms",
      "Precise, clean geometry ready for fabrication or BIM handoff",
      "Form-finding techniques for ambitious design concepts",
      "Interoperability workflow with other software",
    ],
    prereqsEn: "Intermediate command of AutoCAD or SketchUp",
  },
  {
    slug: "enscape-vray",
    titleEn: "Realistic Rendering, Lighting & Animation with Enscape / Lumion / V-Ray",
    categoryEn: "Rendering & Presentation",
    tagsEn: ["Intermediate", "In-person"],
    descriptionEn:
      "Professional lighting and climate setups, physically based materials, and realistic virtual tours for client presentations.",
    aboutEn:
      "A good model sells with a good render. In this course you work through physical lighting, PBR materials, and professional outputs (stills, animation, virtual tours) on a real project.",
    outputsEn: [
      "Physically accurate lighting setups for any scene",
      "PBR material creation from scratch",
      "Cinematic stills and animation output",
      "Client-ready virtual tours",
    ],
    prereqsEn: "A working model in SketchUp or Revit to render",
  },
  {
    slug: "excel-smart-takeoff",
    titleEn: "Applied Excel, Smart Takeoff & Architecture Office Management",
    categoryEn: "Office Management & Takeoff",
    tagsEn: ["Intermediate", "Applied"],
    descriptionEn:
      "Advanced formulas for material takeoff, construction cost estimation, and financial proposals for architecture offices.",
    aboutEn:
      "Offices run on spreadsheets. This course turns Excel into a takeoff and project-management engine — from material quantities to cost estimates and fee proposals that win work.",
    outputsEn: [
      "Automated material takeoff spreadsheets",
      "Construction cost estimation models",
      "Professional financial proposals for clients",
      "Office project-management dashboards",
    ],
    prereqsEn: "Basic Excel familiarity",
  },
  // ═══════════════ Tier 3 — Advanced ═══════════════
  {
    slug: "grasshopper-parametric",
    titleEn: "Parametric & Algorithmic Design with Grasshopper (Basics to Facade Generator)",
    categoryEn: "Computational Design",
    tagsEn: ["Advanced", "Algorithmic"],
    descriptionEn:
      "Learn data logic and build intelligent geometric systems for generating variable facades and skins.",
    aboutEn:
      "Parametric thinking changes how you design. Starting from zero, this course builds up to a full facade-generator system — data trees, lists, attractors, and adaptive component systems.",
    outputsEn: [
      "Solid Grasshopper fundamentals from scratch",
      "Data-tree logic and list management",
      "A complete parametric facade generator",
      "Adaptive systems responding to site and climate data",
    ],
    prereqsEn: "Intermediate Rhino skills",
  },
  {
    slug: "b2b-automation",
    titleEn: "Process Automation & Documentation Optimization for Architecture Offices",
    categoryEn: "B2B Automation",
    tagsEn: ["Advanced", "For offices"],
    descriptionEn:
      "Identify repetitive bottlenecks in office workflows and build helper tools that increase speed and reduce documentation errors.",
    aboutEn:
      "Offices lose hours to repetitive documentation. This course maps real bottlenecks and builds practical automation — templates, scripts, and toolchains tailored to architecture workflows.",
    outputsEn: [
      "A mapped automation plan for your office",
      "Custom documentation templates and scripts",
      "Reduced error rates in deliverables",
      "Measurable time savings per project",
    ],
    prereqsEn: "Experience working in an architecture office",
  },
  {
    slug: "ai-architecture",
    titleEn: "Architecture in the AI Era (AI + Rhino + BIM Fusion)",
    categoryEn: "AI in Architecture",
    tagsEn: ["Advanced", "Forward-looking"],
    descriptionEn:
      "Leverage artificial intelligence in concept design and rapidly turn ideas into precise, buildable models.",
    aboutEn:
      "AI is reshaping the architecture workflow. This course covers AI-assisted concept generation, image-to-model pipelines, and integrating AI outputs with Rhino and BIM workflows — responsibly and professionally.",
    outputsEn: [
      "AI-assisted concept design workflow",
      "Image-to-model pipelines with control",
      "AI outputs integrated with Rhino and BIM",
      "Professional judgment on where AI helps — and where it doesn't",
    ],
    prereqsEn: "Professional architecture experience; Rhino basics recommended",
  },
];

type NameEnSeed = { slug: string; nameEn: string };

const CATEGORY_EN: NameEnSeed[] = [
  { slug: "drafting-phase2", nameEn: "Drafting & Phase 2" },
  { slug: "3d-modeling", nameEn: "3D Modeling" },
  { slug: "bim-systems", nameEn: "BIM Systems" },
  { slug: "advanced-modeling", nameEn: "Advanced Modeling" },
  { slug: "rendering-presentation", nameEn: "Rendering & Presentation" },
  { slug: "office-takeoff", nameEn: "Office Management & Takeoff" },
  { slug: "computational-design", nameEn: "Computational Design" },
  { slug: "b2b-automation", nameEn: "B2B Automation" },
  { slug: "ai-architecture", nameEn: "AI in Architecture" },
];

const TAG_EN: NameEnSeed[] = [
  { slug: "beginner", nameEn: "Beginner" },
  { slug: "intermediate", nameEn: "Intermediate" },
  { slug: "advanced", nameEn: "Advanced" },
  { slug: "professional", nameEn: "Professional" },
  { slug: "project-based", nameEn: "Project-based" },
  { slug: "in-person", nameEn: "In-person" },
  { slug: "form-finding", nameEn: "Form-finding" },
  { slug: "applied", nameEn: "Applied" },
  { slug: "algorithmic", nameEn: "Algorithmic" },
  { slug: "for-offices", nameEn: "For offices" },
  { slug: "forward-looking", nameEn: "Forward-looking" },
];

async function main() {
  console.log("🌱 شروع seed ترجمه‌های انگلیسی...\n");

  let coursesUpdated = 0;
  for (const c of COURSE_EN) {
    const existing = await db.course.findUnique({ where: { slug: c.slug } });
    if (!existing) {
      console.log(`  ⚠ دوره پیدا نشد: ${c.slug} (seed-courses.ts را اول اجرا کنید)`);
      continue;
    }
    await db.course.update({
      where: { slug: c.slug },
      data: {
        titleEn: c.titleEn,
        categoryEn: c.categoryEn,
        tagsEn: c.tagsEn.join(","),
        descriptionEn: c.descriptionEn,
        aboutEn: c.aboutEn,
        outputsEn: c.outputsEn.join("\n"),
        prereqsEn: c.prereqsEn,
      },
    });
    coursesUpdated++;
    console.log(`  ✓ EN آپدیت شد: ${c.slug}`);
  }

  // دسته‌بندی‌ها — با تطبیق نام فارسی (چون slug ها ممکن است متفاوت باشند)
  const categories = await db.category.findMany();
  const catByEnName = new Map(CATEGORY_EN.map((x) => [x.nameEn.toLowerCase(), x.nameEn]));
  let catsUpdated = 0;
  for (const cat of categories) {
    // اگر nameEn قبلاً ست شده، رد شو
    if (cat.nameEn) continue;
    // تطبیق از روی نام فارسی شناخته‌شده
    const faToEn: Record<string, string> = {
      "نقشه‌کشی و فاز دو": "Drafting & Phase 2",
      "مدلسازی ۳ بعدی": "3D Modeling",
      "سیستم‌های BIM": "BIM Systems",
      "مدلسازی پیشرفته": "Advanced Modeling",
      "رندرینگ و ارائه": "Rendering & Presentation",
      "مدیریت دفتر و متره": "Office Management & Takeoff",
      "Computational Design": "Computational Design",
      "اتوماسیون B2B": "B2B Automation",
      "هوش مصنوعی در معماری": "AI in Architecture",
    };
    const en = faToEn[cat.name];
    if (en) {
      await db.category.update({ where: { id: cat.id }, data: { nameEn: en } });
      catsUpdated++;
    }
  }

  // تگ‌ها — تطبیق از روی نام فارسی
  const tags = await db.tag.findMany();
  const tagFaToEn: Record<string, string> = {
    "مبتدی": "Beginner",
    "متوسط": "Intermediate",
    "حرفه‌ای": "Professional",
    "پیشرفته": "Advanced",
    "پروژه‌محور": "Project-based",
    "حضوری": "In-person",
    "فرم‌پردازی": "Form-finding",
    "کاربردی": "Applied",
    "الگوریتمیک": "Algorithmic",
    "ویژه دفاتر": "For offices",
    "آینده‌نگرانه": "Forward-looking",
  };
  let tagsUpdated = 0;
  for (const tag of tags) {
    if (tag.nameEn) continue;
    const en = tagFaToEn[tag.name];
    if (en) {
      await db.tag.update({ where: { id: tag.id }, data: { nameEn: en } });
      tagsUpdated++;
    }
  }

  console.log(`\n✅ seed ترجمه‌ها کامل شد: ${coursesUpdated} دوره، ${catsUpdated} دسته، ${tagsUpdated} تگ آپدیت شد.`);
}

main()
  .catch((e) => {
    console.error("seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
