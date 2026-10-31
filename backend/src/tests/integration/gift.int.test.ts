import { beforeAll, describe, expect, it } from "vitest";
import { API, accounts, api, bearer, buyVouchers, ids, tokenFor } from "./helpers.js";

const product = ids.vouchers.highlandsBogo;

describe("gifting vouchers", () => {
  let sender: string;
  let recipient: string;

  beforeAll(async () => {
    [sender, recipient] = await Promise.all([tokenFor(accounts.buyer), tokenFor(accounts.giftRecipient)]);
  });

  it("gives the vouchers to the recipient, not the sender", async () => {
    const { vouchers } = await buyVouchers(sender, product, 1, {
      is_gift: true,
      recipient_identifier: accounts.giftRecipient,
    });
    const giftedId = vouchers[0].id;

    const recipientList = await api().get(`${API}/issued-vouchers?limit=100`).set(bearer(recipient));
    expect(recipientList.status).toBe(200);
    expect(recipientList.body.data.items.map((item: { id: string }) => item.id)).toContain(giftedId);

    const senderList = await api().get(`${API}/issued-vouchers?limit=100`).set(bearer(sender));
    expect(senderList.body.data.items.map((item: { id: string }) => item.id)).not.toContain(giftedId);
  });

  it("rejects gifting to yourself", async () => {
    const res = await api()
      .post(`${API}/orders`)
      .set(bearer(sender))
      .send({
        items: [{ voucher_product_id: product, quantity: 1 }],
        payment_method: "vnpay",
        is_gift: true,
        recipient_identifier: accounts.buyer,
      });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("RECIPIENT_IS_SELF");
  });

  it("rejects gifting to an unknown recipient", async () => {
    const res = await api()
      .post(`${API}/orders`)
      .set(bearer(sender))
      .send({
        items: [{ voucher_product_id: product, quantity: 1 }],
        payment_method: "vnpay",
        is_gift: true,
        recipient_identifier: "nobody@asa.test",
      });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("RECIPIENT_NOT_FOUND");
  });

  it("requires a recipient when the order is a gift", async () => {
    const res = await api()
      .post(`${API}/orders`)
      .set(bearer(sender))
      .send({ items: [{ voucher_product_id: product, quantity: 1 }], payment_method: "vnpay", is_gift: true });
    expect(res.status).toBe(400);
  });
});
