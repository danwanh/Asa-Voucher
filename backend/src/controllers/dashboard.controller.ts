import { Request, Response } from "express";
import { getDashboardStats } from "../services/dashboard.service.js";

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