import { expect, test, type Page } from "@playwright/test";
import { vouchers } from "../helpers/accounts";

// The chat endpoint is mocked in the browser: e2e checks the UI flow only.
// Real filtering against the database is covered by backend/src/tests/integration/voucher-chat.int.test.ts.
const CHAT_ROUTE = "**/ai/voucher-chat";

const chatResult = {
  reply: "Đây là các voucher cà phê ở TP. Hồ Chí Minh:",
  vouchers: [
    {
      id: vouchers.highlandsBogoId,
      name: vouchers.highlandsBogoName,
      category_id: "40000000-0000-0000-0000-000000000002",
      partner_name: "Highlands Coffee Việt Nam",
      selling_price: 69000,
      original_price: 138000,
      discount_rate: 50,
      applicable_area: "TP. Hồ Chí Minh",
      image_url: null,
      average_rating: 4.5,
      review_count: 2
    }
  ]
};

async function openChat(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Mở trợ lý tìm voucher" }).click();
  return page.getByRole("dialog", { name: "Trợ lý tìm voucher" });
}

test.describe("AI voucher chat", () => {
  test("a guest asks for vouchers, sees results and opens one", async ({ page }) => {
    const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
    await page.route(CHAT_ROUTE, (route) => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: { success: true, data: chatResult, message: "OK" } });
    });

    const chat = await openChat(page);
    await chat.getByLabel("Nhập yêu cầu tìm voucher").fill("cà phê ở TP.HCM");
    await chat.getByRole("button", { name: "Gửi" }).click();

    await expect(chat.getByText(chatResult.reply)).toBeVisible();
    await expect(chat.getByText(vouchers.highlandsBogoName)).toBeVisible();
    // The welcome message is not sent to the backend
    expect(requests[0].messages).toEqual([{ role: "user", content: "cà phê ở TP.HCM" }]);

    // A follow-up sends the conversation so far
    await chat.getByLabel("Nhập yêu cầu tìm voucher").fill("rẻ hơn nữa");
    await chat.getByRole("button", { name: "Gửi" }).click();
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1].messages.map((message) => message.role)).toEqual(["user", "assistant", "user"]);

    await chat.getByText(vouchers.highlandsBogoName).first().click();
    await expect(page).toHaveURL(new RegExp(`/vouchers/${vouchers.highlandsBogoId}`));
  });

  test("suggestion chips send a question", async ({ page }) => {
    await page.route(CHAT_ROUTE, (route) => route.fulfill({ json: { success: true, data: chatResult, message: "OK" } }));

    const chat = await openChat(page);
    await chat.getByRole("button", { name: "Cà phê ở TP.HCM dưới 100k" }).click();

    await expect(chat.getByText(chatResult.reply)).toBeVisible();
  });

  test("shows a friendly message when the AI is busy", async ({ page }) => {
    await page.route(CHAT_ROUTE, (route) =>
      route.fulfill({ status: 429, json: { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Quá nhiều yêu cầu", details: [] } } })
    );

    const chat = await openChat(page);
    await chat.getByLabel("Nhập yêu cầu tìm voucher").fill("spa");
    await chat.getByRole("button", { name: "Gửi" }).click();

    await expect(chat.getByText("Bạn hỏi hơi nhanh, đợi vài phút rồi thử lại nhé.")).toBeVisible();
  });
});
