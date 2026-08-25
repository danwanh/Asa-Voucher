import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/utils/auth.js";
import { seedPartners } from "./00-partners.js";
import { seedUsers } from "./01-users.js";
import { seedCatalog } from "./02-catalog.js";
import { seedCommerce } from "./03-commerce.js";
import { seedEngagement } from "./04-engagement.js";
import { TEST_PASSWORD } from "./shared.js";

const prisma = new PrismaClient();

async function clearSeedDomain() {
  await prisma.complaintResponse.deleteMany();
  await prisma.reviewResponse.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.review.deleteMany();
  await prisma.issuedVoucher.deleteMany();

  await prisma.paymentLog.deleteMany();
  await prisma.orderLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();

  await prisma.voucherProductBranch.deleteMany();
  await prisma.voucherProductImage.deleteMany();
  await prisma.voucherProduct.deleteMany();
  await prisma.category.deleteMany();

  await prisma.partnerBranch.deleteMany();
  await prisma.partner.deleteMany();

  await prisma.refreshToken.deleteMany();
  await prisma.authenticationLog.deleteMany();
  await prisma.adminLog.deleteMany();

  await prisma.user.deleteMany();
}

async function main() {
  const passwordHash = await hashPassword(TEST_PASSWORD);

  await clearSeedDomain();

  await seedUsers({ prisma, passwordHash });
  await seedPartners({ prisma, passwordHash });
  await seedCatalog({ prisma, passwordHash });
  await seedCommerce({ prisma, passwordHash });
  await seedEngagement({ prisma, passwordHash });

  console.log("Seed dữ liệu hoàn tất.");
  console.log(`Mật khẩu test dùng chung: ${TEST_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed thất bại:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
