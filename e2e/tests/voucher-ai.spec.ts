import { expect, test, type Page, type Route } from "@playwright/test";
import { accounts } from "../helpers/accounts";
import { loginAs } from "../helpers/auth";

// The AI endpoint is mocked in the browser: e2e checks the UI flow only.
// The real endpoint (auth, fallback models, errors) is covered by backend/src/tests/integration/voucher-ai.int.test.ts.
const AI_ROUTE = "**/voucher-products/ai/generate-copy";

const aiCopy = {
  description: "Buffet lẩu nướng cho 2 người với giá ưu đãi tại Asa Voucher.",
  terms: ["Áp dụng cho 2 người", "Không áp dụng ngày lễ"],
  usage_instructions: ["Xuất trình mã QR cho nhân viên", "Thanh toán phần chênh lệch nếu có"]
};

function replyWithCopy(route: Route) {
  return route.fulfill({ json: { success: true, data: aiCopy, message: "OK" } });
}

/** Form fields are a <label> followed by the input in the same wrapper div. */
function field(page: Page, label: string) {
  return page.locator("label", { hasText: new RegExp(`^${label}`) }).locator("xpath=..").locator("input, textarea, select").first();
}

async function openCreateVoucherPage(page: Page) {
  await loginAs(page, accounts.highlandsVoucherStaff);
  await expect(page).toHaveURL(/\/partner/);
  // Navigate in-app (like a real user) instead of a full page reload
  await page.getByRole("button", { name: "Tạo voucher mới" }).first().click();
  await expect(page.getByRole("heading", { name: "Tạo voucher mới" })).toBeVisible();
  // Wait for categories/branches to load so the form is fully usable
  await expect(field(page, "Danh mục")).not.toHaveValue("");
}

test.describe("AI voucher copy", () => {
  test("fills description, terms and usage instructions from the AI reply", async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;
    await page.route(AI_ROUTE, (route) => {
      requestBody = route.request().postDataJSON();
      return replyWithCopy(route);
    });
    await openCreateVoucherPage(page);

    // Needs a voucher name first
    await page.getByRole("button", { name: "Viết bằng AI" }).click();
    await page.getByRole("button", { name: "Tạo nội dung" }).click();
    await expect(page.getByText("Vui lòng nhập tên voucher trước khi dùng AI")).toBeVisible();
    expect(requestBody).toBeUndefined();

    await field(page, "Tên voucher").fill("Buffet lẩu nướng 2 người");
    await field(page, "Giá gốc").fill("500000");
    await field(page, "Giá bán").fill("400000");
    await page.getByPlaceholder(/phù hợp hẹn hò/).fill("view sông");
    await page.getByRole("button", { name: "Tạo nội dung" }).click();

    await expect(field(page, "Mô tả")).toHaveValue(aiCopy.description);
    await expect(field(page, "Điều kiện áp dụng")).toHaveValue(aiCopy.terms.join("\n"));
    await expect(field(page, "Hướng dẫn sử dụng")).toHaveValue(aiCopy.usage_instructions.join("\n"));
    expect(requestBody).toMatchObject({
      name: "Buffet lẩu nướng 2 người",
      original_price: 500000,
      selling_price: 400000,
      highlights: "view sông"
    });
  });

  test("asks before overwriting text the partner already wrote", async ({ page }) => {
    await page.route(AI_ROUTE, replyWithCopy);
    await openCreateVoucherPage(page);

    await field(page, "Tên voucher").fill("Buffet lẩu nướng 2 người");
    await field(page, "Mô tả").fill("Mô tả tự viết");

    await page.getByRole("button", { name: "Viết bằng AI" }).click();
    await page.getByRole("button", { name: "Tạo nội dung" }).click();
    await expect(page.getByRole("heading", { name: "Ghi đè nội dung hiện tại?" })).toBeVisible();
    await page.getByRole("button", { name: "Giữ nguyên" }).click();
    await expect(field(page, "Mô tả")).toHaveValue("Mô tả tự viết");

    await page.getByRole("button", { name: "Tạo nội dung" }).click();
    await page.getByRole("button", { name: "Ghi đè" }).click();
    await expect(field(page, "Mô tả")).toHaveValue(aiCopy.description);
  });

  test("shows a friendly message when the AI service is down", async ({ page }) => {
    await page.route(AI_ROUTE, (route) =>
      route.fulfill({
        status: 502,
        json: { success: false, error: { code: "AI_UNAVAILABLE", message: "Dịch vụ AI đang quá tải hoặc không phản hồi, vui lòng thử lại sau ít phút", details: [] } }
      })
    );
    await openCreateVoucherPage(page);

    await field(page, "Tên voucher").fill("Buffet lẩu nướng 2 người");
    await page.getByRole("button", { name: "Viết bằng AI" }).click();
    await page.getByRole("button", { name: "Tạo nội dung" }).click();

    await expect(page.getByText(/Dịch vụ AI đang quá tải/)).toBeVisible();
    await expect(field(page, "Mô tả")).toHaveValue("");
  });
});
