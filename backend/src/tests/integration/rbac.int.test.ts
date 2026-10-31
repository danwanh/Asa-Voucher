import { beforeAll, describe, expect, it } from "vitest";
import { API, accounts, api, bearer, buyVouchers, ids, tokenFor } from "./helpers.js";

describe("role-based access", () => {
  let buyer: string;
  let highlandsStore: string;
  let cgvStore: string;

  beforeAll(async () => {
    [buyer, highlandsStore, cgvStore] = await Promise.all([
      tokenFor(accounts.buyer),
      tokenFor(accounts.highlandsStoreQ1),
      tokenFor(accounts.cgvStoreVincom),
    ]);
  });

  it("requires a login for protected routes", async () => {
    for (const path of ["/cart", "/orders", "/issued-vouchers", "/auth/me"]) {
      const res = await api().get(`${API}${path}`);
      expect(res.status, path).toBe(401);
    }
  });

  it("does not let a buyer redeem vouchers", async () => {
    const res = await api().post(`${API}/issued-vouchers/confirm`).set(bearer(buyer)).send({ voucher_code: "ASA-HLC-000002" });
    expect(res.status).toBe(403);
  });

  it("does not let store staff use the cart", async () => {
    const res = await api().get(`${API}/cart`).set(bearer(highlandsStore));
    expect(res.status).toBe(403);
  });

  it("does not let a buyer approve voucher products", async () => {
    const res = await api()
      .patch(`${API}/voucher-products/${ids.vouchers.pizzaHutFamily}/approval`)
      .set(bearer(buyer))
      .send({ approval_status: "approved" });
    expect(res.status).toBe(403);
  });

  it("does not let staff of another partner see a voucher", async () => {
    const { vouchers } = await buyVouchers(buyer, ids.vouchers.highlandsBogo);
    const voucherId = vouchers[0].id;

    const own = await api().get(`${API}/issued-vouchers/${voucherId}`).set(bearer(highlandsStore));
    expect(own.status).toBe(200);

    const other = await api().get(`${API}/issued-vouchers/${voucherId}`).set(bearer(cgvStore));
    expect(other.status).toBe(403);
  });

  it("does not let one buyer see another buyer's voucher", async () => {
    const { vouchers } = await buyVouchers(buyer, ids.vouchers.highlandsBogo);
    const otherBuyer = await tokenFor(accounts.otherBuyer);

    const res = await api().get(`${API}/issued-vouchers/${vouchers[0].id}`).set(bearer(otherBuyer));
    expect(res.status).toBe(403);
  });
});
