import { beforeAll, describe, expect, it } from "vitest";
import { API, accounts, api, bearer, buyVouchers, ids, prisma, tokenFor } from "./helpers.js";

describe("redeeming vouchers at the store", () => {
  let buyer: string;
  let storeQ1: string;
  let storeTDB: string;
  let cgvStore: string;

  beforeAll(async () => {
    [buyer, storeQ1, storeTDB, cgvStore] = await Promise.all([
      tokenFor(accounts.buyer),
      tokenFor(accounts.highlandsStoreQ1),
      tokenFor(accounts.highlandsStoreTDB),
      tokenFor(accounts.cgvStoreVincom),
    ]);
  });

  const confirm = (token: string, code: string) =>
    api().post(`${API}/issued-vouchers/confirm`).set(bearer(token)).send({ voucher_code: code });

  it("checks then redeems a voucher, and refuses to redeem it again", async () => {
    const { vouchers } = await buyVouchers(buyer, ids.vouchers.highlandsBogo);
    const code = vouchers[0].voucher_code;

    const check = await api().post(`${API}/issued-vouchers/check`).set(bearer(storeQ1)).send({ voucher_code: code });
    expect(check.status).toBe(200);
    expect(check.body.data.eligible_branch_ids).toContain(ids.branches.highlandsQ1);

    const first = await confirm(storeQ1, code);
    expect(first.status).toBe(200);
    expect(first.body.data.issued_voucher).toMatchObject({ status: "used", branch_id: ids.branches.highlandsQ1 });

    const stored = await prisma.issuedVoucher.findUniqueOrThrow({ where: { id: vouchers[0].id } });
    expect(stored.status).toBe("used");
    expect(stored.redeemed_by).toBe(ids.users.storeStaffHighlandsQ1);

    const second = await confirm(storeQ1, code);
    expect(second.status).toBe(400);
  });

  it("rejects staff from another partner", async () => {
    const { vouchers } = await buyVouchers(buyer, ids.vouchers.highlandsBogo);
    const res = await confirm(cgvStore, vouchers[0].voucher_code);
    expect(res.status).toBe(403);
    const stored = await prisma.issuedVoucher.findUniqueOrThrow({ where: { id: vouchers[0].id } });
    expect(stored.status).toBe("active");
  });

  it("rejects staff from a branch where the voucher is not valid", async () => {
    // karaokeKatinat belongs to Highlands but is only valid at the Q1 branch
    const { vouchers } = await buyVouchers(buyer, ids.vouchers.karaokeKatinat);
    const res = await confirm(storeTDB, vouchers[0].voucher_code);
    expect(res.status).toBe(403);
  });

  it("rejects an expired voucher and marks it expired", async () => {
    const { vouchers } = await buyVouchers(buyer, ids.vouchers.highlandsBogo);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.issuedVoucher.update({ where: { id: vouchers[0].id }, data: { expired_date: yesterday } });

    const res = await confirm(storeQ1, vouchers[0].voucher_code);
    expect(res.status).toBe(400);
    const stored = await prisma.issuedVoucher.findUniqueOrThrow({ where: { id: vouchers[0].id } });
    expect(stored.status).toBe("expired");
  });

  it("redeems a voucher only once when two staff confirm it at the same time", async () => {
    const { vouchers } = await buyVouchers(buyer, ids.vouchers.highlandsBogo);
    const code = vouchers[0].voucher_code;

    const results = await Promise.all([confirm(storeQ1, code), confirm(storeTDB, code)]);
    const statuses = results.map((res) => res.status).sort();

    expect(statuses).toEqual([200, 400]);
  });

  it("reports the order as confirmed after all its vouchers are used", async () => {
    const { orderId, vouchers } = await buyVouchers(buyer, ids.vouchers.highlandsBogo);
    expect((await confirm(storeQ1, vouchers[0].voucher_code)).status).toBe(200);

    const stored = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(stored.status).toBe("completed");

    const res = await api().get(`${API}/orders/${orderId}`).set(bearer(buyer));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("confirmed");

    const list = await api().get(`${API}/orders?status=confirmed&limit=100`).set(bearer(buyer));
    expect(list.body.data.items.map((order: { id: string }) => order.id)).toContain(orderId);

    // A completed order must not be payable again
    const pay = await api().post(`${API}/orders/${orderId}/payments`).set(bearer(buyer)).send({ method: "vnpay" });
    expect(pay.status).toBe(409);
    expect(pay.body.error.code).toBe("ORDER_ALREADY_PAID");
  });
});
