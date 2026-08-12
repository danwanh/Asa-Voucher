import { PrismaClient } from "@prisma/client";
import { seedRbac } from "./rbac-seed.js";

const prisma = new PrismaClient();
seedRbac({ prisma })
  .then(() => { console.log("RBAC seed done"); return prisma.$disconnect(); })
  .catch((e) => { console.error(e); process.exit(1); });
