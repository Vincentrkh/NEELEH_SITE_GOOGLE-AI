import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const PAGE_EXCERPT_EN: Record<string, string> = {
  about: "Neeleh Academy — specialized training in digital architecture tools, from construction drawings to artificial intelligence.",
  terms: "Registration rules, payment terms, cancellation policy, and code of conduct for Neeleh Academy courses.",
  faq: "Frequently asked questions about course registration, sessions, software, certificates, and refunds.",
};

async function main() {
  let n = 0;
  for (const [slug, en] of Object.entries(PAGE_EXCERPT_EN)) {
    const page = await db.staticPage.findUnique({ where: { slug } });
    if (!page) continue;
    await db.staticPage.update({ where: { slug }, data: { excerptEn: en } });
    n++;
    console.log(`✓ excerptEn: ${slug}`);
  }
  console.log(`✅ ${n} صفحه آپدیت شد.`);
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
