/**
 * Seed آکادمی نیله — نقش‌ها، مجوزها، کاربر ادمین، تم پیش‌فرض.
 * اجرا: bun scripts/seed.ts   (idempotent — تکرارش ایمن است)
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { ALL_PERMISSIONS } from "../src/lib/permissions";

const db = new PrismaClient();

const ADMIN_PHONE = process.env.ADMIN_PHONE || "09121234567";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Neeleh@1404";

async function main() {
  console.log("🌱 شروع seed آکادمی نیله...\n");

  // 1) همه مجوزها
  console.log("• ثبت مجوزها...");
  for (const p of ALL_PERMISSIONS) {
    await db.permission.upsert({
      where: { key: p.key },
      update: { label: p.label },
      create: { key: p.key, label: p.label },
    });
  }
  const allPerms = await db.permission.findMany();
  console.log(`  ✔ ${allPerms.length} مجوز`);

  // 2) نقش‌های سیستمی: ADMIN, EDITOR, STUDENT
  console.log("• ثبت نقش‌های سیستمی...");
  const roles = [
    {
      name: "ADMIN",
      label: "ادمین کل",
      description: "دسترسی کامل به همه بخش‌های سیستم. قابل حذف نیست.",
    },
    {
      name: "EDITOR",
      label: "ویراستار محتوا",
      description: "مدیریت دوره‌ها، مقالات و صفحات — بدون دسترسی به ثبت‌نام‌ها و کاربران.",
    },
    {
      name: "STUDENT",
      label: "هنرجو",
      description: "دسترسی به پنل هنرجو، دوره‌های ثبت‌نام‌شده و فایل‌های آن‌ها.",
    },
  ];
  for (const r of roles) {
    await db.role.upsert({
      where: { name: r.name },
      update: { label: r.label, description: r.description, isSystem: true },
      create: { ...r, isSystem: true },
    });
  }
  const adminRole = await db.role.findUnique({ where: { name: "ADMIN" } });
  const editorRole = await db.role.findUnique({ where: { name: "EDITOR" } });
  const studentRole = await db.role.findUnique({ where: { name: "STUDENT" } });

  // 3) اختصاص همه مجوزها به ADMIN و EDITOR
  if (adminRole) {
    for (const p of allPerms) {
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: p.id },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: p.id },
      });
    }
    console.log(`  ✔ ADMIN: همه ${allPerms.length} مجوز`);
  }
  // EDITOR: فقط محتوایی
  if (editorRole) {
    const editorPerms = allPerms.filter((p) =>
      [
        "course.",
        "post.",
        "comment.",
        "page.",
        "file.",
        "lead.view",
        "registration.view",
      ].some((prefix) => p.key.startsWith(prefix))
    );
    for (const p of editorPerms) {
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: editorRole.id, permissionId: p.id },
        },
        update: {},
        create: { roleId: editorRole.id, permissionId: p.id },
      });
    }
    console.log(`  ✔ EDITOR: ${editorPerms.length} مجوز محتوایی`);
  }
  // STUDENT: فقط PANEL_VIEW
  if (studentRole) {
    const panelPerm = allPerms.find((p) => p.key === "panel.view");
    if (panelPerm) {
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: studentRole.id, permissionId: panelPerm.id },
        },
        update: {},
        create: { roleId: studentRole.id, permissionId: panelPerm.id },
      });
    }
    console.log(`  ✔ STUDENT: 1 مجوز (panel.view)`);
  }

  // 4) کاربر ادمین
  console.log("• ثبت کاربر ادمین...");
  const admin = await db.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: {
      field: "مدیریت طراحی و سیستم‌های هوشمند معماری",
      education: "کارشناسی ارشد معماری — دانشگاه تهران",
    },
    create: {
      phone: ADMIN_PHONE,
      name: "مدیر آکادمی نیله",
      nameEn: "Neeleh Academy Admin",
      password: hashPassword(ADMIN_PASSWORD),
      email: "admin@neeleh.academy",
      field: "مدیریت طراحی و سیستم‌های هوشمند معماری",
      education: "کارشناسی ارشد معماری — دانشگاه تهران",
      bio: "بنیان‌گذار و مدرس ارشد آکادمی نیله — ۲۸ سال تجربه مدیریت طراحی و معماری.",
      bioEn:
        "Founder and senior instructor at Neeleh Academy — 28 years of design and architecture management experience.",
    },
  });
  if (adminRole) {
    await db.userRole.upsert({
      where: {
        userId_roleId: { userId: admin.id, roleId: adminRole.id },
      },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    });
  }
  console.log(`  ✔ ادمین: ${admin.phone} / ${ADMIN_PASSWORD}`);

  // 5) تم پیش‌فرض
  console.log("• ثبت تم پیش‌فرض...");
  await db.themeSetting.deleteMany({});
  await db.themeSetting.create({
    data: {
      isActive: true,
      backgroundColor: "#fafaf7",
      foregroundColor: "#1a1a18",
      primaryColor: "#1f1f1c",
      accentColor: "#a8632c", // خاک‌رس فعلی
      mutedColor: "#8a8a85",
      fontHeading: "Estedad Var",
      fontBody: "Vazirmatn Var",
      radius: "0.75rem",
      mode: "LIGHT",
      customCss: "",
    },
  });
  console.log("  ✔ تم پیش‌فرض (LIGHT، خاک‌رس)");

  // 5b) استایل پیش‌فرض تصاویر برداری
  const illusCount = await db.illustrationStyle.count();
  if (illusCount === 0) {
    await db.illustrationStyle.create({
      data: {
        isActive: true,
        bgColor: "#F2F0EB",
        lineColor: "#B8B5AE",
        accentColor: "#8E3B3B",
        waterColor: "#DCE4E4",
        vegetationColor: "#E4E6E0",
        fillColor: "#D8D5CE",
        thinLineWidth: 0.5,
        thickLineWidth: 1.5,
        outlineWidth: 2.0,
        edgeFadeOpacity: 0.2,
        centerOpacity: 0.9,
        fadeRadius: 0.6,
        animationSpeed: 1.0,
        enableWave: true,
        enableSway: true,
        enableDraw: true,
        enablePulse: true,
      },
    });
    console.log("  ✔ استایل تصویربرداری پیش‌فرض");
  }

  // 6) تنظیمات محتوای صفحه اصلی (key-value)
  console.log("• ثبت تنظیمات محتوای صفحه اصلی...");
  const settings = [
    { key: "hero.title", value: "آکادمی نیله", label: "عنوان اصلی هیرو" },
    { key: "hero.titleEn", value: "Neeleh Academy", label: "عنوان اصلی هیرو (انگلیسی)" },
    { key: "hero.subtitle", value: "سیستم‌های هوشمند معماری و آموزش عصر AI", label: "زیرعنوان هیرو" },
    { key: "hero.subtitleEn", value: "Smart architectural systems & AI-era education", label: "زیرعنوان هیرو (انگلیسی)" },
    { key: "hero.tagline", value: "معماری را فراتر از ابزارها یاد بگیرید", label: "شعار" },
    { key: "hero.taglineEn", value: "Learn architecture beyond the tools", label: "شعار (انگلیسی)" },
    { key: "hero.intro", value: "استودیوی تخصصی نیله، با تکیه بر تجربه حرفه‌ای و تسلط بر ابزارهای نوین طراحی محاسباتی، مدلسازی اطلاعات ساختمان (BIM) و هوش مصنوعی، مسیر نوین یادگیری و ارتقای مهندسی معماری را ترسیم می‌کند.", label: "معرفی کوتاه" },
    { key: "hero.introEn", value: "Neeleh is a specialized studio-led academy. Drawing on professional experience and mastery of modern computational design tools, Building Information Modeling (BIM) and artificial intelligence, it charts a new learning path for advancing the architectural engineering profession.", label: "معرفی کوتاه (انگلیسی)" },
    { key: "contact.phone", value: "۰۲۱ - ۸۸ ۰۰ ۰۰ ۰۰", label: "تلفن تماس" },
    { key: "contact.email", value: "hello@neeleh.academy", label: "ایمیل تماس" },
    { key: "contact.address", value: "تهران — محل برگزاری کلاس‌ها در آکادمی نیله", label: "آدرس" },
    { key: "contact.addressEn", value: "Tehran — classes are held at Neeleh Academy", label: "آدرس (انگلیسی)" },
    { key: "contact.hours", value: "شنبه تا چهارشنبه، ۹ تا ۱۸", label: "ساعات کاری" },
    { key: "contact.hoursEn", value: "Saturday to Wednesday, 9 to 18", label: "ساعات کاری (انگلیسی)" },
    { key: "stats.years", value: "۲۸+", label: "آمار: سال تجربه" },
    { key: "stats.courses", value: "۹", label: "آمار: تعداد دوره" },
    { key: "stats.graduates", value: "۳۰۰+", label: "آمار: فارغ‌التحصیلان" },
    { key: "stats.instructors", value: "۴", label: "آمار: تعداد مدرس" },
    { key: "social.instagram", value: "https://instagram.com", label: "اینستاگرام" },
    { key: "social.telegram", value: "https://telegram.org", label: "تلگرام" },
    { key: "social.linkedin", value: "https://linkedin.com", label: "لینکدین" },
    { key: "social.youtube", value: "https://youtube.com", label: "یوتیوب" },
    { key: "social.behance", value: "https://behance.net", label: "بیهانس" },
  ];
  for (const s of settings) {
    await db.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`  ✔ ${settings.length} تنظیم محتوایی`);

  // 5) منوی پیش‌فرض (فقط اگر جدول منو خالی باشد — idempotent)
  const menuCount = await db.menuItem.count();
  if (menuCount === 0) {
    const { PRESET_MENU } = await import("../src/lib/menu-defaults");
    await db.menuItem.createMany({ data: PRESET_MENU });
    console.log(`  ✔ ${PRESET_MENU.length} آیتم منوی پیش‌فرض`);
  } else {
    console.log(`  • منوها از قبل موجود است (${menuCount} آیتم) — دست نخورد`);
  }

  console.log("\n✅ seed کامل شد.");
  console.log(`\n📋 ورود ادمین:`);
  console.log(`   شماره موبایل: ${ADMIN_PHONE}`);
  console.log(`   رمز عبور: ${ADMIN_PASSWORD}`);
  console.log(`   مسیر ورود: /login`);
}

main()
  .catch((e) => {
    console.error("seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
