import { describe, expect, it, vi } from "vitest";

// Never send real emails; capture what would have been sent instead.
vi.mock("../../services/email.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/email.service.js")>();
  return { ...actual, sendEmail: vi.fn().mockResolvedValue(undefined) };
});

import { sendEmail } from "../../services/email.service.js";
import { API, TEST_PASSWORD, accounts, api, bearer, createTestBuyer, prisma } from "./helpers.js";

function refreshCookie(res: { headers: Record<string, unknown> }) {
  const cookies = (res.headers["set-cookie"] as string[] | undefined) ?? [];
  const cookie = cookies.find((value) => value.startsWith("refresh_token="));
  return cookie?.split(";")[0];
}

async function login(identifier: string, password = TEST_PASSWORD) {
  return api().post(`${API}/auth/login`).send({ identifier, password });
}

describe("health", () => {
  it("reports the API and database as up", async () => {
    const res = await api().get(`${API}/health`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", database: { configured: true } });
  });
});

describe("auth", () => {
  it("logs in a seed buyer and returns an access token plus a refresh cookie", async () => {
    const res = await login(accounts.buyer);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.access_token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ email: accounts.buyer, role: "buyer" });
    expect(res.body.data.user).not.toHaveProperty("password_hash");
    expect(refreshCookie(res)).toBeDefined();
  });

  it("returns the current user from /auth/me", async () => {
    const { body } = await login(accounts.buyer);
    const res = await api().get(`${API}/auth/me`).set(bearer(body.data.access_token));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: accounts.buyer, role: "buyer" });
  });

  it("rejects requests without a token or with a bad token", async () => {
    const noToken = await api().get(`${API}/auth/me`);
    expect(noToken.status).toBe(401);

    const badToken = await api().get(`${API}/auth/me`).set(bearer("not-a-real-token"));
    expect(badToken.status).toBe(401);
    expect(badToken.body.error.code).toBe("INVALID_TOKEN");
  });

  it("rejects a wrong password and reports remaining attempts", async () => {
    const user = await createTestBuyer();
    const res = await login(user.email, "Wrong-password-1!");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_PASSWORD");
    expect(res.body.error.details.remaining_attempts).toEqual(expect.any(Number));
  });

  it("rotates the refresh token and rejects the old one", async () => {
    const user = await createTestBuyer();
    const first = await login(user.email);
    const oldCookie = refreshCookie(first)!;

    const refreshed = await api().post(`${API}/auth/refresh`).set("Cookie", oldCookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.access_token).toEqual(expect.any(String));
    expect(refreshCookie(refreshed)).not.toBe(oldCookie);

    const reused = await api().post(`${API}/auth/refresh`).set("Cookie", oldCookie);
    expect(reused.status).toBe(401);
  });

  it("revokes existing access tokens on logout", async () => {
    const user = await createTestBuyer();
    const { body, headers } = await login(user.email);
    const token = body.data.access_token as string;

    const logout = await api()
      .post(`${API}/auth/logout`)
      .set(bearer(token))
      .set("Cookie", refreshCookie({ headers })!);
    expect(logout.status).toBe(200);

    const me = await api().get(`${API}/auth/me`).set(bearer(token));
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe("SESSION_REVOKED");
  });

  it("registers a buyer, blocks login until the emailed link is used, then allows it", async () => {
    const email = `new-${Date.now()}@asa.test`;
    const res = await api().post(`${API}/auth/register`).send({
      email,
      password: "Strong-pass1!",
      confirm_password: "Strong-pass1!",
      full_name: "New Buyer",
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email, is_verified: false });
    expect(res.body.data).not.toHaveProperty("password_hash");
    expect(sendEmail).toHaveBeenCalledWith(email, expect.any(String), expect.stringContaining("verify-email?token="));

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored?.role).toBe("buyer");

    const blocked = await login(email, "Strong-pass1!");
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    const html = vi.mocked(sendEmail).mock.calls.find(([to]) => to === email)![2];
    const token = /verify-email\?token=([\w-]+)/.exec(html)![1];
    const verify = await api().post(`${API}/auth/verify-email`).send({ token });
    expect(verify.status).toBe(200);

    const allowed = await login(email, "Strong-pass1!");
    expect(allowed.status).toBe(200);
  });

  it("rejects registration with an email that already exists", async () => {
    const res = await api().post(`${API}/auth/register`).send({
      email: accounts.buyer,
      password: "Strong-pass1!",
      confirm_password: "Strong-pass1!",
      full_name: "Duplicate",
    });
    expect(res.status).toBe(409);
  });
});
