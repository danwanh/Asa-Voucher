import { beforeAll, describe, expect, it } from "vitest";
import { API, accounts, api, bearer, ids, tokenFor } from "./helpers.js";

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function newVoucher(overrides: Record<string, unknown> = {}) {
  return {
    category_id: ids.categories.caPhe,
    name: `Test voucher ${Date.now()}`,
    description: "Voucher dùng cho integration test",
    original_price: 100000,
    selling_price: 80000,
    total_quantity: 50,
    sale_start_date: daysFromNow(-1),
    sale_end_date: daysFromNow(30),
    validity_days: 30,
    terms_and_conditions: "Áp dụng tại cửa hàng",
    ...overrides,
  };
}

describe("voucher product lifecycle", () => {
  let staff: string;
  let admin: string;

  beforeAll(async () => {
    [staff, admin] = await Promise.all([tokenFor(accounts.highlandsVoucherStaff), tokenFor(accounts.adminContent)]);
  });

  it("goes from draft to publicly listed after submission and admin approval", async () => {
    const created = await api().post(`${API}/voucher-products`).set(bearer(staff)).send(newVoucher());
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ status: "draft", approval_status: "pending" });
    const id = created.body.data.id as string;

    const isPublic = async () => {
      const res = await api().get(`${API}/voucher-products?limit=100`);
      return res.body.data.items.some((item: { id: string }) => item.id === id);
    };
    expect(await isPublic()).toBe(false);

    const branch = await api()
      .post(`${API}/voucher-products/${id}/branches`)
      .set(bearer(staff))
      .send({ branch_id: ids.branches.highlandsQ1 });
    expect(branch.status).toBe(201);

    const submitted = await api().patch(`${API}/voucher-products/${id}/submit`).set(bearer(staff));
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.workflow_status).toBe("pending_approval");

    const approved = await api()
      .patch(`${API}/voucher-products/${id}/approval`)
      .set(bearer(admin))
      .send({ approval_status: "approved" });
    expect(approved.status).toBe(200);
    expect(approved.body.data).toMatchObject({ approval_status: "approved", status: "active" });

    expect(await isPublic()).toBe(true);
  });

  it("rejects a selling price above the original price", async () => {
    const res = await api()
      .post(`${API}/voucher-products`)
      .set(bearer(staff))
      .send(newVoucher({ original_price: 50000, selling_price: 80000 }));
    expect(res.status).toBe(400);
  });

  it("does not let staff submit a voucher without a branch", async () => {
    const created = await api().post(`${API}/voucher-products`).set(bearer(staff)).send(newVoucher());
    const res = await api().patch(`${API}/voucher-products/${created.body.data.id}/submit`).set(bearer(staff));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_VOUCHER_BRANCH");
  });

  it("requires a reason when the admin rejects a voucher", async () => {
    const created = await api().post(`${API}/voucher-products`).set(bearer(staff)).send(newVoucher());
    const id = created.body.data.id as string;

    const noReason = await api()
      .patch(`${API}/voucher-products/${id}/approval`)
      .set(bearer(admin))
      .send({ approval_status: "rejected" });
    expect(noReason.status).toBe(400);

    const withReason = await api()
      .patch(`${API}/voucher-products/${id}/approval`)
      .set(bearer(admin))
      .send({ approval_status: "rejected", reject_reason: "Thiếu hình ảnh" });
    expect(withReason.status).toBe(200);
    expect(withReason.body.data.approval_status).toBe("rejected");
  });
});
