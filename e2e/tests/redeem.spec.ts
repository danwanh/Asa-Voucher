import { expect, test } from "@playwright/test";
import { accounts, vouchers } from "../helpers/accounts";
import { apiLogin, buyVoucherViaApi } from "../helpers/api";
import { loginAs } from "../helpers/auth";

test.describe("redeeming a voucher at the store", () => {
  test("store staff confirm a voucher once, and it cannot be used again", async ({ page, request }) => {
    const buyerToken = await apiLogin(request, accounts.buyer);
    const [code] = await buyVoucherViaApi(request, buyerToken, vouchers.highlandsBogoId);
    expect(code).toBeTruthy();

    await loginAs(page, accounts.highlandsStoreQ1);
    await expect(page).toHaveURL(/\/partner/);

    await page.goto(`/voucher/verify?code=${encodeURIComponent(code)}`);
    await expect(page.getByText(code).first()).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận sử dụng Voucher" }).click();
    await expect(page.getByText("Xác nhận thành công")).toBeVisible();

    // Checking the same code again: the voucher is used, so the store refuses it
    await page.goto(`/voucher/verify?code=${encodeURIComponent(code)}`);
    await expect(page.getByText("Kiểm tra thất bại")).toBeVisible();
    await expect(page.getByText("Voucher đã được sử dụng")).toBeVisible();
    await expect(page.getByRole("button", { name: "Xác nhận sử dụng Voucher" })).toHaveCount(0);
  });

  test("staff of a branch where the voucher is not valid is refused", async ({ page, request }) => {
    const buyerToken = await apiLogin(request, accounts.buyer);
    const [code] = await buyVoucherViaApi(request, buyerToken, vouchers.karaokeKatinatId);
    expect(code).toBeTruthy();

    await loginAs(page, accounts.highlandsStoreTDB);
    await expect(page).toHaveURL(/\/partner/);

    await page.goto(`/voucher/verify?code=${encodeURIComponent(code)}`);
    await expect(page.getByText("Voucher không áp dụng ở chi nhánh của bạn")).toBeVisible();
    await expect(page.getByRole("button", { name: "Xác nhận sử dụng Voucher" })).toHaveCount(0);
  });
});
