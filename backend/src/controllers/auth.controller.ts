import type { Request, Response } from "express";
import { parseCookies } from "../utils/auth.js";
import { created, ok } from "../utils/response.js";
import { changePassword, clearRefreshCookie, createUser, login, logout, refresh, setRefreshCookie, writeAuthLog } from "../services/auth.service.js";

export async function register(req: Request, res: Response) {
  created(res, await createUser(req.body, "buyer"), "Registered");
}

export async function loginController(req: Request, res: Response) {
  const result = await login(req.body.email, req.body.password, { ip: req.ip, userAgent: req.header("user-agent") });
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

export async function forgotPassword(req: Request, res: Response) {
  await writeAuthLog(undefined, "RESET_PASSWORD", "requested", { ip: req.ip, userAgent: req.header("user-agent") });
  ok(res, { email: req.body.email }, "Password reset request recorded");
}

export async function changePasswordController(req: Request, res: Response) {
  await changePassword(req.user!.id, req.body.current_password, req.body.new_password);
  ok(res, null, "Password changed");
}

export async function me(req: Request, res: Response) {
  ok(res, req.user, "OK");
}
