import { Request, Response } from "express";
import { getDashboardStats, getContentDashboardStats, getStaffDashboardStats } from "../services/dashboard.service.js";
import { contentDashboardQuerySchema } from "../validations/dashboard.validation.js";
import { HttpError } from "../utils/http-error.js";

/**
 * Dashboard cho admin_operations (gốc):
 * - Thống kê users, partners, orders, revenue
 * - Biểu đồ revenue/partners theo tháng
 * - Đơn hàng gần đây
 */
export const getDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { from, to } = req.query;

  const fromDate = from ? new Date(String(from)) : undefined;
  const toDate = to ? new Date(String(to)) : undefined;

  const data = await getDashboardStats({
    from: fromDate,
    to: toDate,
  });

  res.json({
    success: true,
    data,
  });
};

/**
 * Dashboard cho partner_store_staff (FC-PAS):
 * - Thống kê voucher kiểm tra/xác nhận/không hợp lệ và lượt khách hôm nay
 * - Danh sách xác nhận gần đây trong chi nhánh
 */
export async function getStaffDashboard(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) throw new HttpError(401, "Authentication required");

  const data = await getStaffDashboardStats(req.user);

  res.json({
    success: true,
    data,
  });
}

/**
 * Dashboard cho admin_content (FC-ADC-DASHBOARD):
 * - Thống kê voucher theo trạng thái duyệt (pending/approved/rejected)
 * - Thống kê nội dung CMS đang active (banner/article/popup/policy/category)
 * - BR-ADM-06: KHÔNG query doanh thu, đơn hàng, tài khoản
 * - Query params: from_date, to_date (optional, mặc định 30 ngày gần nhất)
 */
export const getContentDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  const parsed = contentDashboardQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid query parameters",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { from_date, to_date } = parsed.data;

  const data = await getContentDashboardStats({
    from: from_date ? new Date(from_date) : undefined,
    to: to_date ? new Date(to_date) : undefined,
  });

  res.json({
    success: true,
    data,
  });
};