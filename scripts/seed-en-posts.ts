/**
 * Seed ترجمه‌های انگلیسی نوشته‌ها و صفحات استاتیک — آکادمی نیله
 * اجرا: bun scripts/seed-en-posts.ts   (idempotent — با slug آپدیت می‌کند)
 *
 * فقط فیلدهای *En را پر می‌کند؛ محتوای فارسی دست نخورده می‌ماند.
 * ترجمه‌ها از scripts/seed-content.mjs (منبع فارسی) گرفته شده‌اند و
 * ساختار Markdown (## عنوان‌ها، بولت‌ها، بلاک‌کوت‌ها) عیناً حفظ شده است.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// نوشته‌ها
// ─────────────────────────────────────────────────────────────────────────────
const POSTS_EN = [
  {
    slug: "executive-drafting-mistakes",
    titleEn: "Seven Common Construction-Drawing Mistakes Every Architecture Office Should Stop Making",
    excerptEn:
      "Most site rework traces back to small oversights made at the drawing stage. Learn these seven mistakes so your office spends less time on the phone with the construction site.",
    contentEn: `Construction documents are the last place where a design error can still be corrected. After the drawings, only shovels and bricks do the talking. Years of working alongside architecture offices have shown that most site rework stems from seven recurring mistakes — and all of them are preventable.

## Mistake 1: No shared layer standard

When every drafter has their own layering scheme, the consolidated project file turns into a battlefield of layers. The layer standard must be written on day one and enforced for everyone: naming, color, lineweight, and linestyle for every element type.

- Build a standard template file (DWT) and don't let anyone start from scratch
- Make layer names three-part: group, element, status — for example A-WALL-FIN
- Re-run a test print of the colors every time the printer or plot style changes

## Mistake 2: Scaling by eye

Zooming in and closing two lines "roughly right" is exactly where a seven-centimeter wall discrepancy is born on site. Always use precise distance tools and snaps, and keep the essential Object Snaps running at all times.

## Mistake 3: Manual dimension values on the model

A number typed by hand will sooner or later contradict the model. Dimensioning must stay associative so the dimensions update whenever the model changes. If you truly must write a value by hand, flag it with a distinct style and an "N.T.S." (not to scale) note.

## Mistake 4: Illegible text and inconsistent heights

Text height across every sheet in a set must come from a single table. A drawing with 12-centimeter text next to a neighboring sheet with 9-centimeter text looks like the work of a disorganized office — even when the geometry itself is flawless.

## Mistake 5: Copied details without review

Copying details from a previous project is fine; but every copied detail must pass three checks: Is the material correct for this project? Does the section read against this plan? Do its dimensions match this project's module?

## Mistake 6: Plan–section inconsistency

The plan shows a 60 window frame and the section shows 55. These inconsistencies expose themselves during 3D modeling — so before modeling begins, hold a plan–section–elevation coordination session, even if it only lasts fifteen minutes.

## Mistake 7: Chaotic file versioning

A file named "plan-final-v2-really-final.dwg" means the office has no version control. Version naming and dating must follow a written convention, and the file issued to site must go out under an official document number.

> A construction document is a legal document. Every line in it translates into money and time.

In the Construction Drawing course with AutoCAD and GstarCAD, we practice these seven items with real project examples, and you leave with a complete standard template you can implement in your own office tomorrow.`,
  },
  {
    slug: "bim-revit-primer",
    titleEn: "BIM Explained Simply: Why Revit Is More Than Just Software",
    excerptEn:
      "Think of BIM as the building's intelligent Excel spreadsheets — not plans turned 3D. The real difference between CAD and BIM lies in data, not geometry.",
    contentEn: `Many people assume BIM means "building a 3D model." It's a common but mistaken belief. You can build 3D models in good old AutoCAD too — with no BIM involved whatsoever.

## The real difference: geometry versus data

In CAD, a wall is two parallel lines and a hatch. In BIM, the same wall is an intelligent object that knows its material, how many stories it rises through, what area it has, and how it should appear in the quantity takeoff schedule.

> BIM means every building element is a data record — of which geometry is just one field.

When data drives the work, these outputs generate themselves:

- Up-to-the-minute quantity takeoff and estimates pulled from the same model
- Door and window schedules that refresh with every change
- Clash detection between MEP and structure before work ever reaches the site
- Phasing and scheduling scenarios

## Why do Iranian offices need BIM?

Margins are thinner and competition is tighter. An office that extracts its takeoff from the model makes fewer errors in payment applications and wins client trust sooner. On top of that, large public and international projects now write BIM deliverables into their contracts — without the skill, you won't even get a slice of the tender.

## Where do we start?

- Get familiar with the logic of Families in Revit; this is the heart of BIM
- Model one small real project from start to finish, however simple it may be
- Compare the model against your own traditional construction drawings to see the difference in mindset

In the Building Information Modeling with Revit Architecture course, we go from zero to delivering a full set of drawings and schedules from a single model — exactly the skill today's market demands.`,
  },
  {
    slug: "sketchup-fast-workflow",
    titleEn: "From Sketch to Render: The Fast SketchUp Massing Workflow",
    excerptEn:
      "SketchUp's speed lives at the idea stage, not in the details. Master this discipline of staying organized, and you keep that same speed all the way to the final render.",
    contentEn: `Chaotic volumes where everything lives on one layer start beautifully and end painfully. The professional SketchUp workflow begins with three simple rules.

## Rule 1: Never flee from groups and components

Every element must live inside a Group or Component; empty SketchUp space is only for building the very first object. Make Components for repeating elements (windows, chairs, facade mullions) so that editing one instance fixes them all.

## Rule 2: Clean as you go

- Delete stray lines every time you finish a volume
- Use the Solid Inspector tool to find leaky, non-solid volumes
- Save a Scene for every important angle the moment you find it; you won't go hunting for good views later

## Rule 3: Real materials, not paint-bucket colors

SketchUp's default colors are fine for ideation and a disaster for rendering. Assign materials with the right tones from the massing stage onward and only adjust texture size; in the final render, light falls beautifully on correct materials far sooner.

> A good render is not the reward of patience at the end; it is the reward of order at the beginning.

## Output for the render engine

For the handoff to Enscape or V-Ray, three things suffice: clean geometry, properly named materials, and base lighting (sun position set correctly to the site orientation). Everything after that becomes a repeatable path.

In the Fast Massing and Interior Modeling with SketchUp course, we practice this workflow on a real interior project, and you finish with a render-ready package in hand.`,
  },
  {
    slug: "grasshopper-facade-patterns",
    titleEn: "Parametric Facades with Grasshopper: From Geometric Pattern to Buildable Paneling",
    excerptEn:
      "Parametric means turning design decisions into variables. For a building facade, it means one more client revision no longer costs three sleepless nights.",
    contentEn: `Midway through the project the client asks, "Couldn't the diameter of these frames just drop by 10 percent?" In the manual workflow, that sentence means three nights of redoing work. In the parametric workflow, it means dragging one slider.

## The parametric logic: editability instead of drawing

In Grasshopper you don't draw; you build the logic that generates the drawing. The facade is a system: the division grid, the opening pattern, the frame depth, the material. Each is a parameter controlled with numbers and sliders.

## Four steps to a parametric facade

- Divide the facade surface into a grid (U and V) matched to the construction module
- Choose the opening pattern: scaled or rotated, driven by attractor fields
- Turn the pattern into volume: Extrude or Loft for frames and panels
- Extract the data: panel schedules, numbering, and areas for the construction site

## From aesthetics to construction

A beautiful pattern whose paneling yields 400 unique pieces will never get built. The module constraint — say, the sheet sizes actually available on the market — is the axis around which real parametric practice revolves. If the pattern can be brought to a 120-centimeter module by moving one slider, your design is buildable; otherwise it's just a render.

> Good parametric design is when the construction site is grateful for your data — not confused by it.

## Why Grasshopper and not off-the-shelf plugins?

Plugins give you speed but hide the logic. When you build the logic yourself, any unconventional project can be solved — precisely where offices are willing to pay.

In the Parametric and Algorithmic Design with Grasshopper course, we go from the basics to building a complete Facade Generator — a system that takes site dimensions and the construction module as inputs and delivers a buildable facade.`,
  },
  {
    slug: "ai-in-architecture-office",
    titleEn: "AI in the Architecture Office: Five Real Uses for This Week",
    excerptEn:
      "Not a designer replacement, and not magic. AI in the architecture office means eliminating the repetitive tasks that swallow design energy.",
    contentEn: `Set aside the entertaining debate about whether AI will put designers out of work. At the office level, the right question is: which of our working hours are repetitive and could be handed to a machine?

## One: Generating and refining early concepts

Image-generation tools are excellent for the mood-board and ideation phase. See several variants of a public space within ten minutes, then curate them with your own taste and knowledge. AI's output is the starting point, not the finish line.

## Two: Drafting reports and scope-of-services documents

Project narratives, tender inquiry responses, website copy — texts whose structure is predictable but whose writing eats time. With one sample of the office's past writing, AI produces the draft and you simply edit.

## Three: Automating documentation

- Converting Excel tables into fixed report formats
- Batch-renaming files and layers to match the standard
- Automated exports from simple scripts

These tasks need simple scripting, not miracles; but they are exactly the tasks that add up at the end of the month into days of saved work.

## Four: Reviewing and comparing revisions

Repetitive checklists (does every space have a name? does the egress path close?) can be delegated to the model and scripts. AI finds structural errors fast; the final call stays with you.

## Five: Training the team with a dedicated assistant

Feed the office standard into an intelligent assistant; the newly hired drafter asks it instead of asking you ten times. The senior staff's knowledge stays available to the team around the clock.

> AI will not take the place of architectural judgment; it will take the place of the exhaustion of work that requires none.

A realistic warning: the output of every AI tool needs human review, especially for numbers and technical documents. In the Architecture in the AI Era course, we practice these five uses with real tools on a real project.`,
  },
  {
    slug: "smart-quantity-takeoff-excel",
    titleEn: "Smart Quantity Takeoff with Excel: Formulas That Cut Office Time in Half",
    excerptEn:
      "Excel is still the primary takeoff software in architecture offices. The difference between a professional and an amateur estimator isn't the table; it's the structure of the file.",
    contentEn: `In architecture offices, Excel is the most-used tool after the design software — and probably the most disorganized. Files with eight messy worksheets that must be fixed by hand in ten places every time the project changes.

## The right structure for a takeoff file

A professional takeoff file has three separate layers:

- A data-input sheet: raw dimensions taken off the drawings, with no formulas at all
- A calculation sheet: every formula and factor, written once
- An output sheet: the final tables for printing and payment applications

As long as these three layers are mixed together, every project starts from scratch.

## The core formulas to know by heart

- SUMIFS for totaling takeoff by floor or element type
- VLOOKUP (or XLOOKUP) for pulling unit prices from the price-schedule table
- COUNTIF for counting openings by type
- Conditional formatting for spotting forgotten rows

> When a single formula in a takeoff gets manually broken, the value of the entire document comes into question.

## The fatal mistake: hard-coded numbers inside formulas

If you type a factor or a price directly into a formula, your file is not reusable. Every variable number must live in a separate input cell, and the formula must reference that cell. The simple rule: any number that might change between two projects is an input, not code.

## From takeoff to payment application

When the structure is right, a payment application is just one filter and one PivotTable. Summary reports for the client stop being "a night's work"; they take five minutes.

In the Applied Excel, Smart Takeoff and Architecture Project Management course, you receive a complete, fully formatted takeoff file whose structure you simply copy for every future project.`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// صفحات استاتیک — slugs واقعی از seed-content.mjs: about / terms / faq
// ─────────────────────────────────────────────────────────────────────────────
const PAGES_EN = [
  {
    slug: "about",
    titleEn: "About Neeleh Academy",
    contentEn: `Neeleh Academy was built for one specific purpose: closing the gap between what software courses teach and what architecture offices in Iran actually need.

## Our approach: three layers, not scattered videos

Every Neeleh course has three layers, and no course is published without all three:

- Core skill: the tools and commands, through small, real exercises
- Professional workflow: how that same tool is used on a real project, to office standards
- Final project: an output you can show in your résumé and interviews

## Topics

From construction drawings with AutoCAD and GstarCAD, modeling with SketchUp and Rhino, and BIM with Revit, to rendering with Enscape, Lumion, and V-Ray, parametric design with Grasshopper, smart quantity takeoff in Excel, and applied AI in the architecture office.

## Who is it for?

- Architecture students and graduates who want to become employable
- Drafters and technicians who want to move into technical responsibility
- Architecture offices that want to raise their team's standards and speed

> We don't teach tools; we teach the way of working. Tools change, the method endures.

For guidance choosing a course, use the registration form on each course page; our advisors will call you.`,
  },
  {
    slug: "terms",
    titleEn: "Registration Terms & Conditions",
    contentEn: `Registering for Neeleh Academy courses means accepting these terms. We've kept them brief and transparent so there is no ambiguity between us and our students.

## Registration and payment

- Registration is confirmed after the form is completed and an advisor has made contact
- Class capacity is limited; priority goes to earlier registrations
- Installment payment is available for long-term courses and is arranged during the advisory call

## Cancellation and refunds

- Cancellation up to one week before the course starts: full refund
- Cancellation within the final week before the start: 80 percent refund
- After the course begins and attendance at the first session: withdrawal remains possible, with sessions already held deducted from the refund
- If a course is cancelled by the Academy, the full amount is refunded unconditionally

## Attendance

- Sessions are recorded, and the access link is provided to students of that course
- Missing more than three sessions without prior arrangement may make the completion certificate conditional
- Treating the instructor and fellow students with respect is a condition of continued enrollment

## Content ownership

Course content, handouts, and exercise files are for the student's personal use only; public redistribution, sale, or re-teaching of them without written permission is prohibited.

> Still unsure about the terms? Ask before you register; we work best when everything is clear.`,
  },
  {
    slug: "faq",
    titleEn: "Frequently Asked Questions",
    contentEn: `Every course has its own dedicated page; here we've gathered the answers to general questions.

## Do the courses have prerequisites?

Every course has three layers, and the first layer starts from zero. The pro courses (advanced Grasshopper, BIM, automation) are designed for those who have already worked through the foundational layers. Prerequisites are clearly stated on each course page.

## Are classes in person or online?

Courses run in a hybrid format: live sessions with the chance to ask questions, plus session recordings and exercise files. Details for each term are announced on that course's page.

## What do I receive after the course?

- Access to the course session recordings
- Exercise files and the templates built during the course
- A completion certificate for students who have submitted the final project

## What if I miss a session?

The session recording lands in your student panel. For the exercises, you can also post your question in the panel and the instructor will answer.

## How is registration finalized?

Fill out the registration form on each course's page; our advisor calls you, a brief level assessment is done, and after payment your access is activated.

> Didn't find your question here? Leave a message through the registration form; we reply fast.`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// اجرا
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🌱 Seed EN translations — posts & static pages\n" + "─".repeat(64));

  let postsUpdated = 0;
  for (const p of POSTS_EN) {
    const existing = await db.post.findUnique({ where: { slug: p.slug } });
    if (!existing) {
      console.log(`⚠ post not found: ${p.slug}`);
      continue;
    }
    await db.post.update({
      where: { slug: p.slug },
      data: { titleEn: p.titleEn, excerptEn: p.excerptEn, contentEn: p.contentEn },
    });
    postsUpdated++;
    console.log(`✓ EN: ${p.slug}`);
  }

  let pagesUpdated = 0;
  for (const pg of PAGES_EN) {
    const existing = await db.staticPage.findUnique({ where: { slug: pg.slug } });
    if (!existing) {
      console.log(`⚠ page not found: ${pg.slug}`);
      continue;
    }
    await db.staticPage.update({
      where: { slug: pg.slug },
      data: { titleEn: pg.titleEn, contentEn: pg.contentEn },
    });
    pagesUpdated++;
    console.log(`✓ EN page: ${pg.slug}`);
  }

  console.log(
    `\n✅ EN seed done — ${postsUpdated}/${POSTS_EN.length} posts, ${pagesUpdated}/${PAGES_EN.length} pages updated.`
  );
  await db.$disconnect();
}

main().catch((e) => {
  console.error("seed error:", e);
  process.exit(1);
});
