import { test, expect } from "@playwright/test";
import { waitForEditorReady } from "../fixtures/test-helpers";

test.describe("エディタ基本レイアウト", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/diagrams/new");
    await waitForEditorReady(page);
  });

  test("コードエディタ（textarea）とSVGキャンバスが表示される", async ({
    page,
  }) => {
    await expect(page.locator("textarea")).toBeVisible();
    await expect(page.locator("svg").first()).toBeVisible();
    await expect(page.getByText("コードエディタ")).toBeVisible();
  });

  test("ツールバーボタン（矩形、角丸、ズーム等）が表示される", async ({
    page,
  }) => {
    await expect(page.locator("[title='矩形']")).toBeVisible();
    await expect(page.locator("[title='角丸']")).toBeVisible();
    await expect(page.locator("[title='ズームイン']")).toBeVisible();
    await expect(page.locator("[title='ズームアウト']")).toBeVisible();
    await expect(page.locator("[title='全体表示']")).toBeVisible();
  });
});
