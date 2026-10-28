// Run: k6 run -e BASE_URL=http://localhost:5000/api -e VUS=300 load-test/browse.js
import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:5000/api";
const VUS = Number(__ENV.VUS || 100);

export const options = {
  stages: [
    { duration: "30s", target: Math.round(VUS / 3) },
    { duration: "1m", target: VUS },
    { duration: "2m", target: VUS },
    { duration: "30s", target: 0 }
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.01"]
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "max"]
};

const ok = (res) => res.status === 200;

export default function () {
  group("homepage", () => {
    check(http.get(`${BASE}/homepage/summary`, { tags: { name: "homepage" } }), { "homepage 200": ok });
    check(http.get(`${BASE}/categories`, { tags: { name: "categories" } }), { "categories 200": ok });
  });
  sleep(Math.random() * 2 + 1);

  let ids = [];
  group("list", () => {
    const page = Math.floor(Math.random() * 5) + 1;
    const res = http.get(`${BASE}/voucher-products?page=${page}&limit=20`, { tags: { name: "voucher-list" } });
    check(res, { "list 200": ok });
    if (ok(res)) ids = (res.json("data.items") || []).map((v) => v.id);
  });
  sleep(Math.random() * 2 + 1);

  if (ids.length) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    group("detail", () => {
      check(http.get(`${BASE}/voucher-products/${id}/detail`, { tags: { name: "voucher-detail" } }), { "detail 200": ok });
    });
  }
  sleep(Math.random() * 3 + 2);
}
