import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockEnv = vi.hoisted(() => ({
  AI_API_KEY: "test-key" as string | undefined,
  AI_BASE_URL: "https://ai.example.com/v1/",
  AI_MODEL: "test-model",
  AI_FALLBACK_MODELS: "" as string | undefined,
  AI_TIMEOUT_MS: 1000
}));

vi.mock("../../config/env.js", () => ({ env: mockEnv }));

import { HttpError } from "../../utils/http-error.js";
import { buildVoucherCopyPrompt, generateVoucherCopy } from "../../services/voucher-ai.service.js";

const fetchMock = vi.fn();

function chatReply(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}

const validCopy = {
  description: "  Buffet lẩu nướng cho 2 người.  ",
  terms: ["Áp dụng cho 2 người", "  ", "Không áp dụng ngày lễ"],
  usage_instructions: ["Xuất trình mã QR cho nhân viên"]
};

describe("Voucher AI Service", () => {
  beforeEach(() => {
    mockEnv.AI_API_KEY = "test-key";
    mockEnv.AI_FALLBACK_MODELS = "";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns trimmed copy from a valid AI reply", async () => {
    fetchMock.mockResolvedValue(chatReply(JSON.stringify(validCopy)));

    const result = await generateVoucherCopy({ name: "Buffet lẩu", selling_price: 399000 });

    expect(result).toEqual({
      description: "Buffet lẩu nướng cho 2 người.",
      terms: ["Áp dụng cho 2 người", "Không áp dụng ngày lễ"],
      usage_instructions: ["Xuất trình mã QR cho nhân viên"]
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://ai.example.com/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body).model).toBe("test-model");
  });

  it("accepts JSON wrapped in markdown fences", async () => {
    fetchMock.mockResolvedValue(chatReply("```json\n" + JSON.stringify(validCopy) + "\n```"));

    const result = await generateVoucherCopy({ name: "Buffet lẩu" });

    expect(result.terms).toHaveLength(2);
  });

  it("falls back to the next model when the main model is overloaded", async () => {
    mockEnv.AI_FALLBACK_MODELS = "backup-model, test-model";
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(chatReply(JSON.stringify(validCopy)));

    const result = await generateVoucherCopy({ name: "Buffet lẩu" });

    expect(result.terms).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe("backup-model");
  });

  it("does not try fallback models when the API key is rejected", async () => {
    mockEnv.AI_FALLBACK_MODELS = "backup-model";
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    await expect(generateVoucherCopy({ name: "X" })).rejects.toMatchObject({ statusCode: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws 503 when no API key is configured", async () => {
    mockEnv.AI_API_KEY = undefined;

    await expect(generateVoucherCopy({ name: "X" })).rejects.toMatchObject({ statusCode: 503, code: "AI_NOT_CONFIGURED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws 429 when the provider rate-limits", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 429 }));

    await expect(generateVoucherCopy({ name: "X" })).rejects.toMatchObject({ statusCode: 429, code: "AI_RATE_LIMITED" });
  });

  it("throws 502 when the reply does not match the schema", async () => {
    fetchMock.mockResolvedValue(chatReply(JSON.stringify({ description: "ok", terms: [] })));

    await expect(generateVoucherCopy({ name: "X" })).rejects.toMatchObject({ statusCode: 502, code: "AI_UNAVAILABLE" });
  });

  it("throws 502 on network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const error = await generateVoucherCopy({ name: "X" }).catch((err) => err);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(502);
  });

  it("builds a prompt with only the provided facts and the discount", () => {
    const prompt = buildVoucherCopyPrompt({ name: "Spa", original_price: 500000, selling_price: 400000 });

    expect(prompt).toContain("Tên voucher: Spa");
    expect(prompt).toContain("Giảm: 20%");
    expect(prompt).not.toContain("Khu vực");
  });
});
