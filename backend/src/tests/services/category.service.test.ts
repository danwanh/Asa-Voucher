import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";

vi.mock("../../config/prisma.js", () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    voucherProduct: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "../../config/prisma.js";
import * as categoryService from "../../services/category.service.js";

describe("Category Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listCategories", () => {
    it("returns categories ordered by sort_order then name", async () => {
      vi.mocked(prisma.category.findMany).mockResolvedValue([
        { id: "c1", name: "A", slug: "a", sort_order: 1, description: null, parent_id: null },
        { id: "c2", name: "B", slug: "b", sort_order: 2, description: null, parent_id: null },
      ] as any);

      const result = await categoryService.listCategories();
      expect(result).toHaveLength(2);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      });
    });
  });

  describe("createCategory", () => {
    it("creates category with input", async () => {
      const cat = { id: "c1", name: "Food", slug: "food", sort_order: 0, description: null, parent_id: null } as any;
      vi.mocked(prisma.category.create).mockResolvedValue(cat as any);

      const result = await categoryService.createCategory({ name: "Food", slug: "food" });
      expect(result).toEqual(cat);
      expect(prisma.category.create).toHaveBeenCalled();
    });
  });

  describe("getCategory", () => {
    it("returns category by id", async () => {
      const cat = { id: "c1", name: "Food", slug: "food", description: null, parent_id: null, sort_order: 0 } as any;
      vi.mocked(prisma.category.findUnique).mockResolvedValue(cat as any);

      const result = await categoryService.getCategory("c1");
      expect(result).toEqual(cat);
    });

    it("throws 404 if not found", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValue(null);
      await expect(categoryService.getCategory("c1")).rejects.toThrow(HttpError);
    });
  });

  describe("updateCategory", () => {
    it("updates category", async () => {
      vi.mocked(prisma.category.update).mockResolvedValue({ id: "c1", name: "Updated", slug: "updated", description: null, parent_id: null, sort_order: 0 } as any);

      const result = await categoryService.updateCategory("c1", { name: "Updated" });
      expect(result.name).toBe("Updated");
    });

    it("throws 404 if not found", async () => {
      const error = new Error("Record not found") as Error & { code?: string };
      error.code = "P2025";
      vi.mocked(prisma.category.update).mockRejectedValue(error);
      await expect(categoryService.updateCategory("c1", { name: "X" })).rejects.toThrow(HttpError);
    });
  });

  describe("deleteCategory", () => {
    it("deletes category if no vouchers use it", async () => {
      vi.mocked(prisma.voucherProduct.count).mockResolvedValue(0);
      vi.mocked(prisma.category.delete).mockResolvedValue({} as any);

      await categoryService.deleteCategory("c1");
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    });

    it("throws 409 if category is used by vouchers", async () => {
      vi.mocked(prisma.voucherProduct.count).mockResolvedValue(3);

      await expect(categoryService.deleteCategory("c1")).rejects.toThrow(HttpError);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("throws 404 if category not found", async () => {
      vi.mocked(prisma.voucherProduct.count).mockResolvedValue(0);
      const error = new Error("Record not found") as Error & { code?: string };
      error.code = "P2025";
      vi.mocked(prisma.category.delete).mockRejectedValue(error);

      await expect(categoryService.deleteCategory("c1")).rejects.toThrow(HttpError);
    });
  });
});
