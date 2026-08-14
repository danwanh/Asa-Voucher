import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";
import type { AuthUser } from "../../types/auth.types.js";

vi.mock("../../repositories/review.repository.js", () => ({
  listReviews: vi.fn(),
  getReviewStats: vi.fn(),
  findReviewById: vi.fn(),
  findReviewByUserAndIssuedVoucherId: vi.fn(),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  setReviewPublished: vi.fn(),
}));

vi.mock("../../repositories/review-response.repository.js", () => ({
  listResponsesByReview: vi.fn(),
  createReviewResponse: vi.fn(),
}));

vi.mock("../../repositories/issued-voucher.repository.js", () => ({
  findIssuedVoucherById: vi.fn(),
}));

import * as reviewRepo from "../../repositories/review.repository.js";
import * as reviewResponseRepo from "../../repositories/review-response.repository.js";
import * as issuedVoucherRepo from "../../repositories/issued-voucher.repository.js";
import * as reviewService from "../../services/review.service.js";

const BUYER: AuthUser = { id: "u-buyer", email: "b@test.com", role: "buyer" };
const OTHER_BUYER: AuthUser = { id: "u-other", email: "o@test.com", role: "buyer" };
const PARTNER_OWNER: AuthUser = { id: "u-partner", email: "p@test.com", role: "partner_owner", partnerId: "partner-1" };
const ADMIN_CONTENT: AuthUser = { id: "u-admin", email: "a@test.com", role: "admin_content" };

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: "rev-1",
    voucher_product_id: "vp-1",
    user_id: "u-buyer",
    issued_voucher_id: "iv-1",
    rating: 5,
    comment: "Great!",
    media_urls: null,
    is_published: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    voucher_products: { id: "vp-1", name: "Voucher A", partner_id: "partner-1" },
    ...overrides,
  };
}

describe("Review Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reviewRepo.getReviewStats).mockResolvedValue({ _avg: { rating: 5 }, _count: { _all: 1 } } as any);
  });

  describe("listPublicReviews", () => {
    it("returns published reviews", async () => {
      vi.mocked(reviewRepo.listReviews).mockResolvedValue({ rows: [makeReview()], total: 1 });

      const result = await reviewService.listPublicReviews("vp-1", { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(reviewRepo.listReviews).toHaveBeenCalledWith(
        expect.objectContaining({ voucherProductId: "vp-1", onlyPublished: true })
      );
    });
  });

  describe("getReviewById", () => {
    it("returns published review without auth", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview());
      const result = await reviewService.getReviewById(undefined, "rev-1");
      expect(result.id).toBe("rev-1");
    });

    it("throws 404 for unpublished review if not owner/admin", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview({ is_published: false }));
      await expect(reviewService.getReviewById(OTHER_BUYER, "rev-1")).rejects.toThrow(HttpError);
    });

    it("returns unpublished review to owner", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview({ is_published: false }));
      const result = await reviewService.getReviewById(BUYER, "rev-1");
      expect(result.id).toBe("rev-1");
    });
  });

  describe("createReview", () => {
    it("creates review for used voucher", async () => {
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue({
        id: "iv-1", owner_id: "u-buyer", status: "used",
        voucher_code: "VC-001", qr_code_payload: "qr-1", qr_code_image_url: null,
        order_item_id: "oi-1", voucher_product_id: "vp-1", issued_date: "2026-01-01",
        expired_date: "2026-12-31", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
      } as any);
      vi.mocked(reviewRepo.findReviewByUserAndIssuedVoucherId).mockResolvedValue(null);
      vi.mocked(reviewRepo.createReview).mockResolvedValue(makeReview());

      const result = await reviewService.createReview(BUYER, { issued_voucher_id: "iv-1", rating: 5 });
      expect(result.rating).toBe(5);
    });

    it("rejects review if voucher not used", async () => {
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue({
        id: "iv-1", owner_id: "u-buyer", status: "active",
        voucher_code: "VC-001", qr_code_payload: "qr-1", qr_code_image_url: null,
        order_item_id: "oi-1", voucher_product_id: "vp-1", issued_date: "2026-01-01",
        expired_date: "2026-12-31", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
      } as any);

      await expect(
        reviewService.createReview(BUYER, { issued_voucher_id: "iv-1", rating: 5 })
      ).rejects.toThrow(HttpError);
    });

    it("rejects duplicate review for same voucher", async () => {
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue({
        id: "iv-1", owner_id: "u-buyer", status: "used",
        voucher_code: "VC-001", qr_code_payload: "qr-1", qr_code_image_url: null,
        order_item_id: "oi-1", voucher_product_id: "vp-1", issued_date: "2026-01-01",
        expired_date: "2026-12-31", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
      } as any);
      vi.mocked(reviewRepo.findReviewByUserAndIssuedVoucherId).mockResolvedValue({ id: "existing-review" });

      await expect(
        reviewService.createReview(BUYER, { issued_voucher_id: "iv-1", rating: 5 })
      ).rejects.toThrow(HttpError);
      expect(reviewRepo.findReviewByUserAndIssuedVoucherId).toHaveBeenCalledWith("u-buyer", "iv-1");
    });

    it("rejects if voucher belongs to another user", async () => {
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue({
        id: "iv-1", owner_id: "u-other", status: "used",
        voucher_code: "VC-001", qr_code_payload: "qr-1", qr_code_image_url: null,
        order_item_id: "oi-1", voucher_product_id: "vp-1", issued_date: "2026-01-01",
        expired_date: "2026-12-31", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
      } as any);

      await expect(
        reviewService.createReview(BUYER, { issued_voucher_id: "iv-1", rating: 5 })
      ).rejects.toThrow(HttpError);
    });

    it("rejects non-buyer creating review", async () => {
      await expect(
        reviewService.createReview(PARTNER_OWNER, { issued_voucher_id: "iv-1", rating: 5 })
      ).rejects.toThrow(HttpError);
    });

    it("allows the order creator to review a voucher issued to a gift recipient", async () => {
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue({
        id: "iv-1", owner_id: "u-other", status: "active", voucher_product_id: "vp-1",
        order_items: { orders: { user_id: "u-buyer", status: "confirmed" } },
      } as any);
      vi.mocked(reviewRepo.findReviewByUserAndIssuedVoucherId).mockResolvedValue(null);
      vi.mocked(reviewRepo.createReview).mockResolvedValue(makeReview());

      await reviewService.createReview(BUYER, { issued_voucher_id: "iv-1", rating: 5 });

      expect(reviewRepo.createReview).toHaveBeenCalledWith("u-buyer", "vp-1", expect.any(Object));
    });

    it("allows the gift recipient to create a separate review", async () => {
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue({
        id: "iv-1", owner_id: "u-other", status: "active", voucher_product_id: "vp-1",
        order_items: { orders: { user_id: "u-buyer", status: "confirmed" } },
      } as any);
      vi.mocked(reviewRepo.findReviewByUserAndIssuedVoucherId).mockResolvedValue(null);
      vi.mocked(reviewRepo.createReview).mockResolvedValue(makeReview({ user_id: "u-other" }));

      await reviewService.createReview(OTHER_BUYER, { issued_voucher_id: "iv-1", rating: 4 });

      expect(reviewRepo.findReviewByUserAndIssuedVoucherId).toHaveBeenCalledWith("u-other", "iv-1");
    });
  });

  describe("updateReview", () => {
    it("owner cannot update their review", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview());

      await expect(
        reviewService.updateReview(BUYER, "rev-1", { comment: "Updated" })
      ).rejects.toThrow(HttpError);
    });

    it("admin_content can update any review", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview());
      vi.mocked(reviewRepo.updateReview).mockResolvedValue(makeReview());

      await reviewService.updateReview(ADMIN_CONTENT, "rev-1", { is_published: false });
      expect(reviewRepo.updateReview).toHaveBeenCalled();
    });

    it("buyer cannot change is_published", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview());

      await expect(
        reviewService.updateReview(BUYER, "rev-1", { is_published: false })
      ).rejects.toThrow(HttpError);
    });

    it("rejects update from non-owner non-admin", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview());

      await expect(
        reviewService.updateReview(OTHER_BUYER, "rev-1", { comment: "Hacked" })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("hideReview", () => {
    it("owner can hide their review", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview());
      vi.mocked(reviewRepo.setReviewPublished).mockResolvedValue(makeReview({ is_published: false }));

      await reviewService.hideReview(BUYER, "rev-1");
      expect(reviewRepo.setReviewPublished).toHaveBeenCalledWith("rev-1", false);
    });

    it("rejects hiding from non-owner non-admin", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview());
      await expect(reviewService.hideReview(OTHER_BUYER, "rev-1")).rejects.toThrow(HttpError);
    });
  });

  describe("createReviewResponse", () => {
    it("partner owner can respond to review of their voucher", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview());
      vi.mocked(reviewResponseRepo.createReviewResponse).mockResolvedValue({
        id: "rr-1", review_id: "rev-1", responded_by: "u-partner",
        content: "Thanks!", created_at: "2026-01-01T00:00:00Z",
      });

      const result = await reviewService.createReviewResponse(PARTNER_OWNER, "rev-1", { content: "Thanks!" });
      expect(result.content).toBe("Thanks!");
    });

    it("admin_content can respond", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview());
      vi.mocked(reviewResponseRepo.createReviewResponse).mockResolvedValue({
        id: "rr-2", review_id: "rev-1", responded_by: "u-admin",
        content: "Noted", created_at: "2026-01-01T00:00:00Z",
      });

      await reviewService.createReviewResponse(ADMIN_CONTENT, "rev-1", { content: "Noted" });
      expect(reviewResponseRepo.createReviewResponse).toHaveBeenCalled();
    });

    it("rejects response from unauthorized user", async () => {
      vi.mocked(reviewRepo.findReviewById).mockResolvedValue(makeReview());
      await expect(
        reviewService.createReviewResponse(BUYER, "rev-1", { content: "Nice" })
      ).rejects.toThrow(HttpError);
    });
  });
});
