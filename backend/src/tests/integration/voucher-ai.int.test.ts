import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../config/env.js";
import { API, accounts, api, bearer, tokenFor } from "./helpers.js";

// The real AI provider is never called: global fetch is stubbed per test.
// supertest talks to the app over node:http, so stubbing fetch does not affect it.
const URL_PATH = `${API}/voucher-products/ai/generate-copy`;

const aiCopy = {
  description: "Buffet lẩu nướng cho 2 người với giá ưu đãi.",
  terms: ["Áp dụng cho 2 người", "Không áp dụng ngày lễ"],
  usage_instructions: ["Xuất trình mã QR cho nhân viên"]
};

function chatReply(content: unknown, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status });
}

describe("POST /voucher-products/ai/generate-copy", () => {
  const fetchMock = vi.fn();
  const originalKey = env.AI_API_KEY;
  const originalFallbacks = env.AI_FALLBACK_MODELS;
  let staff: string;
  let owner: string;
  let buyer: string;

  beforeAll(async () => {
    [staff, owner, buyer] = await Promise.all([
      tokenFor(accounts.highlandsVoucherStaff),
      tokenFor(accounts.highlandsOwner),
      tokenFor(accounts.buyer)
    ]);
  });

  beforeEach(() => {
    env.AI_API_KEY = "test-ai-key";
    env.AI_FALLBACK_MODELS = "backup-model";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    env.AI_API_KEY = originalKey;
    env.AI_FALLBACK_MODELS = originalFallbacks;
  });

  it("requires authentication", async () => {
    const res = await api().post(URL_PATH).send({ name: "Buffet" });

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is only available to partner roles", async () => {
    const res = await api().post(URL_PATH).set(bearer(buyer)).send({ name: "Buffet" });

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty voucher name", async () => {
    const res = await api().post(URL_PATH).set(bearer(staff)).send({ name: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns generated copy and sends the voucher facts to the AI", async () => {
    fetchMock.mockResolvedValue(chatReply(aiCopy));

    const res = await api()
      .post(URL_PATH)
      .set(bearer(staff))
      .send({ name: "Buffet lẩu nướng 2 người", category_name: "Ẩm thực", original_price: 500000, selling_price: 400000 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: aiCopy });

    const [, init] = fetchMock.mock.calls[0];
    const userPrompt = JSON.parse(init.body).messages[1].content as string;
    expect(userPrompt).toContain("Buffet lẩu nướng 2 người");
    expect(userPrompt).toContain("Ẩm thực");
    expect(userPrompt).toContain("Giảm: 20%");
  });

  it("falls back to the backup model when the main model is overloaded", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(chatReply(aiCopy));

    const res = await api().post(URL_PATH).set(bearer(staff)).send({ name: "Buffet" });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe("backup-model");
  });

  it("returns 502 AI_UNAVAILABLE when every model is overloaded", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 503 }));

    const res = await api().post(URL_PATH).set(bearer(staff)).send({ name: "Buffet" });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("AI_UNAVAILABLE");
  });

  it("returns 503 AI_NOT_CONFIGURED when no API key is set", async () => {
    env.AI_API_KEY = undefined;

    const res = await api().post(URL_PATH).set(bearer(staff)).send({ name: "Buffet" });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("AI_NOT_CONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Uses the owner account so the staff requests above do not count toward its limit.
  it("rate-limits each user to 10 requests per 10 minutes", async () => {
    fetchMock.mockImplementation(async () => chatReply(aiCopy));

    for (let i = 0; i < 10; i++) {
      const res = await api().post(URL_PATH).set(bearer(owner)).send({ name: `Buffet ${i}` });
      expect(res.status).toBe(200);
    }
    const limited = await api().post(URL_PATH).set(bearer(owner)).send({ name: "Buffet 11" });

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });
});
