import { expect, test } from "@playwright/test";
import { accounts } from "../helpers/accounts";
import { loginAs } from "../helpers/auth";

test.describe("login and access control", () => {
  test("a buyer can log in and land on the home page", async ({ page }) => {
    await loginAs(page, accounts.buyer);
    await expect(page).toHaveURL(/localhost:3100\/$/);
    await expect(page.getByText("Đăng nhập", { exact: true })).toHaveCount(0);
  });

  test("a wrong password shows an error and keeps the user on the login page", async ({ page }) => {
    await loginAs(page, accounts.buyer, "WrongPassword1!");
    await expect(page.getByText(/mật khẩu/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("a visitor opening a protected page is asked to log in", async ({ page }) => {
    await page.goto("/my-vouchers");
    await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
    await expect(page.getByText("Voucher của tôi")).toHaveCount(0);
  });

  test("a buyer cannot open the admin area", async ({ page }) => {
    await loginAs(page, accounts.buyer);
    await expect(page).toHaveURL(/localhost:3100\/$/);
    await page.goto("/admin/content/approval");
    await expect(page.getByRole("heading", { name: "Duyệt voucher" })).toHaveCount(0);
  });

  test("an admin lands on the admin dashboard after login", async ({ page }) => {
    await loginAs(page, accounts.adminContent);
    await expect(page).toHaveURL(/\/admin\/content/);
  });
});
