import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const posts = await db.post.findMany({
    select: { slug: true, title: true, excerpt: true, status: true },
    take: 20,
  });
  console.log(JSON.stringify(posts, null, 1));
  await db.$disconnect();
})();
