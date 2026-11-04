import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/prisma.js", () => ({
  prisma: {
    category: { findMany: vi.fn() },
    partnerBranch: { findMany: vi.fn() },
    voucherProduct: { findMany: vi.fn() },
    review: { groupBy: vi.fn() }
  }
}));

import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { chatAboutVouchers, resetVoucherChatCache } from "../../services/voucher-chat.service.js";

const FOOD = "c0000000-0000-0000-0000-000000000001";
const COFFEE = "c0000000-0000-0000-0000-000000000002";
const SPA = "c0000000-0000-0000-0000-000000000003";

const categories = [
  { id: FOOD, name: "Ăn uống", parent_id: null },
  { id: COFFEE, name: "Cà phê", parent_id: FOOD },
  { id: SPA, name: "Spa", parent_id: null }
];

const highlands = {
  id: "v1",
  name: "Mua 1 tặng 1 Highlands Coffee",
  category_id: COFFEE,
  selling_price: 69000,
  original_price: 138000,
  discount_rate: 50,
  applicable_area: "TP. Hồ Chí Minh",
  thumbnail_url: null,
  created_at: new Date(),
  partners: { business_name: "Highlands Coffee" },
  voucher_product_images: [{ image_url: "https://img/1.jpg" }]
};

const fetchMock = vi.fn();

function aiReplies(...contents: unknown[]) {
  for (const content of contents) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 })
    );
  }
}

function filters(overrides: Record<string, unknown> = {}) {
  return {
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
}

/** The `AND` conditions of the n-th voucher query. */
function whereOfCall(n: number) {
  return vi.mocked(prisma.voucherProduct.findMany).mock.calls[n][0]!.where!.AND as Array<Record<string, unknown>>;
}

const originalEnv = { ...env };

describe("Voucher chat service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    resetVoucherChatCache();
    Object.assign(env, { AI_API_KEY: "test-key", AI_FALLBACK_MODELS: "", AI_MODEL: "main-model", AI_CHAT_MODEL: "chat-model" });
    vi.mocked(prisma.category.findMany).mockResolvedValue(categories as never);
    vi.mocked(prisma.partnerBranch.findMany).mockResolvedValue([{ city: "TP HCM" }, { city: "Hà Nội" }] as never);
    vi.mocked(prisma.voucherProduct.findMany).mockResolvedValue([highlands] as never);
    vi.mocked(prisma.review.groupBy).mockResolvedValue([
      { voucher_product_id: "v1", _avg: { rating: 4.56 }, _count: { _all: 3 } }
    ] as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.assign(env, originalEnv);
  });

  it("answers small talk without querying vouchers", async () => {
    aiReplies(filters({ search: false, reply: "Chào bạn! Bạn muốn tìm voucher gì?" }));

    const result = await chatAboutVouchers([{ role: "user", content: "xin chào" }]);

    expect(result).toEqual({ reply: "Chào bạn! Bạn muốn tìm voucher gì?", vouchers: [], filters: null });
    expect(prisma.voucherProduct.findMany).not.toHaveBeenCalled();
  });

  it("uses the fast chat model first and sends categories, areas and the conversation", async () => {
    aiReplies(filters());

    await chatAboutVouchers([
      { role: "user", content: "cà phê" },
      { role: "assistant", content: "Đây là voucher cà phê:" },
      { role: "user", content: "ở Hà Nội thì sao" }
    ]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("chat-model");
    expect(body.messages[0].content).toContain(`${COFFEE}: Cà phê`);
    expect(body.messages[0].content).toContain("TP. Hồ Chí Minh, Hà Nội");
    expect(body.messages[1].content).toBe("Người dùng: cà phê\nTrợ lý: Đây là voucher cà phê:\nNgười dùng: ở Hà Nội thì sao");
  });

  it("turns AI filters into a public voucher query and maps the results", async () => {
    aiReplies(filters({ category_ids: [FOOD, "not-a-real-id"], area: "TP.HCM", max_price: 100000, min_discount: 30 }));

    const result = await chatAboutVouchers([{ role: "user", content: "đồ ăn ở TP.HCM dưới 100k giảm từ 30%" }]);

    const where = whereOfCall(0);
    expect(where[0]).toMatchObject({ approval_status: "approved", status: "active", remaining_quantity: { gt: 0 } });
    // Parent category expands to its children; unknown ids are dropped
    expect(where).toContainEqual({ category_id: { in: [FOOD, COFFEE] } });
    expect(where).toContainEqual({ selling_price: { lte: 100000 } });
    expect(where).toContainEqual({ discount_rate: { gte: 30 } });
    expect(JSON.stringify(where)).toContain("TP. Hồ Chí Minh");

    expect(result.reply).toBe("Đây là các voucher phù hợp:");
    expect(result.vouchers).toEqual([
      {
        id: "v1",
        name: "Mua 1 tặng 1 Highlands Coffee",
        category_id: COFFEE,
        partner_name: "Highlands Coffee",
        selling_price: 69000,
        original_price: 138000,
        discount_rate: 50,
        applicable_area: "TP. Hồ Chí Minh",
        image_url: "https://img/1.jpg",
        average_rating: 4.6,
        review_count: 3
      }
    ]);
  });

  it("falls back to the category when keywords match nothing", async () => {
    aiReplies(filters({ category_ids: [COFFEE], keywords: ["cà phê sữa đá"] }));
    vi.mocked(prisma.voucherProduct.findMany).mockResolvedValueOnce([]).mockResolvedValueOnce([highlands] as never);

    const result = await chatAboutVouchers([{ role: "user", content: "cà phê sữa đá" }]);

    expect(prisma.voucherProduct.findMany).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(whereOfCall(0))).toContain("cà phê sữa đá");
    expect(JSON.stringify(whereOfCall(1))).not.toContain("cà phê sữa đá");
    expect(result.reply).toContain("không tìm thấy voucher khớp chính xác");
    expect(result.vouchers).toHaveLength(1);
  });

  it("explains when nothing matches instead of using the AI's optimistic reply", async () => {
    aiReplies(filters({ category_ids: [SPA], area: "Hà Nội", reply: "Đây là các voucher spa tuyệt vời!" }));
    vi.mocked(prisma.voucherProduct.findMany).mockResolvedValue([]);

    const result = await chatAboutVouchers([{ role: "user", content: "spa ở Hà Nội" }]);

    expect(result.vouchers).toEqual([]);
    expect(result.reply).toContain("Hiện chưa có voucher nào phù hợp với spa ở Hà Nội");
  });

  it("drops invalid AI values instead of failing", async () => {
    aiReplies(filters({ sort: "cheapest-please", max_price: -5, keywords: ["a", "pizza"], category_ids: "oops" }));

    const result = await chatAboutVouchers([{ role: "user", content: "pizza" }]);

    expect(result.filters).toMatchObject({ sort: "relevance", max_price: null, keywords: ["pizza"], category_ids: [] });
  });

  it("sorts by rating when asked for the best rated", async () => {
    const lowRated = { ...highlands, id: "v2", name: "Voucher B" };
    vi.mocked(prisma.voucherProduct.findMany).mockResolvedValue([lowRated, highlands] as never);
    aiReplies(filters({ sort: "rating" }));

    const result = await chatAboutVouchers([{ role: "user", content: "voucher được đánh giá cao" }]);

    expect(result.vouchers.map((voucher) => voucher.id)).toEqual(["v1", "v2"]);
  });
});
