// Seed accounts (backend/prisma/seed). All share the same password.
export const PASSWORD = "User12345@";

export const accounts = {
  buyer: "buyer@asa.test",
  adminContent: "admin.content@asa.test",
  highlandsStoreQ1: "store.staff@asa.test",
  highlandsStoreTDB: "store.highlands.tdb@asa.test",
} as const;

// Seed voucher products (backend/prisma/seed/02-catalog.ts)
export const vouchers = {
  highlandsBogoId: "50000000-0000-0000-0000-000000000001",
  highlandsBogoName: "Mua 1 tặng 1 Highlands Coffee size vừa",
  phucLongName: "Trà sữa Phúc Long size L giảm 35%",
  // Highlands voucher valid only at the Q1 branch
  karaokeKatinatId: "50000000-0000-0000-0000-000000000014",
} as const;
