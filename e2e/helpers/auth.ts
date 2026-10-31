import { expect, type Page } from "@playwright/test";
import { PASSWORD } from "./accounts";

/** Logs in through the real login form. */
export async function loginAs(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByPlaceholder("email@domain.vn").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}

export async function expectLoggedOut(page: Page) {
  await expect(page).toHaveURL(/\/login/);
}
