import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";
import type { AuthUser } from "../../types/auth.types.js";

vi.mock("../../repositories/complaint.repository.js", () => ({
  listComplaints: vi.fn(),
  findComplaintById: vi.fn(),
  createComplaint: vi.fn(),
  findComplaintByIssuedVoucherId: vi.fn(),
  findOrderLevelComplaint: vi.fn(),
  findOrderOwner: vi.fn(),
  updateComplaint: vi.fn(),
}));

vi.mock("../../repositories/complaint-response.repository.js", () => ({
  listResponsesByComplaint: vi.fn(),
  createComplaintResponse: vi.fn(),
}));

vi.mock("../../repositories/issued-voucher.repository.js", () => ({
  findIssuedVoucherById: vi.fn(),
}));

import * as complaintRepo from "../../repositories/complaint.repository.js";
import * as complaintResponseRepo from "../../repositories/complaint-response.repository.js";
import * as issuedVoucherRepo from "../../repositories/issued-voucher.repository.js";
import * as complaintService from "../../services/complaint.service.js";

const BUYER: AuthUser = { id: "u-buyer", email: "b@test.com", role: "buyer" };
const OTHER_BUYER: AuthUser = { id: "u-other", email: "o@test.com", role: "buyer" };
const PARTNER_OWNER: AuthUser = { id: "u-partner", email: "p@test.com", role: "partner_owner", partnerId: "partner-1" };
const ADMIN: AuthUser = { id: "u-admin", email: "a@test.com", role: "admin_operations" };

function makeComplaint(overrides: Record<string, unknown> = {}) {
  return {
    id: "comp-1",
    order_id: "order-1",
    issued_voucher_id: null,
    user_id: "u-buyer",
    reason: "not_as_described" as const,
    description: "Item not matching",
    evidence_urls: null,
    status: "open" as const,
    assigned_to: null,
    resolution_note: null,
    resolution_types: null,
    created_at: "2026-01-01T00:00:00Z",
    resolved_at: null,
    issued_vouchers: { voucher_product_id: "vp-1", voucher_products: { partner_id: "partner-1" } },
    orders: { id: "order-1", user_id: "u-buyer" },
    ...overrides,
  };
}

describe("Complaint Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(complaintRepo.findComplaintByIssuedVoucherId).mockResolvedValue(null);
    vi.mocked(complaintRepo.findOrderLevelComplaint).mockResolvedValue(null);
  });

  describe("listComplaints", () => {
    it("returns buyer-scoped complaints for buyer", async () => {
      vi.mocked(complaintRepo.listComplaints).mockResolvedValue({ rows: [makeComplaint()], total: 1 });

      const result = await complaintService.listComplaints(BUYER, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(complaintRepo.listComplaints).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u-buyer" })
      );
    });

    it("returns partner-scoped complaints for partner", async () => {
      vi.mocked(complaintRepo.listComplaints).mockResolvedValue({ rows: [], total: 0 });

      await complaintService.listComplaints(PARTNER_OWNER, { page: 1, limit: 20 });
      expect(complaintRepo.listComplaints).toHaveBeenCalledWith(
        expect.objectContaining({ partnerId: "partner-1" })
      );
    });
  });

  describe("createComplaint", () => {
    it("creates complaint for buyer's order", async () => {
      vi.mocked(complaintRepo.findOrderOwner).mockResolvedValue({ id: "order-1", user_id: "u-buyer", recipient_id: "u-buyer", status: "confirmed" });
      vi.mocked(complaintRepo.createComplaint).mockResolvedValue(makeComplaint());

      const result = await complaintService.createComplaint(BUYER, {
        order_id: "order-1",
        reason: "not_as_described",
        description: "Wrong item",
      });
      expect(result.status).toBe("open");
    });

    it("rejects complaint for another buyer's order", async () => {
      vi.mocked(complaintRepo.findOrderOwner).mockResolvedValue({ id: "order-1", user_id: "u-other", recipient_id: "u-other", status: "confirmed" });

      await expect(
        complaintService.createComplaint(BUYER, {
          order_id: "order-1",
          reason: "not_as_described",
          description: "Wrong item",
        })
      ).rejects.toThrow(HttpError);
    });

    it("rejects an order-level complaint from the gift recipient", async () => {
      vi.mocked(complaintRepo.findOrderOwner).mockResolvedValue({
        id: "order-1", user_id: "u-other", recipient_id: "u-buyer", status: "confirmed",
      });

      await expect(complaintService.createComplaint(BUYER, {
        order_id: "order-1",
        reason: "not_as_described",
        description: "Wrong item",
      })).rejects.toThrow(HttpError);
    });

    it("rejects an order-level complaint before payment", async () => {
      vi.mocked(complaintRepo.findOrderOwner).mockResolvedValue({
        id: "order-1", user_id: "u-buyer", recipient_id: "u-buyer", status: "pending_payment",
      });

      await expect(complaintService.createComplaint(BUYER, {
        order_id: "order-1",
        reason: "not_as_described",
        description: "Wrong item",
      })).rejects.toThrow(HttpError);
    });

    it("rejects non-buyer creating complaint", async () => {
      await expect(
        complaintService.createComplaint(PARTNER_OWNER, {
          order_id: "order-1",
          reason: "not_as_described",
          description: "Wrong item",
        })
      ).rejects.toThrow(HttpError);
    });

    it("validates issued_voucher ownership", async () => {
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue({
        id: "iv-1", owner_id: "u-other",
        voucher_code: "VC-001", qr_code_payload: "qr-1", qr_code_image_url: null,
        order_item_id: "oi-1", voucher_product_id: "vp-1", issued_date: "2026-01-01",
        expired_date: "2026-12-31", status: "active", created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      } as any);

      await expect(
        complaintService.createComplaint(BUYER, {
          issued_voucher_id: "iv-1",
          reason: "cannot_redeem",
          description: "Cannot redeem",
        })
      ).rejects.toThrow(HttpError);
    });

    it("allows the issued voucher owner to complain about a gift voucher", async () => {
      vi.mocked(complaintRepo.findOrderOwner).mockResolvedValue({
        id: "order-1", user_id: "u-other", recipient_id: "u-buyer", status: "confirmed",
      });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue({
        id: "iv-1", owner_id: "u-buyer", status: "active", voucher_product_id: "vp-1",
        order_items: { order_id: "order-1", orders: { user_id: "u-other", status: "confirmed" } },
      } as any);
      vi.mocked(complaintRepo.createComplaint).mockResolvedValue(makeComplaint({ issued_voucher_id: "iv-1" }));

      await complaintService.createComplaint(BUYER, {
        order_id: "order-1",
        issued_voucher_id: "iv-1",
        reason: "cannot_redeem",
        description: "Cannot redeem",
      });

      expect(complaintRepo.createComplaint).toHaveBeenCalledWith("u-buyer", expect.objectContaining({ issued_voucher_id: "iv-1" }));
    });
  });

  describe("getComplaintById", () => {
    it("returns complaint to owner", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      const result = await complaintService.getComplaintById(BUYER, "comp-1");
      expect(result.id).toBe("comp-1");
    });

    it("returns complaint to admin", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      await complaintService.getComplaintById(ADMIN, "comp-1");
      expect(complaintRepo.findComplaintById).toHaveBeenCalled();
    });

    it("returns complaint to related partner", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      await complaintService.getComplaintById(PARTNER_OWNER, "comp-1");
      expect(complaintRepo.findComplaintById).toHaveBeenCalled();
    });

    it("rejects unauthorized user", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      await expect(complaintService.getComplaintById(OTHER_BUYER, "comp-1")).rejects.toThrow(HttpError);
    });
  });

  describe("updateComplaint", () => {
    it("owner cannot update an existing complaint", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());

      await expect(
        complaintService.updateComplaint(BUYER, "comp-1", { description: "Updated" })
      ).rejects.toThrow(HttpError);
    });

    it("owner cannot update non-open complaint", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint({ status: "under_review" }));

      await expect(
        complaintService.updateComplaint(BUYER, "comp-1", { description: "Update" })
      ).rejects.toThrow(HttpError);
    });

    it("owner cannot change status", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());

      await expect(
        complaintService.updateComplaint(BUYER, "comp-1", { status: "resolved" })
      ).rejects.toThrow(HttpError);
    });

    it("admin can update any complaint", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint({ status: "under_review" }));
      vi.mocked(complaintRepo.updateComplaint).mockResolvedValue(makeComplaint());

      await complaintService.updateComplaint(ADMIN, "comp-1", { description: "Admin update" });
      expect(complaintRepo.updateComplaint).toHaveBeenCalled();
    });
  });

  describe("closeComplaint", () => {
    it("owner can close open complaint", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      vi.mocked(complaintRepo.updateComplaint).mockResolvedValue(makeComplaint({ status: "closed" }));

      const result = await complaintService.closeComplaint(BUYER, "comp-1");
      expect(result.status).toBe("closed");
    });

    it("owner cannot close non-open complaint", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint({ status: "resolved" }));
      await expect(complaintService.closeComplaint(BUYER, "comp-1")).rejects.toThrow(HttpError);
    });

    it("admin can close any complaint", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint({ status: "resolved" }));
      vi.mocked(complaintRepo.updateComplaint).mockResolvedValue(makeComplaint({ status: "closed" }));
      await complaintService.closeComplaint(ADMIN, "comp-1");
      expect(complaintRepo.updateComplaint).toHaveBeenCalled();
    });
  });

  describe("assignComplaint", () => {
    it("admin can assign complaint", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      vi.mocked(complaintRepo.updateComplaint).mockResolvedValue(makeComplaint({ assigned_to: "u-admin", status: "under_review" }));

      const result = await complaintService.assignComplaint(ADMIN, "comp-1", { assigned_to: "u-admin" });
      expect(result.assigned_to).toBe("u-admin");
    });

    it("non-admin cannot assign", async () => {
      await expect(
        complaintService.assignComplaint(BUYER, "comp-1", { assigned_to: "u-admin" })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("resolveComplaint", () => {
    it("admin can resolve open complaint", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      vi.mocked(complaintRepo.updateComplaint).mockResolvedValue(makeComplaint({
        status: "resolved", resolution_note: "Reviewed", resolution_types: ["no_action"],
      }));

      const result = await complaintService.resolveComplaint(ADMIN, "comp-1", {
        resolution_note: "Reviewed",
        resolution_types: ["no_action"],
      });
      expect(result.status).toBe("resolved");
      expect(result.resolution_note).toBe("Reviewed");
    });

    it("rejects resolving already resolved complaint", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint({ status: "resolved" }));
      await expect(
        complaintService.resolveComplaint(ADMIN, "comp-1", {
          resolution_note: "Already done",
          resolution_types: ["refund"],
        })
      ).rejects.toThrow(HttpError);
    });

    it("non-admin cannot resolve", async () => {
      await expect(
        complaintService.resolveComplaint(BUYER, "comp-1", {
          resolution_note: "Note",
          resolution_types: ["refund"],
        })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("createComplaintResponse", () => {
    it("owner can add response", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      vi.mocked(complaintResponseRepo.createComplaintResponse).mockResolvedValue({
        id: "cr-1", complaint_id: "comp-1", responded_by: "u-buyer",
        responder_role: "user", content: "Info", created_at: "2026-01-01T00:00:00Z",
      });

      const result = await complaintService.createComplaintResponse(BUYER, "comp-1", { content: "Info" });
      expect(result.content).toBe("Info");
      expect(complaintResponseRepo.createComplaintResponse).toHaveBeenCalledWith(
        "comp-1", "u-buyer", "user", "Info"
      );
    });

    it("partner can add response", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      vi.mocked(complaintResponseRepo.createComplaintResponse).mockResolvedValue({
        id: "cr-2", complaint_id: "comp-1", responded_by: "u-partner",
        responder_role: "partner", content: "Reviewing", created_at: "2026-01-01T00:00:00Z",
      });

      await complaintService.createComplaintResponse(PARTNER_OWNER, "comp-1", { content: "Reviewing" });
      expect(complaintResponseRepo.createComplaintResponse).toHaveBeenCalledWith(
        "comp-1", "u-partner", "partner", "Reviewing"
      );
    });

    it("admin can add response", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      vi.mocked(complaintResponseRepo.createComplaintResponse).mockResolvedValue({
        id: "cr-3", complaint_id: "comp-1", responded_by: "u-admin",
        responder_role: "admin", content: "Processed", created_at: "2026-01-01T00:00:00Z",
      });

      await complaintService.createComplaintResponse(ADMIN, "comp-1", { content: "Processed" });
      expect(complaintResponseRepo.createComplaintResponse).toHaveBeenCalledWith(
        "comp-1", "u-admin", "admin", "Processed"
      );
    });

    it("unauthorized user cannot respond", async () => {
      vi.mocked(complaintRepo.findComplaintById).mockResolvedValue(makeComplaint());
      await expect(
        complaintService.createComplaintResponse(OTHER_BUYER, "comp-1", { content: "Nope" })
      ).rejects.toThrow(HttpError);
    });
  });
});
