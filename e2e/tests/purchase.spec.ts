import { expect, test, type Page } from "@playwright/test";
import { API_URL } from "../playwright.config";
import { accounts, vouchers } from "../helpers/accounts";
import { loginAs } from "../helpers/auth";
import { signedVnpayReturnQuery } from "../helpers/vnpay";

/**
 * Walks the checkout in the browser up to the hand-off to VNPay, and returns the
 * payment reference and amount VNPay would receive. VNPay itself is not called.
 */
async function startVnpayPayment(page: Page, voucherId: string) {
  await page.goto(`/vouchers/${voucherId}`);
  await page.getByRole("button", { name: /^Mua ngay —/ }).click();
  await page.getByRole("button", { name: "Tạo đơn hàng" }).click();

  let vnpayUrl: URL | undefined;
  await page.route("**/sandbox.vnpayment.vn/**", async (route) => {
    vnpayUrl = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: "text/html", body: "<h1>VNPay sandbox (stub)</h1>" });
  });

  await page.getByText("VNPay", { exact: true }).first().click();
  await page.getByRole("button", { name: /^Thanh toán ngay/ }).click();
  // Wait until the browser has actually landed on the stub, so our next navigation is not interrupted by this one
  await expect(page.getByRole("heading", { name: "VNPay sandbox (stub)" })).toBeVisible();

  return {
    txnRef: vnpayUrl!.searchParams.get("vnp_TxnRef")!,
    amountVnd: Number(vnpayUrl!.searchParams.get("vnp_Amount")) / 100,
  };
}

test.describe.configure({ mode: "serial" });

test.describe("buying a voucher", () => {
  test("a buyer buys a voucher and pays through VNPay", async ({ page }) => {
    await loginAs(page, accounts.buyer);
    await expect(page).toHaveURL(/localhost:3100\/$/);

    const { txnRef, amountVnd } = await startVnpayPayment(page, vouchers.highlandsBogoId);
    expect(amountVnd).toBeGreaterThan(0);

    // VNPay sends the shopper back to the API with a signed result; the API redirects to the result page.
    await page.goto(`${API_URL}/payments/vnpay/return?${signedVnpayReturnQuery(txnRef, amountVnd)}`);
    await expect(page.getByRole("heading", { name: "Thanh toán thành công" })).toBeVisible();

    await page.goto("/my-vouchers");
    await expect(page.getByText(vouchers.highlandsBogoName).first()).toBeVisible();
  });

  test("a payment result with a tampered amount is rejected", async ({ page }) => {
    await loginAs(page, accounts.buyer);
    await expect(page).toHaveURL(/localhost:3100\/$/);

    const { txnRef, amountVnd } = await startVnpayPayment(page, vouchers.highlandsBogoId);

    // Amount in the signed query differs from the order total
    await page.goto(`${API_URL}/payments/vnpay/return?${signedVnpayReturnQuery(txnRef, amountVnd + 1000)}`);
    await expect(page.getByRole("heading", { name: "Thanh toán chưa thành công" })).toBeVisible();
  });
});
