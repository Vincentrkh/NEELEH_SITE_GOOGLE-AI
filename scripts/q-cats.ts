import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const cats = await db.category.findMany({ select: { slug: true, name: true, nameEn: true } });
  const tags = await db.tag.findMany({ select: { slug: true, name: true, nameEn: true } });
  console.log("CATEGORIES:", JSON.stringify(cats));
  console.log("TAGS:", JSON.stringify(tags));
  await db.$disconnect();
})();
