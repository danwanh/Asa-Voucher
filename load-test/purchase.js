import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:5000/api";
const VUS = Number(__ENV.VUS || 50);
const BUYERS = (__ENV.BUYERS || "buyer@asa.test,le.hoang.nam@asa.test,tran.gia.han@asa.test,pham.quoc.bao@asa.test,huynh.ngoc.linh@asa.test,do.thu.trang@asa.test,vu.duc.manh@asa.test,nguyen.bao.vy@asa.test").split(",");

export const options = {
  stages: [
    { duration: "30s", target: VUS },
    { duration: "2m", target: VUS },
    { duration: "30s", target: 0 }
  ],
  thresholds: {
    "http_req_duration{name:checkout}": ["p(95)<1500"],
    http_req_failed: ["rate<0.02"]
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "max"]
};

const json = (token) => ({ headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });

export function setup() {
  if (!__ENV.PASSWORD) throw new Error("Thiếu -e PASSWORD=<mật khẩu seed>");
  const tokens = BUYERS.map((identifier) => {
    const res = http.post(`${BASE}/auth/login`, JSON.stringify({ identifier, password: __ENV.PASSWORD }), { headers: { "Content-Type": "application/json" } });
    return res.status === 200 ? res.json("data.access_token") : null;
  }).filter(Boolean);
  if (!tokens.length) throw new Error("Không đăng nhập được tài khoản buyer nào");

  const list = http.get(`${BASE}/voucher-products?page=1&limit=50`);
  const products = (list.json("data.items") || []).map((v) => v.id);
  if (!products.length) throw new Error("Không có voucher nào để mua");
  return { tokens, products };
}

export default function ({ tokens, products }) {
  const token = tokens[(__VU - 1) % tokens.length];

  check(http.get(`${BASE}/cart`, { ...json(token), tags: { name: "cart" } }), { "cart 200": (r) => r.status === 200 });
  sleep(Math.random() + 0.5);

  const productId = products[Math.floor(Math.random() * products.length)];
  const add = http.post(`${BASE}/cart/items`, JSON.stringify({ voucher_product_id: productId, quantity: 1 }), { ...json(token), tags: { name: "add-to-cart" } });
  check(add, { "add-to-cart 2xx": (r) => r.status >= 200 && r.status < 300 });
  if (add.status >= 300) return;
  sleep(Math.random() + 0.5);

  const itemId = add.json("data.id");
  const body = { payment_method: "vnpay", ...(itemId ? { cart_item_ids: [itemId] } : {}) };
  const checkout = http.post(`${BASE}/cart/checkout`, JSON.stringify(body), { ...json(token), tags: { name: "checkout" } });
  check(checkout, { "checkout 2xx": (r) => r.status >= 200 && r.status < 300 });
  sleep(Math.random() * 2 + 1);
}
