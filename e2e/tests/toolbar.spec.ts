import { test, expect } from "@playwright/test";
import { waitForEditorReady } from "../fixtures/test-helpers";

test.describe("ツールバー操作", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/diagrams/new");
    await waitForEditorReady(page);
  });

  test("矩形ボタンクリックでnodeがコードに追加される", async ({ page }) => {
    const textarea = page.locator("textarea");

    // 初期コードをクリア
    await textarea.fill("");

    // 矩形ボタンをクリック
    await page.locator("[title='矩形']").click();

    // textareaにnodeコードが追加される
    const value = await textarea.inputValue();
    expect(value).toContain("node");
    expect(value).toContain("rect");
  });

  test("テンプレートドロップダウンが開きアイテムが表示される", async ({
    page,
  }) => {
    await page.getByText("テンプレート").click();

    const dropdown = page.locator("[data-template-dropdown] >> div.absolute");
    await expect(
      dropdown.getByRole("button", { name: "フローチャート" }),
    ).toBeVisible();
    await expect(
      dropdown.getByRole("button", { name: "シーケンス" }),
    ).toBeVisible();
    await expect(
      dropdown.getByRole("button", { name: "アーキテクチャ" }),
    ).toBeVisible();
    await expect(
      dropdown.getByRole("button", { name: "マインドマップ" }),
    ).toBeVisible();
  });
});
