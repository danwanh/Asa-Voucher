import type { Request, Response } from "express";
import { chatAboutVouchers } from "../services/voucher-chat.service.js";
import { ok } from "../utils/response.js";

export async function voucherChat(req: Request, res: Response) {
  ok(res, await chatAboutVouchers(req.body.messages));
}
