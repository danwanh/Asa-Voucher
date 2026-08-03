import type { Request, Response } from "express";
import { parseCookies } from "../utils/auth.js";
import { created, ok } from "../utils/response.js";
import { changePassword, clearRefreshCookie, forgotPassword, login, logout, refresh, registerBuyer, registerPartner, resendVerification, resetPassword, setRefreshCookie, verifyEmail } from "../services/auth.service.js";

export async function register(req: Request, res: Response) {
  created(res, await registerBuyer(req.body), "Registration submitted. Check your email to verify the account.");
}

export async function registerPartnerController(req: Request, res: Response) {
  created(res, await registerPartner(req.body), "Partner registration submitted. Check your email to verify the account.");
}

export async function loginController(req: Request, res: Response) {
  const result = await login(req.body.identifier, req.body.password, { ip: req.ip, userAgent: req.header("user-agent") });
  setRefreshCookie(res, result.refreshToken);
  ok(res, { access_token: result.accessToken, user: result.user }, "Logged in");
}

export async function refreshController(req: Request, res: Response) {
  const result = await refresh(parseCookies(req.header("cookie")).refresh_token);
  setRefreshCookie(res, result.refreshToken);
  ok(res, { access_token: result.accessToken, user: result.user }, "Token refreshed");
}

export async function logoutController(req: Request, res: Response) {
  await logout(parseCookies(req.header("cookie")).refresh_token, req.user?.id);
  clearRefreshCookie(res);
  ok(res, null, "Logged out");
}

export async function verifyEmailController(req: Request, res: Response) {
  await verifyEmail(req.body.token);
  ok(res, null, "Email verified");
}

export async function resendVerificationController(req: Request, res: Response) {
  await resendVerification(req.body.email);
  ok(res, null, "If the account needs verification, a new email has been sent");
}

export async function forgotPasswordController(req: Request, res: Response) {
  await forgotPassword(req.body.identifier);
  ok(res, null, "If the account exists, a password reset email has been sent");
}

export async function resetPasswordController(req: Request, res: Response) {
  await resetPassword(req.body.token, req.body.new_password);
  ok(res, null, "Password reset successfully");
}

export async function changePasswordController(req: Request, res: Response) {
  await changePassword(req.user!.id, req.body.current_password, req.body.new_password);
  ok(res, null, "Password changed");
}

export async function me(req: Request, res: Response) {
  ok(res, req.user, "OK");
}
