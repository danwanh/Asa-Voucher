import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../config/env.js";
import { resetVoucherChatCache } from "../../services/voucher-chat.service.js";
import { API, api, ids, prisma } from "./helpers.js";

// Real database (seeded), real query logic; only the AI provider is stubbed.
const URL_PATH = `${API}/ai/voucher-chat`;

const fetchMock = vi.fn();

function aiFilters(overrides: Record<string, unknown> = {}) {
  const content = {
    reply: "Đây là các voucher phù hợp:",
    search: true,
    category_ids: [],
    keywords: [],
    area: null,
    max_price: null,
    min_discount: null,
    sort: "relevance",
    ...overrides
  };
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] })));
}

const ask = (content: string) => api().post(URL_PATH).send({ messages: [{ role: "user", content }] });

describe("POST /ai/voucher-chat", () => {
  const original = { key: env.AI_API_KEY, fallbacks: env.AI_FALLBACK_MODELS };

  beforeEach(() => {
    env.AI_API_KEY = "test-ai-key";
    env.AI_FALLBACK_MODELS = "";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    resetVoucherChatCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    env.AI_API_KEY = original.key;
    env.AI_FALLBACK_MODELS = original.fallbacks;
  });

  it("lets a guest search and only returns public vouchers of the requested category and area", async () => {
    aiFilters({ category_ids: [ids.categories.caPhe], area: "TP.HCM" });

    const res = await ask("cà phê ở TP.HCM");

    expect(res.status).toBe(200);
    expect(res.body.data.reply).toBe("Đây là các voucher phù hợp:");
    const found = res.body.data.vouchers as Array<{ id: string; name: string }>;
    expect(found.length).toBeGreaterThan(0);
    expect(found.map((voucher) => voucher.name)).toContain("Mua 1 tặng 1 Highlands Coffee size vừa");

    const rows = await prisma.voucherProduct.findMany({ where: { id: { in: found.map((voucher) => voucher.id) } } });
    for (const row of rows) {
      expect(row.category_id).toBe(ids.categories.caPhe);
      expect(row).toMatchObject({ approval_status: "approved", status: "active" });
      expect(row.remaining_quantity).toBeGreaterThan(0);
    }
  });

  it("includes child categories when the AI picks a parent category", async () => {
    aiFilters({ category_ids: [ids.categories.anUong] });

    const res = await ask("đồ ăn uống");

    const categoryIds = new Set(
      (await prisma.voucherProduct.findMany({
        where: { id: { in: res.body.data.vouchers.map((voucher: { id: string }) => voucher.id) } },
        select: { category_id: true }
      })).map((row) => row.category_id)
    );
    expect(categoryIds.has(ids.categories.caPhe) || categoryIds.has(ids.categories.traSua)).toBe(true);
  });

  it("respects the maximum price", async () => {
    aiFilters({ max_price: 50000 });

    const res = await ask("voucher dưới 50k");

    expect(res.status).toBe(200);
    for (const voucher of res.body.data.vouchers as Array<{ selling_price: number }>) {
      expect(voucher.selling_price).toBeLessThanOrEqual(50000);
    }
  });

  it("returns a helpful message when nothing matches", async () => {
    aiFilters({ keywords: ["xyz-khong-ton-tai"] });

    const res = await ask("xyz-khong-ton-tai");

    expect(res.status).toBe(200);
    expect(res.body.data.vouchers).toEqual([]);
    expect(res.body.data.reply).toContain("Hiện chưa có voucher nào phù hợp");
  });

  it("rejects a conversation that does not end with a user message", async () => {
    const res = await api()
      .post(URL_PATH)
      .send({ messages: [{ role: "user", content: "cà phê" }, { role: "assistant", content: "Đây là kết quả" }] });

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when AI is not configured", async () => {
    env.AI_API_KEY = undefined;

    const res = await ask("cà phê");

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("AI_NOT_CONFIGURED");
  });
});
