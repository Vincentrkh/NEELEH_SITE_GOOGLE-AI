import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const CAT_FA_TO_EN: Record<string, string> = {
  "آموزش": "Education",
  "صنعت": "Industry",
  "ابزارها": "Tools",
  "هوش مصنوعی": "Artificial Intelligence",
};

const TAG_FA_TO_EN: Record<string, string> = {
  "نقشه‌کشی اجرایی": "Construction Drafting",
  "رندرینگ": "Rendering",
  "طراحی پارامتریک": "Parametric Design",
  "متره و برآورد": "Quantity Takeoff",
  "اتوماسیون": "Automation",
  "هوش مصنوعی": "Artificial Intelligence",
  // لاتین‌ها همان نام باقی می‌مانند
};

async function main() {
  let c = 0, t = 0;
  const cats = await db.category.findMany();
  for (const cat of cats) {
    const en = CAT_FA_TO_EN[cat.name] ?? cat.name;
    if (cat.nameEn !== en) {
      await db.category.update({ where: { id: cat.id }, data: { nameEn: en } });
      c++;
    }
  }
  const tags = await db.tag.findMany();
  for (const tag of tags) {
    const en = TAG_FA_TO_EN[tag.name] ?? tag.name; // لاتین → همان نام
    if (tag.nameEn !== en) {
      await db.tag.update({ where: { id: tag.id }, data: { nameEn: en } });
      t++;
    }
  }
  console.log(`✅ ${c} دسته و ${t} تگ EN شد.`);
  await db.$disconnect();
}
main();
