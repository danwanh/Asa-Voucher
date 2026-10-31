import { expect, test, type Page } from "@playwright/test";
import { accounts } from "../helpers/accounts";
import { loginAs } from "../helpers/auth";

// Vouchers waiting for approval in the seed (backend/prisma/seed/02-catalog.ts)
const PENDING_TO_APPROVE = "Combo gia đình Pizza Hut 4 người";
const PENDING_TO_REJECT = "Lẩu bò tơ Quán Mộc cho nhóm 4 người";

async function openApprovalPage(page: Page) {
  await loginAs(page, accounts.adminContent);
  await expect(page).toHaveURL(/\/admin\/content/);
  await page.goto("/admin/content/approval");
  await expect(page.getByRole("heading", { name: "Duyệt voucher" })).toBeVisible();
}

function cardFor(page: Page, name: string) {
  return page.locator("div.rounded-2xl", { has: page.getByText(name, { exact: true }) }).filter({ has: page.getByRole("button", { name: "Từ chối" }) }).last();
}

test.describe("admin voucher approval", () => {
  test("the content admin approves a pending voucher", async ({ page }) => {
    await openApprovalPage(page);
    await cardFor(page, PENDING_TO_APPROVE).getByRole("button", { name: "Duyệt", exact: true }).click();
    await expect(page.getByText("Duyệt voucher thành công")).toBeVisible();
    await expect(page.getByText(PENDING_TO_APPROVE, { exact: true })).toHaveCount(0);
  });

  test("rejecting a voucher needs a reason", async ({ page }) => {
    await openApprovalPage(page);
    await cardFor(page, PENDING_TO_REJECT).getByRole("button", { name: "Từ chối" }).click();
    await expect(page.getByRole("heading", { name: "Từ chối Voucher" })).toBeVisible();

    await page.getByPlaceholder("Nhập lý do từ chối...").fill("Thông tin voucher chưa đầy đủ");
    await page.getByRole("button", { name: "Từ chối", exact: true }).last().click();
    await expect(page.getByText("Từ chối voucher thành công")).toBeVisible();
    await expect(page.getByText(PENDING_TO_REJECT, { exact: true })).toHaveCount(0);
  });
});
