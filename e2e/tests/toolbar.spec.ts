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

});
