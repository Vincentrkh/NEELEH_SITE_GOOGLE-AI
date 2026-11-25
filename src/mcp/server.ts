#!/usr/bin/env node
/**
 * MCP Server — آکادمی نیله
 * ─────────────────────────────────────────────────────────────────────────────
 * سرور پروتکل مدلِ کانتکست (Model Context Protocol) روی دیتابیس نیله.
 *
 * هر کلاینت MCP (Claude Desktop, Cursor, Continue, ...) می‌تواند به این سرور
 * وصل شود و سایت را امن و قابل‌ممیزی اداره کند — بدون نیاز به UI دستی.
 *
 * ابزارها (Tools):
 *   محتوا:  list_posts, get_post, create_post, update_post, publish_post,
 *           list_pages, get_page, create_page, update_page,
 *           list_categories, create_category, list_tags, create_tag,
 *           list_courses
 *   عملیات: list_leads, update_lead_status, list_registrations,
 *           update_registration_status
 *   راستی‌آزمایی: health_check, list_draft_content
 *
 * اجرا:   node --experimental-strip-types src/mcp/server.ts
 *         (یا npm run mcp که اسکریپت زیر است)
 *
 * پیکربندی Claude Desktop:
 *   {
 *     "mcpServers": {
 *       "neeleh": {
 *         "command": "node",
 *         "args": ["/home/z/my-project/src/mcp/server.ts"]
 *       }
 *     }
 *   }
 *
 * امنیت: این سرور مستقیماً به دیتابیس وصل می‌شود و معادل «اپراتور ادمین» است.
 * فقط روی همون سیستمی اجرا شود که فایل‌های پروژه و .env در آن است.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

// ── .env را بارگذاری کن ────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();

const server = new McpServer({
  name: "neeleh-cms",
  version: "1.0.0",
});

// ── توابع کمکی ──────────────────────────────────────────────────────────────
function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function faDate(d: Date | null): string {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

// ── ابزارهای محتوا — نوشته‌ها ────────────────────────────────────────────────
server.tool(
  "list_posts",
  "فهرست نوشته‌های بلاگ (با فیلتر اختیاری بر اساس وضعیت/دسته). خروجی: عنوان، slug، وضعیت، دسته‌ها، تاریخ انتشار.",
  { status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(), limit: z.number().int().min(1).max(100).default(20).optional() },
  async ({ status, limit }) => {
    const posts = await db.post.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit ?? 20,
      include: {
        categories: { include: { category: { select: { name: true, slug: true } } } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
    });
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          count: posts.length,
          posts: posts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            status: p.status,
            featured: p.featured,
            publishedAt: p.publishedAt ? faDate(p.publishedAt) : null,
            excerpt: p.excerpt.slice(0, 120),
            categories: p.categories.map((c) => c.category.slug),
            tags: p.tags.map((t) => t.tag.slug),
          })),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_post",
  "خواندن یک نوشته با slug یا id — شامل محتوای کامل Markdown.",
  { slug: z.string().optional(), id: z.string().optional() },
  async ({ slug, id }) => {
    if (!slug && !id) return { content: [{ type: "text" as const, text: "خطا: slug یا id لازم است" }] };
    const post = await db.post.findFirst({
      where: slug ? { slug } : { id },
      include: {
        author: { select: { name: true } },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });
    if (!post) return { content: [{ type: "text" as const, text: "نوشته‌ای پیدا نشد" }] };
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          id: post.id,
          title: post.title,
          slug: post.slug,
          status: post.status,
          featured: post.featured,
          readingMins: post.readingMins,
          excerpt: post.excerpt,
          content: post.content,
          coverUrl: post.coverUrl,
          publishedAt: post.publishedAt ? faDate(post.publishedAt) : null,
          author: post.author?.name,
          categories: post.categories.map((c) => c.category.slug),
          tags: post.tags.map((t) => t.tag.slug),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "create_post",
  "ساخت نوشته بلاگ جدید. content باید Markdown ساده باشد (تیتر #, ##, ###؛ لیست با - یا *؛ نقل‌قول با >). slug اختیاری است و اگر نباشد از title ساخته می‌شود. categorySlugs و tagSlugs اگر وجود نداشته باشند، نادیده گرفته می‌شوند.",
  {
    title: z.string().min(3),
    slug: z.string().optional(),
    excerpt: z.string().optional(),
    content: z.string(),
    coverUrl: z.string().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    featured: z.boolean().default(false),
    readingMins: z.number().int().min(0).default(0).optional(),
    categorySlugs: z.array(z.string()).default([]).optional(),
    tagSlugs: z.array(z.string()).default([]).optional(),
  },
  async (args) => {
    let slug = args.slug?.trim() ? slugify(args.slug) : slugify(args.title);
    if (!slug) slug = `post-${Date.now().toString(36)}`;
    const existing = await db.post.findUnique({ where: { slug } });
    if (existing) return { content: [{ type: "text" as const, text: `خطا: نوشته‌ای با slug «${slug}» از قبل وجود دارد.` }] };

    const cats = args.categorySlugs?.length ? await db.category.findMany({ where: { slug: { in: args.categorySlugs } }, select: { id: true } }) : [];
    const tags = args.tagSlugs?.length ? await db.tag.findMany({ where: { slug: { in: args.tagSlugs } }, select: { id: true } }) : [];

    const post = await db.post.create({
      data: {
        slug,
        title: args.title.trim(),
        excerpt: args.excerpt?.trim() || "",
        content: args.content,
        coverUrl: args.coverUrl?.trim() || null,
        status: args.status,
        featured: args.featured,
        readingMins: args.readingMins ?? 0,
        publishedAt: args.status === "PUBLISHED" ? new Date() : null,
        categories: cats.length ? { create: cats.map((c) => ({ categoryId: c.id })) } : undefined,
        tags: tags.length ? { create: tags.map((t) => ({ tagId: t.id })) } : undefined,
      },
      select: { id: true, slug: true, title: true, status: true },
    });
    return { content: [{ type: "text" as const, text: `✅ نوشته ساخته شد: «${post.title}» (slug: ${post.slug}, status: ${post.status}, id: ${post.id})` }] };
  }
);

server.tool(
  "update_post",
  "ویرایش یک نوشته با slug. فقط فیلدهایی که ارسال شوند به‌روز می‌شوند. اگر status به PUBLISHED تغییر کند، publishedAt خودکار ست می‌شود.",
  {
    slug: z.string(),
    title: z.string().optional(),
    excerpt: z.string().optional(),
    content: z.string().optional(),
    coverUrl: z.string().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    featured: z.boolean().optional(),
    readingMins: z.number().int().min(0).optional(),
    categorySlugs: z.array(z.string()).optional(),
    tagSlugs: z.array(z.string()).optional(),
  },
  async (args) => {
    const existing = await db.post.findUnique({ where: { slug: args.slug } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: نوشته‌ای با slug «${args.slug}» پیدا نشد.` }] };

    const data: Record<string, unknown> = {};
    if (args.title !== undefined) data.title = args.title.trim();
    if (args.excerpt !== undefined) data.excerpt = args.excerpt.trim();
    if (args.content !== undefined) data.content = args.content;
    if (args.coverUrl !== undefined) data.coverUrl = args.coverUrl.trim() || null;
    if (args.featured !== undefined) data.featured = args.featured;
    if (args.readingMins !== undefined) data.readingMins = args.readingMins;
    if (args.status !== undefined) {
      data.status = args.status;
      if (args.status === "PUBLISHED" && !existing.publishedAt) data.publishedAt = new Date();
    }

    if (args.categorySlugs !== undefined) {
      const cats = await db.category.findMany({ where: { slug: { in: args.categorySlugs } }, select: { id: true } });
      data.categories = { deleteMany: {}, create: cats.map((c) => ({ categoryId: c.id })) };
    }
    if (args.tagSlugs !== undefined) {
      const tags = await db.tag.findMany({ where: { slug: { in: args.tagSlugs } }, select: { id: true } });
      data.tags = { deleteMany: {}, create: tags.map((t) => ({ tagId: t.id })) };
    }

    const updated = await db.post.update({ where: { slug: args.slug }, data, select: { id: true, slug: true, title: true, status: true } });
    return { content: [{ type: "text" as const, text: `✅ به‌روز شد: «${updated.title}» (status: ${updated.status})` }] };
  }
);

server.tool(
  "publish_post",
  "انتشار یک نوشته (تنظیم status=PUBLISHED و publishedAt اگر خالی باشد).",
  { slug: z.string() },
  async ({ slug }) => {
    const existing = await db.post.findUnique({ where: { slug } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: slug «${slug}» پیدا نشد.` }] };
    await db.post.update({ where: { slug }, data: { status: "PUBLISHED", publishedAt: existing.publishedAt ?? new Date() } });
    return { content: [{ type: "text" as const, text: `✅ «${existing.title}» منتشر شد.` }] };
  }
);

server.tool(
  "delete_post",
  "حذف یک نوشته با slug. برگشت‌ناپذیر است — با احتیاط استفاده کنید.",
  { slug: z.string() },
  async ({ slug }) => {
    const existing = await db.post.findUnique({ where: { slug } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: slug «${slug}» پیدا نشد.` }] };
    await db.post.delete({ where: { slug } });
    return { content: [{ type: "text" as const, text: `🗑️ «${existing.title}» حذف شد.` }] };
  }
);

// ── ابزارهای محتوا — صفحات استاتیک ──────────────────────────────────────────
server.tool(
  "list_pages",
  "فهرست صفحات استاتیک سایت (about, terms, faq و ...). خروجی: عنوان، slug، وضعیت، نمایش در منو.",
  {},
  async () => {
    const pages = await db.staticPage.findMany({ orderBy: [{ showInMenu: "desc" }, { sortOrder: "asc" }] });
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          count: pages.length,
          pages: pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug, status: p.status, showInMenu: p.showInMenu, excerpt: p.excerpt?.slice(0, 80) })),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_page",
  "خواندن یک صفحه استاتیک با slug — شامل محتوای کامل Markdown.",
  { slug: z.string() },
  async ({ slug }) => {
    const page = await db.staticPage.findUnique({ where: { slug } });
    if (!page) return { content: [{ type: "text" as const, text: `خطا: صفحه «${slug}» پیدا نشد.` }] };
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          id: page.id, title: page.title, slug: page.slug, status: page.status,
          showInMenu: page.showInMenu, excerpt: page.excerpt, content: page.content,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "create_page",
  "ساخت صفحه استاتیک جدید. showInMenu=true یعنی در منوی فوتر ظاهر شود.",
  {
    title: z.string().min(3),
    slug: z.string().optional(),
    content: z.string(),
    excerpt: z.string().optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    showInMenu: z.boolean().default(false),
  },
  async (args) => {
    let slug = args.slug?.trim() ? slugify(args.slug) : slugify(args.title);
    if (!slug) slug = `page-${Date.now().toString(36)}`;
    const existing = await db.staticPage.findUnique({ where: { slug } });
    if (existing) return { content: [{ type: "text" as const, text: `خطا: صفحه‌ای با slug «${slug}» از قبل وجود دارد.` }] };
    const page = await db.staticPage.create({
      data: {
        slug, title: args.title.trim(), content: args.content,
        excerpt: args.excerpt?.trim() || null, status: args.status, showInMenu: args.showInMenu,
      },
      select: { id: true, slug: true, title: true, status: true },
    });
    return { content: [{ type: "text" as const, text: `✅ صفحه ساخته شد: «${page.title}» (slug: ${page.slug}, status: ${page.status})` }] };
  }
);

server.tool(
  "update_page",
  "ویرایش یک صفحه استاتیک با slug. فقط فیلدهای ارسالی به‌روز می‌شوند.",
  {
    slug: z.string(),
    title: z.string().optional(),
    content: z.string().optional(),
    excerpt: z.string().optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    showInMenu: z.boolean().optional(),
  },
  async (args) => {
    const existing = await db.staticPage.findUnique({ where: { slug: args.slug } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: صفحه «${args.slug}» پیدا نشد.` }] };
    const data: Record<string, unknown> = {};
    if (args.title !== undefined) data.title = args.title.trim();
    if (args.content !== undefined) data.content = args.content;
    if (args.excerpt !== undefined) data.excerpt = args.excerpt.trim() || null;
    if (args.status !== undefined) data.status = args.status;
    if (args.showInMenu !== undefined) data.showInMenu = args.showInMenu;
    await db.staticPage.update({ where: { slug: args.slug }, data });
    return { content: [{ type: "text" as const, text: `✅ صفحه «${existing.title}» به‌روز شد.` }] };
  }
);

// ── دسته‌ها و برچسب‌ها ───────────────────────────────────────────────────────
server.tool("list_categories", "فهرست دسته‌های بلاگ با تعداد نوشته‌های هر کدام.", {}, async () => {
  const cats = await db.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { posts: true } } } });
  return { content: [{ type: "text" as const, text: JSON.stringify({ count: cats.length, categories: cats.map((c) => ({ slug: c.slug, name: c.name, postCount: c._count.posts, description: c.description })) }, null, 2) }] };
});

server.tool(
  "create_category",
  "ساخت دسته جدید. slug اختیاری است (اگر نباشد از name ساخته می‌شود). idempotent نیست — اگر slug تکراری باشد خطا می‌دهد.",
  { name: z.string().min(2), slug: z.string().optional(), description: z.string().optional() },
  async (args) => {
    let slug = args.slug?.trim() ? slugify(args.slug) : slugify(args.name);
    if (!slug) slug = `cat-${Date.now().toString(36)}`;
    const existing = await db.category.findUnique({ where: { slug } });
    if (existing) return { content: [{ type: "text" as const, text: `خطا: دسته «${slug}» از قبل وجود دارد.` }] };
    const cat = await db.category.create({ data: { name: args.name.trim(), slug, description: args.description?.trim() || null } });
    return { content: [{ type: "text" as const, text: `✅ دسته «${cat.name}» ساخته شد (slug: ${cat.slug}).` }] };
  }
);

server.tool("list_tags", "فهرست برچسب‌ها با تعداد نوشته‌ها.", {}, async () => {
  const tags = await db.tag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { posts: true } } } });
  return { content: [{ type: "text" as const, text: JSON.stringify({ count: tags.length, tags: tags.map((t) => ({ slug: t.slug, name: t.name, postCount: t._count.posts })) }, null, 2) }] };
});

server.tool(
  "create_tag",
  "ساخت برچسب جدید. slug اختیاری است.",
  { name: z.string().min(2), slug: z.string().optional() },
  async (args) => {
    let slug = args.slug?.trim() ? slugify(args.slug) : slugify(args.name);
    if (!slug) slug = `tag-${Date.now().toString(36)}`;
    const existing = await db.tag.findUnique({ where: { slug } });
    if (existing) return { content: [{ type: "text" as const, text: `خطا: برچسب «${slug}» از قبل وجود دارد.` }] };
    const tag = await db.tag.create({ data: { name: args.name.trim(), slug } });
    return { content: [{ type: "text" as const, text: `✅ برچسب «${tag.name}» ساخته شد (slug: ${tag.slug}).` }] };
  }
);

// ── دوره‌ها (read-only) ─────────────────────────────────────────────────────
server.tool(
  "list_courses",
  "فهرست دوره‌ها (با فیلتر tier اختیاری: BEGINNER, INTERMEDIATE, PRO). برای دیدن جزئیات کامل از get_post/page استفاده نکنید — دوره‌ها متمایز هستند.",
  { tier: z.enum(["BEGINNER", "INTERMEDIATE", "PRO"]).optional(), published_only: z.boolean().default(true).optional() },
  async ({ tier, published_only }) => {
    const courses = await db.course.findMany({
      where: { AND: [tier ? { tier } : {}, published_only ? { published: true } : {}] },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, title: true, tier: true, category: true, regStatus: true, featured: true, published: true, description: true, durationHrs: true, price: true },
    });
    return { content: [{ type: "text" as const, text: JSON.stringify({ count: courses.length, courses }, null, 2) }] };
  }
);

// ── ابزارهای عملیاتی — سرنخ‌ها ───────────────────────────────────────────────
server.tool(
  "list_leads",
  "فهرست سرنخ‌های فرم تماس (با فیلتر وضعیت). وضعیت‌ها: NEW (جدید)، CONTACTED (تماس گرفته شده)، CONVERTED (تبدیل به هنرجو).",
  { status: z.enum(["NEW", "CONTACTED", "CONVERTED"]).optional(), limit: z.number().int().min(1).max(200).default(50).optional() },
  async ({ status, limit }) => {
    const leads = await db.lead.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit ?? 50,
    });
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          count: leads.length,
          summary: { NEW: leads.filter((l) => l.status === "NEW").length, CONTACTED: leads.filter((l) => l.status === "CONTACTED").length, CONVERTED: leads.filter((l) => l.status === "CONVERTED").length },
          leads: leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone, email: l.email, status: l.status, message: l.message.slice(0, 100), note: l.note, createdAt: faDate(l.createdAt) })),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "update_lead_status",
  "تغییر وضعیت یک سرنخ. note یادداشت ادمین است که می‌تواند اضافه یا جایگزین شود.",
  { id: z.string(), status: z.enum(["NEW", "CONTACTED", "CONVERTED"]), note: z.string().optional() },
  async (args) => {
    const existing = await db.lead.findUnique({ where: { id: args.id } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: سرنخ ${args.id} پیدا نشد.` }] };
    const data: Record<string, unknown> = { status: args.status };
    if (args.note !== undefined) data.note = args.note.trim();
    await db.lead.update({ where: { id: args.id }, data });
    return { content: [{ type: "text" as const, text: `✅ سرنخ «${existing.name}» → ${args.status}${args.note ? ` (یادداشت ثبت شد)` : ""}` }] };
  }
);

// ── ثبت‌نام‌ها ───────────────────────────────────────────────────────────────
server.tool(
  "list_registrations",
  "فهرست ثبت‌نام‌های دوره (با فیلتر وضعیت). وضعیت‌ها: PENDING, CONFIRMED, CANCELLED. paymentStatus: UNPAID, PAID.",
  { status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(), limit: z.number().int().min(1).max(200).default(50).optional() },
  async ({ status, limit }) => {
    const regs = await db.registration.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit ?? 50,
      include: {
        student: { select: { name: true, phone: true } },
        course: { select: { title: true, slug: true } },
      },
    });
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          count: regs.length,
          registrations: regs.map((r) => ({
            id: r.id, studentName: r.student.name, studentPhone: r.student.phone,
            course: r.course.title, courseSlug: r.course.slug,
            status: r.status, paymentStatus: r.paymentStatus, note: r.note,
            createdAt: faDate(r.createdAt),
          })),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "update_registration_status",
  "تغییر وضعیت یک ثبت‌نام. برای تأیید نهایی: status=CONFIRMED و paymentStatus=PAID.",
  {
    id: z.string(),
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
    paymentStatus: z.enum(["UNPAID", "PAID"]).optional(),
    note: z.string().optional(),
  },
  async (args) => {
    const existing = await db.registration.findUnique({ where: { id: args.id }, include: { student: { select: { name: true } }, course: { select: { title: true } } } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: ثبت‌نام ${args.id} پیدا نشد.` }] };
    const data: Record<string, unknown> = {};
    if (args.status !== undefined) data.status = args.status;
    if (args.paymentStatus !== undefined) data.paymentStatus = args.paymentStatus;
    if (args.note !== undefined) data.note = args.note.trim();
    await db.registration.update({ where: { id: args.id }, data });
    return { content: [{ type: "text" as const, text: `✅ ثبت‌نام «${existing.student.name}» در دوره «${existing.course.title}» به‌روز شد.` }] };
  }
);

// ── منوها (مدیریت کامل منوی هدر و فوتر) ─────────────────────────────────────
const MENU_LOCATIONS = ["header", "footer"] as const;
const MENU_KINDS = ["block", "archive"] as const;
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

server.tool(
  "list_menu_items",
  "فهرست آیتم‌های منو با فیلتر location (header=منوی همبرگری پلکانی، footer=ستون دسترسی سریع فوتر). شامل آیتم‌های غیرفعال هم می‌شود.",
  { location: z.enum(MENU_LOCATIONS).optional() },
  async ({ location }) => {
    const items = await db.menuItem.findMany({
      where: location ? { location } : undefined,
      orderBy: [{ location: "asc" }, { order: "asc" }],
    });
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          count: items.length,
          byLocation: {
            header: items.filter((i) => i.location === "header").length,
            footer: items.filter((i) => i.location === "footer").length,
          },
          items: items.map((i) => ({
            id: i.id, location: i.location, labelFa: i.labelFa, labelEn: i.labelEn,
            href: i.href, bgColor: i.bgColor, kind: i.kind, fillIndicator: i.fillIndicator,
            order: i.order, isActive: i.isActive,
          })),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "create_menu_item",
  "افزودن آیتم به منو. location: header (بلوک پلکانی) یا footer (لینک سریع). href می‌تواند مسیر داخلی (/courses)، لنگر (#top) یا URL کامل باشد. bgColor فقط برای header و با فرمت #RRGGBB. kind: block (بلوک اصلی) یا archive (آرشیو). fillIndicator فقط header و مربع شماره را توپُر می‌کند.",
  {
    location: z.enum(MENU_LOCATIONS),
    labelFa: z.string().min(1),
    labelEn: z.string().min(1),
    href: z.string().min(1),
    bgColor: z.string().regex(COLOR_RE).default("#cbcccd").optional(),
    kind: z.enum(MENU_KINDS).default("block").optional(),
    fillIndicator: z.boolean().default(false).optional(),
    isActive: z.boolean().default(true).optional(),
    order: z.number().int().optional(),
  },
  async (args) => {
    const order = args.order ?? (await db.menuItem.count({ where: { location: args.location } }));
    const item = await db.menuItem.create({
      data: {
        location: args.location,
        labelFa: args.labelFa.trim(),
        labelEn: args.labelEn.trim(),
        href: args.href.trim(),
        bgColor: args.bgColor ?? "#cbcccd",
        kind: args.kind ?? "block",
        fillIndicator: args.fillIndicator ?? false,
        isActive: args.isActive ?? true,
        order,
      },
      select: { id: true, location: true, labelFa: true, labelEn: true, order: true, isActive: true },
    });
    return { content: [{ type: "text" as const, text: `✅ آیتم منو ساخته شد: «${item.labelFa}/${item.labelEn}» (${item.location}, ترتیب ${item.order})` }] };
  }
);

server.tool(
  "update_menu_item",
  "ویرایش یک آیتم منو با id. فقط فیلدهای ارسالی به‌روز می‌شوند.",
  {
    id: z.string(),
    location: z.enum(MENU_LOCATIONS).optional(),
    labelFa: z.string().optional(),
    labelEn: z.string().optional(),
    href: z.string().optional(),
    bgColor: z.string().regex(COLOR_RE).optional(),
    kind: z.enum(MENU_KINDS).optional(),
    fillIndicator: z.boolean().optional(),
    isActive: z.boolean().optional(),
    order: z.number().int().optional(),
  },
  async (args) => {
    const existing = await db.menuItem.findUnique({ where: { id: args.id } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: آیتم ${args.id} پیدا نشد.` }] };
    const data: Record<string, unknown> = {};
    if (args.location !== undefined) data.location = args.location;
    if (args.labelFa !== undefined) data.labelFa = args.labelFa.trim();
    if (args.labelEn !== undefined) data.labelEn = args.labelEn.trim();
    if (args.href !== undefined) data.href = args.href.trim();
    if (args.bgColor !== undefined) data.bgColor = args.bgColor;
    if (args.kind !== undefined) data.kind = args.kind;
    if (args.fillIndicator !== undefined) data.fillIndicator = args.fillIndicator;
    if (args.isActive !== undefined) data.isActive = args.isActive;
    if (args.order !== undefined) data.order = args.order;
    await db.menuItem.update({ where: { id: args.id }, data });
    return { content: [{ type: "text" as const, text: `✅ آیتم «${existing.labelFa}/${existing.labelEn}» به‌روز شد.` }] };
  }
);

server.tool(
  "delete_menu_item",
  "حذف یک آیتم منو با id. ترتیب سایر آیتم‌ها به‌صورت خودکار فشرده نمی‌شود — اگر می‌خواهید ترتیب مرتب بماند، بعد از حذف reorder_menu_items را صدا بزنید.",
  { id: z.string() },
  async ({ id }) => {
    const existing = await db.menuItem.findUnique({ where: { id } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: آیتم ${id} پیدا نشد.` }] };
    await db.menuItem.delete({ where: { id } });
    return { content: [{ type: "text" as const, text: `🗑️ آیتم «${existing.labelFa}/${existing.labelEn}» حذف شد.` }] };
  }
);

server.tool(
  "reorder_menu_items",
  "بازچینش آیتم‌های یک location با ترتیب جدید. آرایه‌ای از id به همان ترتیب دلخواه بدهید.",
  {
    location: z.enum(MENU_LOCATIONS),
    ordered_ids: z.array(z.string()),
  },
  async ({ location, ordered_ids }) => {
    const items = await db.menuItem.findMany({ where: { location }, select: { id: true } });
    const existingIds = new Set(items.map((i) => i.id));
    const invalid = ordered_ids.filter((id) => !existingIds.has(id));
    if (invalid.length) return { content: [{ type: "text" as const, text: `خطا: این idها در ${location} نیستند: ${invalid.join(", ")}` }] };

    await db.$transaction(
      ordered_ids.map((id, idx) =>
        db.menuItem.update({ where: { id }, data: { order: idx } })
      )
    );
    return { content: [{ type: "text" as const, text: `✅ ${ordered_ids.length} آیتم ${location} به ترتیب جدید چیده شدند.` }] };
  }
);

server.tool(
  "reset_menus",
  "بازنشانی همه منوها به مقادیر پیش‌فرض (منوی اصلی سایت). همه تغییرات از بین می‌روند. برای بازگشت به وضعیت اولیه.",
  {},
  async () => {
    await db.menuItem.deleteMany({});
    // بارگذاری presetها و درج
    const { PRESET_MENU } = await import("@/lib/menu-defaults");
    await db.menuItem.createMany({ data: PRESET_MENU.map(({ id: _id, ...rest }) => rest) });
    return { content: [{ type: "text" as const, text: `✅ منوها به ${PRESET_MENU.length} آیتم پیش‌فرض بازنشانی شدند.` }] };
  }
);

// ── تم (پالت رنگ، فونت، CSS سفارشی) ───────────────────────────────────────────
const THEME_FIELDS = [
  "backgroundColor", "foregroundColor", "primaryColor", "accentColor", "mutedColor",
  "fontHeading", "fontBody", "radius", "mode", "customCss",
] as const;

server.tool(
  "get_theme",
  "خواندن تنظیمات تم فعال: پالت رنگ، فونت، شعاع گوشه، حالت نمایش (LIGHT/DARK/AUTO) و CSS سفارشی.",
  {},
  async () => {
    const theme = await db.themeSetting.findFirst({ where: { isActive: true } });
    if (!theme) return { content: [{ type: "text" as const, text: "تم فعالی پیدا نشد — پیش‌فرض سیستم استفاده می‌شود." }] };
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          id: theme.id, isActive: theme.isActive,
          backgroundColor: theme.backgroundColor, foregroundColor: theme.foregroundColor,
          primaryColor: theme.primaryColor, accentColor: theme.accentColor, mutedColor: theme.mutedColor,
          fontHeading: theme.fontHeading, fontBody: theme.fontBody,
          radius: theme.radius, mode: theme.mode,
          customCss: theme.customCss ? `${theme.customCss.slice(0, 200)}${theme.customCss.length > 200 ? "..." : ""}` : "",
          customCssLength: theme.customCss.length,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "update_theme",
  "به‌روزرسانی تم فعال. فقط فیلدهای ارسالی تغییر می‌کنند. colorها باید #RRGGBB باشند. mode: LIGHT, DARK, AUTO. radius مثل '0.75rem'. customCss متن CSS خام است (بدون تگ <style>).",
  {
    backgroundColor: z.string().regex(COLOR_RE).optional(),
    foregroundColor: z.string().regex(COLOR_RE).optional(),
    primaryColor: z.string().regex(COLOR_RE).optional(),
    accentColor: z.string().regex(COLOR_RE).optional(),
    mutedColor: z.string().regex(COLOR_RE).optional(),
    fontHeading: z.string().optional(),
    fontBody: z.string().optional(),
    radius: z.string().optional(),
    mode: z.enum(["LIGHT", "DARK", "AUTO"]).optional(),
    customCss: z.string().optional(),
  },
  async (args) => {
    let theme = await db.themeSetting.findFirst({ where: { isActive: true } });
    if (!theme) {
      theme = await db.themeSetting.create({ data: {} });
    }
    const data: Record<string, unknown> = {};
    for (const f of THEME_FIELDS) {
      if (args[f] !== undefined) data[f] = args[f];
    }
    await db.themeSetting.update({ where: { id: theme.id }, data });
    return { content: [{ type: "text" as const, text: `✅ تم به‌روز شد (${Object.keys(data).length} فیلد).` }] };
  }
);

// ── تنظیمات کلی (key-value) ──────────────────────────────────────────────────
server.tool(
  "get_settings",
  "خواندن همه تنظیمات key-value سایت (اطلاعات تماس، شبکه‌های اجتماعی، ...). type: text | json | markdown.",
  {},
  async () => {
    const settings = await db.setting.findMany({ orderBy: { key: "asc" } });
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          count: settings.length,
          settings: settings.map((s) => ({ key: s.key, value: s.value.slice(0, 200), type: s.type, label: s.label })),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_setting",
  "خواندن یک تنظیم با key.",
  { key: z.string() },
  async ({ key }) => {
    const s = await db.setting.findUnique({ where: { key } });
    if (!s) return { content: [{ type: "text" as const, text: `تنظیمی با key «${key}» پیدا نشد.` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify({ key: s.key, value: s.value, type: s.type, label: s.label }, null, 2) }] };
  }
);

server.tool(
  "update_setting",
  "به‌روزرسانی یا ساخت یک تنظیم. اگر وجود نداشته باشد ساخته می‌شود. type برای نحوه نمایش در پنل است.",
  {
    key: z.string().min(1),
    value: z.string(),
    type: z.enum(["text", "json", "markdown"]).default("text").optional(),
    label: z.string().optional(),
  },
  async (args) => {
    const data: { value: string; type?: string; label?: string } = { value: args.value };
    if (args.type !== undefined) data.type = args.type;
    if (args.label !== undefined) data.label = args.label;
    const s = await db.setting.upsert({
      where: { key: args.key },
      update: data,
      create: { key: args.key, value: args.value, type: args.type ?? "text", label: args.label ?? null },
    });
    return { content: [{ type: "text" as const, text: `✅ تنظیم «${s.key}» ذخیره شد (مقدار ${s.value.length} کاراکتر).` }] };
  }
);

// ── حذف دسته/برچسب/صفحه (تکمیل چرخه عمر) ───────────────────────────────────────
server.tool(
  "delete_category",
  "حذف یک دسته با slug. اگر به نوشته‌ای وصل باشد، خطا می‌دهد (اول از نوشته‌ها جدا کنید).",
  { slug: z.string() },
  async ({ slug }) => {
    const existing = await db.category.findUnique({ where: { slug }, include: { _count: { select: { posts: true } } } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: دسته «${slug}» پیدا نشد.` }] };
    if (existing._count.posts > 0) return { content: [{ type: "text" as const, text: `خطا: این دسته به ${existing._count.posts} نوشته وصل است — اول از نوشته‌ها جدا کنید.` }] };
    await db.category.delete({ where: { slug } });
    return { content: [{ type: "text" as const, text: `🗑️ دسته «${existing.name}» حذف شد.` }] };
  }
);

server.tool(
  "delete_tag",
  "حذف یک برچسب با slug. اگر به نوشته‌ای وصل باشد، خطا می‌دهد.",
  { slug: z.string() },
  async ({ slug }) => {
    const existing = await db.tag.findUnique({ where: { slug }, include: { _count: { select: { posts: true } } } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: برچسب «${slug}» پیدا نشد.` }] };
    if (existing._count.posts > 0) return { content: [{ type: "text" as const, text: `خطا: این برچسب به ${existing._count.posts} نوشته وصل است.` }] };
    await db.tag.delete({ where: { slug } });
    return { content: [{ type: "text" as const, text: `🗑️ برچسب «${existing.name}» حذف شد.` }] };
  }
);

server.tool(
  "delete_page",
  "حذف یک صفحه استاتیک با slug. برگشت‌ناپذیر.",
  { slug: z.string() },
  async ({ slug }) => {
    const existing = await db.staticPage.findUnique({ where: { slug } });
    if (!existing) return { content: [{ type: "text" as const, text: `خطا: صفحه «${slug}» پیدا نشد.` }] };
    await db.staticPage.delete({ where: { slug } });
    return { content: [{ type: "text" as const, text: `🗑️ صفحه «${existing.title}» حذف شد.` }] };
  }
);

// ── راستی‌آزمایی ─────────────────────────────────────────────────────────────
server.tool(
  "health_check",
  "گزارش سلامت سریع: تعداد نوشته‌های منتشرشده/پیش‌نویس، صفحات، دوره‌ها، سرنخ‌های جدید، ثبت‌نام‌های در انتظار. برای پاسخ سریع «آیا چیزی نیاز به توجه دارد؟».",
  {},
  async () => {
    const [posts, draftPosts, pages, draftPages, courses, newLeads, pendingRegs, menus, headerMenus, footerMenus, theme] = await Promise.all([
      db.post.count({ where: { status: "PUBLISHED" } }),
      db.post.count({ where: { status: "DRAFT" } }),
      db.staticPage.count({ where: { status: "PUBLISHED" } }),
      db.staticPage.count({ where: { status: "DRAFT" } }),
      db.course.count({ where: { published: true } }),
      db.lead.count({ where: { status: "NEW" } }),
      db.registration.count({ where: { status: "PENDING" } }),
      db.menuItem.count({ where: { isActive: true } }),
      db.menuItem.count({ where: { location: "header", isActive: true } }),
      db.menuItem.count({ where: { location: "footer", isActive: true } }),
      db.themeSetting.findFirst({ where: { isActive: true }, select: { mode: true, accentColor: true } }),
    ]);
    const alerts: string[] = [];
    if (draftPosts > 0) alerts.push(`${draftPosts} نوشته پیش‌نویس مانده`);
    if (draftPages > 0) alerts.push(`${draftPages} صفحه پیش‌نویس مانده`);
    if (newLeads > 0) alerts.push(`${newLeads} سرنخ جدید بدون رسیدگی`);
    if (pendingRegs > 0) alerts.push(`${pendingRegs} ثبت‌نام در انتظار تأیید`);
    if (headerMenus === 0) alerts.push("منوی هدر خالی است — سایت بدون ناوبری است!");
    if (footerMenus === 0) alerts.push("منوی فوتر خالی است");
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          summary: {
            published_posts: posts,
            draft_posts: draftPosts,
            published_pages: pages,
            draft_pages: draftPages,
            published_courses: courses,
            new_leads: newLeads,
            pending_registrations: pendingRegs,
            active_menu_items: menus,
            header_menu_items: headerMenus,
            footer_menu_items: footerMenus,
            theme_mode: theme?.mode || "default",
            theme_accent: theme?.accentColor || "default",
          },
          alerts: alerts.length ? alerts : "هیچ هشداری نیست — همه چیز رو به راه است.",
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "list_draft_content",
  "فهرست نوشته‌ها و صفحاتی که هنوز پیش‌نویس هستند و نیاز به انتشار دارند.",
  {},
  async () => {
    const [draftPosts, draftPages] = await Promise.all([
      db.post.findMany({ where: { status: "DRAFT" }, select: { slug: true, title: true, updatedAt: true } }),
      db.staticPage.findMany({ where: { status: "DRAFT" }, select: { slug: true, title: true, updatedAt: true } }),
    ]);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          draft_posts: draftPosts.map((p) => ({ slug: p.slug, title: p.title, updatedAt: faDate(p.updatedAt) })),
          draft_pages: draftPages.map((p) => ({ slug: p.slug, title: p.title, updatedAt: faDate(p.updatedAt) })),
          total: draftPosts.length + draftPages.length,
        }, null, 2),
      }],
    };
  }
);

// ── راه‌اندازی ───────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Server آکادمی نیله آماده است — روی stdio");
