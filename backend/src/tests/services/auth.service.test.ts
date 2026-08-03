import { describe, it, expect, vi, beforeEach } from "vitest";

  const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    partner: {
      findFirst: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations as Promise<unknown>[])),
    authToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    authenticationLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));

vi.mock("../../utils/auth.js", () => ({
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
  verifyPassword: vi.fn(async (p: string, h: string) => h === `hashed:${p}`),
  signAccessToken: vi.fn((payload: unknown) => `token.${JSON.stringify(payload)}`),
  verifyAccessToken: vi.fn(),
  createRefreshToken: vi.fn(() => "refresh-token-123"),
  hashRefreshToken: vi.fn((t: string) => `hash:${t}`),
  addDays: vi.fn((d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; }),
}));

vi.mock("../../utils/db.js", () => ({
  sanitizeUser: vi.fn((u: Record<string, unknown>) => { const { password_hash, ...rest } = u; return rest; }),
  requireData: vi.fn((d: unknown, msg: string) => { if (!d) throw new Error(msg); return d; }),
  throwDbError: vi.fn((e: unknown) => { throw e; }),
}));

import { prisma } from "../../config/prisma.js";
import * as authService from "../../services/auth.service.js";

describe("Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUser", () => {
    it("creates user with hashed password", async () => {
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "u1", email: "test@test.com", role: "buyer", password_hash: "hashed:pass",
      } as any);

      const result = await authService.createUser({ email: "test@test.com", password: "pass" }, "buyer");
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.password_hash).toBeUndefined();
    });
  });

  describe("login", () => {
    it("returns tokens on correct credentials", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "u1", email: "test@test.com", role: "buyer", password_hash: "hashed:pass", is_active: true, is_verified: true,
      } as any);
      vi.mocked(prisma.partner.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);
      vi.mocked(prisma.authenticationLog.create).mockResolvedValue({} as any);

      const result = await authService.login("test@test.com", "pass", {});
      expect(result.accessToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it("throws 401 on wrong password", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "u1", email: "test@test.com", role: "buyer", password_hash: "hashed:wrong", is_active: true, is_verified: true,
      } as any);
      vi.mocked(prisma.authenticationLog.create).mockResolvedValue({} as any);

      await expect(authService.login("test@test.com", "pass", {})).rejects.toThrow();
    });

    it("throws 401 on non-existent email", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.authenticationLog.create).mockResolvedValue({} as any);

      await expect(authService.login("no@test.com", "pass", {})).rejects.toThrow();
    });

    it("throws 403 on inactive user", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "u1", email: "test@test.com", role: "buyer", password_hash: "hashed:pass", is_active: false, is_verified: true,
      } as any);
      vi.mocked(prisma.authenticationLog.create).mockResolvedValue({} as any);

      await expect(authService.login("test@test.com", "pass", {})).rejects.toThrow();
    });
  });

  describe("refresh", () => {
    it("returns new tokens on valid refresh token", async () => {
      vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue({
        id: "rt1", users: {
          id: "u1", email: "test@test.com", role: "buyer", password_hash: "h", is_active: true, is_verified: true,
          partner_branches_id: null,
        },
      } as any);
      vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as any);
      vi.mocked(prisma.partner.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const result = await authService.refresh("some-token");
      expect(result.accessToken).toBeDefined();
    });

    it("throws 401 on missing token", async () => {
      await expect(authService.refresh(undefined)).rejects.toThrow();
    });

    it("throws 401 on invalid token", async () => {
      vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue(null);
      await expect(authService.refresh("invalid")).rejects.toThrow();
    });
  });

  describe("logout", () => {
    it("revokes refresh token and logs", async () => {
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.authenticationLog.create).mockResolvedValue({} as any);

      await authService.logout("some-token", "u1");
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(prisma.authenticationLog.create).toHaveBeenCalled();
    });

    it("works without refresh token", async () => {
      vi.mocked(prisma.authenticationLog.create).mockResolvedValue({} as any);
      await authService.logout(undefined, "u1");
      expect(prisma.authenticationLog.create).toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    it("changes password on correct current password", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1", password_hash: "hashed:old",
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.authenticationLog.create).mockResolvedValue({} as any);

      await authService.changePassword("u1", "old", "new");
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it("throws on wrong current password", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1", password_hash: "hashed:correct",
      } as any);

      await expect(authService.changePassword("u1", "wrong", "new")).rejects.toThrow();
    });
  });

  describe("setRefreshCookie / clearRefreshCookie", () => {
    it("setRefreshCookie sets cookie", () => {
      const res = { cookie: vi.fn(), clearCookie: vi.fn() } as any;
      authService.setRefreshCookie(res, "token123");
      expect(res.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "token123",
        expect.objectContaining({ httpOnly: true })
      );
    });

    it("clearRefreshCookie clears cookie", () => {
      const res = { cookie: vi.fn(), clearCookie: vi.fn() } as any;
      authService.clearRefreshCookie(res);
      expect(res.clearCookie).toHaveBeenCalledWith("refresh_token", { path: "/api" });
    });
  });
});
