import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

export async function getDatabaseStatus() {
  if (!env.DATABASE_URL) return { configured: false };

  await prisma.$queryRaw`select 1`;
  return { configured: true };
}
