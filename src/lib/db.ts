import { PrismaClient } from "@prisma/client";

/**
 * Client singleton برای Prisma. در محیط توسعه از متغیر گلوبال استفاده می‌کنیم
 * تا از ساخته‌شدن چندین کانکشن در HMR جلوگیری شود.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch {
    console.warn("[AI Studio] Database not connected — using mock");
    const noOp = {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      count: async () => 0,
      create: async (d: { data?: Record<string, unknown> }) => d?.data ?? {},
      createMany: async () => ({ count: 0 }),
      update: async (d: { data?: Record<string, unknown> }) => d?.data ?? {},
      upsert: async (d: { create?: Record<string, unknown> }) => d?.create ?? {},
      delete: async () => ({}),
      deleteMany: async () => ({ count: 0 }),
    };
    return new Proxy({} as PrismaClient, {
      get: (_target, prop) => {
        if (prop === "$transaction") return async (ops: Promise<unknown>[]) => Promise.all(ops);
        if (prop === "$connect" || prop === "$disconnect") return async () => {};
        return noOp;
      },
    });
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
