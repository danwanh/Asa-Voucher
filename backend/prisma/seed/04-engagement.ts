import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { SeedContext } from "./shared.js";
import { ids, now, daysFrom, money } from "./shared.js";

type ReviewSeed = {
  id: string;
  voucher_product_id: string;
  user_id: string;
  issued_voucher_id: string;
  rating: number;
  comment: string;
  media_urls?: Prisma.InputJsonValue;
  is_published: boolean;
  created_at: Date;
};

type ReviewResponseSeed = {
  id: string;
  review_id: string;
  responded_by: string;
  content: string;
  created_at: Date;
};

type ComplaintSeed = {
  id: string;
  order_id?: string;
  issued_voucher_id?: string;
  user_id: string;
  reason: "not_as_described" | "cannot_redeem" | "expired_early" | "wrong_value" | "other";
  description: string;
  evidence_urls?: Prisma.InputJsonValue;
  status: "open" | "under_review" | "resolved" | "closed";
  assigned_to?: string;
  resolution_note?: string;
  resolution_type?: "refund" | "reissue" | "no_action" | "partner_penalized";
  created_at: Date;
  resolved_at?: Date;
};

type ComplaintResponseSeed = {
  id: string;
  complaint_id: string;
  responded_by: string;
  responder_role: "admin" | "partner" | "user";
  content: string;
  created_at: Date;
};

const reviews: ReviewSeed[] = [
  {
    id: "75000000-0000-0000-0000-000000000001",
    voucher_product_id: ids.vouchers.cgvCouple,
    user_id: ids.users.buyerMinhAnh,
    issued_voucher_id: ids.issuedVouchers.iv01,
    rating: 5,
    comment: "Vé đổi nhanh, bắp nước nhận đúng như mô tả. Trải nghiệm rất tốt.",
    media_urls: ["https://cdn.asa.test/review/cgv-couple-1.jpg"],
    is_published: true,
    created_at: daysFrom(now, -12)
  },
  {
    id: "75000000-0000-0000-0000-000000000002",
    voucher_product_id: ids.vouchers.phucLongSizeL,
    user_id: ids.users.buyerHoangNam,
    issued_voucher_id: ids.issuedVouchers.iv03,
    rating: 4,
    comment: "Đồ uống ngon, nhân viên xác nhận voucher nhanh. Sẽ mua lại.",
    media_urls: ["https://cdn.asa.test/review/phuclong-1.jpg"],
    is_published: true,
    created_at: daysFrom(now, -10)
  }
];

const reviewResponses: ReviewResponseSeed[] = [
  {
    id: "75100000-0000-0000-0000-000000000001",
    review_id: "75000000-0000-0000-0000-000000000001",
    responded_by: ids.users.voucherStaffCGV,
    content: "Cảm ơn anh/chị đã phản hồi. CGV rất vui khi được phục vụ.",
    created_at: daysFrom(now, -11)
  },
  {
    id: "75100000-0000-0000-0000-000000000002",
    review_id: "75000000-0000-0000-0000-000000000002",
    responded_by: ids.users.voucherStaffPhucLong,
    content: "Phúc Long cảm ơn anh/chị. Mong sớm gặp lại ở cửa hàng.",
    created_at: daysFrom(now, -9)
  }
];

const complaints: ComplaintSeed[] = [
  {
    id: "76000000-0000-0000-0000-000000000001",
    order_id: ids.orders.pending01,
    user_id: ids.users.buyerQuocBao,
    reason: "other",
    description: "Tôi chuyển khoản rồi nhưng hệ thống vẫn chưa cập nhật thanh toán.",
    evidence_urls: ["https://cdn.asa.test/complaint/bank-transfer-proof.jpg"],
    status: "open",
    created_at: daysFrom(now, -4)
  },
  {
    id: "76000000-0000-0000-0000-000000000002",
    order_id: ids.orders.failed01,
    user_id: ids.users.buyerNgocLinh,
    reason: "wrong_value",
    description: "Hệ thống trừ tiền ví nhưng đơn lại báo thất bại.",
    status: "under_review",
    assigned_to: ids.users.adminSecurity,
    created_at: daysFrom(now, -7)
  },
  {
    id: "76000000-0000-0000-0000-000000000003",
    order_id: ids.orders.refunded01,
    issued_voucher_id: ids.issuedVouchers.iv06,
    user_id: ids.users.buyerThuTrang,
    reason: "cannot_redeem",
    description: "Resort báo tạm ngưng nhận voucher, đề nghị hoàn tiền.",
    status: "resolved",
    assigned_to: ids.users.adminOperations,
    resolution_note: "Đã xác minh với đối tác và hoàn tiền 100% cho khách hàng.",
    resolution_type: "refund",
    created_at: daysFrom(now, -22),
    resolved_at: daysFrom(now, -20)
  },
  {
    id: "76000000-0000-0000-0000-000000000004",
    order_id: ids.orders.paid02,
    issued_voucher_id: ids.issuedVouchers.iv04,
    user_id: ids.users.buyerHoangNam,
    reason: "expired_early",
    description: "Voucher báo hết hạn sớm hơn thông tin trong ứng dụng.",
    status: "closed",
    assigned_to: ids.users.adminContent,
    resolution_note: "Đối chiếu dữ liệu cho thấy voucher đã hết hạn đúng theo điều khoản.",
    resolution_type: "no_action",
    created_at: daysFrom(now, -5),
    resolved_at: daysFrom(now, -3)
  }
];

const complaintResponses: ComplaintResponseSeed[] = [
  {
    id: "76100000-0000-0000-0000-000000000001",
    complaint_id: "76000000-0000-0000-0000-000000000001",
    responded_by: ids.users.adminOperations,
    responder_role: "admin",
    content: "Chúng tôi đã tiếp nhận và sẽ kiểm tra sao kê trong 24 giờ.",
    created_at: daysFrom(now, -4)
  },
  {
    id: "76100000-0000-0000-0000-000000000002",
    complaint_id: "76000000-0000-0000-0000-000000000002",
    responded_by: ids.users.adminSecurity,
    responder_role: "admin",
    content: "Đội ngũ kỹ thuật đang đối soát giao dịch ví điện tử.",
    created_at: daysFrom(now, -6)
  },
  {
    id: "76100000-0000-0000-0000-000000000003",
    complaint_id: "76000000-0000-0000-0000-000000000003",
    responded_by: ids.users.ownerVinpearl,
    responder_role: "partner",
    content: "Đối tác xác nhận tạm ngưng dịch vụ trong thời gian bảo trì.",
    created_at: daysFrom(now, -21)
  },
  {
    id: "76100000-0000-0000-0000-000000000004",
    complaint_id: "76000000-0000-0000-0000-000000000003",
    responded_by: ids.users.buyerThuTrang,
    responder_role: "user",
    content: "Tôi đồng ý phương án hoàn tiền.",
    created_at: daysFrom(now, -20)
  }
];

export async function seedEngagement({ prisma }: SeedContext) {
  for (const review of reviews) {
    await prisma.review.upsert({
      where: { id: review.id },
      create: {
        ...review,
        updated_at: review.created_at
      },
      update: {
        voucher_product_id: review.voucher_product_id,
        user_id: review.user_id,
        issued_voucher_id: review.issued_voucher_id,
        rating: review.rating,
        comment: review.comment,
        media_urls: review.media_urls ?? Prisma.JsonNull,
        is_published: review.is_published,
        created_at: review.created_at,
        updated_at: daysFrom(review.created_at, 1)
      }
    });
  }

  for (const response of reviewResponses) {
    await prisma.reviewResponse.upsert({
      where: { id: response.id },
      create: response,
      update: response
    });
  }

  for (const complaint of complaints) {
    await prisma.complaint.upsert({
      where: { id: complaint.id },
      create: complaint,
      update: {
        order_id: complaint.order_id ?? null,
        issued_voucher_id: complaint.issued_voucher_id ?? null,
        user_id: complaint.user_id,
        reason: complaint.reason,
        description: complaint.description,
        evidence_urls: complaint.evidence_urls ?? Prisma.JsonNull,
        status: complaint.status,
        assigned_to: complaint.assigned_to ?? null,
        resolution_note: complaint.resolution_note ?? null,
        resolution_type: complaint.resolution_type ?? null,
        created_at: complaint.created_at,
        resolved_at: complaint.resolved_at ?? null
      }
    });
  }

  for (const response of complaintResponses) {
    await prisma.complaintResponse.upsert({
      where: { id: response.id },
      create: response,
      update: response
    });
  }

  const authLogs = [
    {
      id: "77000000-0000-0000-0000-000000000001",
      user_id: ids.users.buyerMinhAnh,
      action: "LOGIN",
      status: "success",
      ip_address: "203.113.10.1",
      user_agent: "Chrome/126 Windows",
      occurred_at: daysFrom(now, -15)
    },
    {
      id: "77000000-0000-0000-0000-000000000002",
      user_id: ids.users.buyerNgocLinh,
      action: "LOGIN_FAILED",
      status: "failed",
      ip_address: "203.113.10.2",
      user_agent: "Chrome/126 Android",
      occurred_at: daysFrom(now, -8)
    },
    {
      id: "77000000-0000-0000-0000-000000000003",
      user_id: ids.users.buyerHoangNam,
      action: "CHANGE_PASSWORD",
      status: "success",
      ip_address: "203.113.10.3",
      user_agent: "Firefox/128 macOS",
      occurred_at: daysFrom(now, -2)
    }
  ];

  for (const log of authLogs) {
    await prisma.authenticationLog.upsert({
      where: { id: log.id },
      create: log,
      update: log
    });
  }

  const adminLogs = [
    {
      id: "77100000-0000-0000-0000-000000000001",
      admin_id: ids.users.adminOperations,
      target_user_id: null,
      target_partner_id: ids.partners.highlands,
      target_voucher_id: null,
      action: "APPROVE_PARTNER",
      description: "Phê duyệt hồ sơ đối tác Highlands Coffee.",
      occurred_at: daysFrom(now, -120)
    },
    {
      id: "77100000-0000-0000-0000-000000000002",
      admin_id: ids.users.adminContent,
      target_user_id: null,
      target_partner_id: null,
      target_voucher_id: ids.vouchers.cgvCouple,
      action: "APPROVE_VOUCHER",
      description: "Duyệt voucher combo CGV Couple.",
      occurred_at: daysFrom(now, -10)
    },
    {
      id: "77100000-0000-0000-0000-000000000003",
      admin_id: ids.users.adminSecurity,
      target_user_id: ids.users.buyerNgocLinh,
      target_partner_id: null,
      target_voucher_id: null,
      action: "LOCK_ACCOUNT",
      description: "Khóa tạm tài khoản do đăng nhập thất bại liên tiếp.",
      occurred_at: daysFrom(now, -8)
    }
  ];

  for (const log of adminLogs) {
    await prisma.adminLog.upsert({
      where: { id: log.id },
      create: log,
      update: log
    });
  }

  const orderLogs = [
    {
      id: "77200000-0000-0000-0000-000000000001",
      order_id: ids.orders.paid01,
      user_id: ids.users.buyerMinhAnh,
      action: "CREATE_ORDER",
      description: "Khởi tạo đơn hàng thanh toán qua MoMo.",
      occurred_at: daysFrom(now, -15)
    },
    {
      id: "77200000-0000-0000-0000-000000000002",
      order_id: ids.orders.failed01,
      user_id: ids.users.buyerNgocLinh,
      action: "CANCEL_ORDER",
      description: "Đơn bị hủy do thanh toán thất bại.",
      occurred_at: daysFrom(now, -8)
    },
    {
      id: "77200000-0000-0000-0000-000000000003",
      order_id: ids.orders.pending01,
      user_id: ids.users.buyerQuocBao,
      action: "UPDATE_STATUS",
      description: "Đơn hàng vẫn ở trạng thái chờ thanh toán.",
      occurred_at: daysFrom(now, -4)
    }
  ];

  for (const log of orderLogs) {
    await prisma.orderLog.upsert({
      where: { id: log.id },
      create: log,
      update: log
    });
  }

  const paymentLogs = [
    {
      id: "77300000-0000-0000-0000-000000000001",
      payment_id: ids.payments.paid01,
      order_id: ids.orders.paid01,
      user_id: ids.users.buyerMinhAnh,
      action: "PAYMENT_SUCCESS",
      status: "success",
      amount: money(269000),
      occurred_at: daysFrom(now, -15)
    },
    {
      id: "77300000-0000-0000-0000-000000000002",
      payment_id: ids.payments.failed01,
      order_id: ids.orders.failed01,
      user_id: ids.users.buyerNgocLinh,
      action: "PAYMENT_FAILED",
      status: "failed",
      amount: money(160000),
      occurred_at: daysFrom(now, -8)
    },
    {
      id: "77300000-0000-0000-0000-000000000003",
      payment_id: ids.payments.refunded01,
      order_id: ids.orders.refunded01,
      user_id: ids.users.buyerThuTrang,
      action: "REFUND",
      status: "refunded",
      amount: money(2890000),
      occurred_at: daysFrom(now, -20)
    },
    {
      id: "77300000-0000-0000-0000-000000000004",
      payment_id: ids.payments.pending01,
      order_id: ids.orders.pending01,
      user_id: ids.users.buyerQuocBao,
      action: "PAYMENT_CREATED",
      status: "pending",
      amount: money(229000),
      occurred_at: daysFrom(now, -5)
    }
  ];

  for (const log of paymentLogs) {
    await prisma.paymentLog.upsert({
      where: { id: log.id },
      create: log,
      update: log
    });
  }

  const refreshTokens = [
    {
      id: "77400000-0000-0000-0000-000000000001",
      user_id: ids.users.buyerMinhAnh,
      token_hash: crypto.createHash("sha256").update("rt-minh-anh").digest("hex"),
      expires_at: daysFrom(now, 25),
      revoked_at: null,
      created_at: daysFrom(now, -3)
    },
    {
      id: "77400000-0000-0000-0000-000000000002",
      user_id: ids.users.adminContent,
      token_hash: crypto.createHash("sha256").update("rt-admin-content").digest("hex"),
      expires_at: daysFrom(now, 20),
      revoked_at: null,
      created_at: daysFrom(now, -2)
    }
  ];

  for (const token of refreshTokens) {
    await prisma.refreshToken.upsert({
      where: { id: token.id },
      create: token,
      update: token
    });
  }
}
