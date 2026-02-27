import { test, expect } from "@playwright/test";
import {
  waitForEditorReady,
  clearSavedDiagrams,
} from "../fixtures/test-helpers";

test.describe("保存/読込フロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/diagrams/new");
    await waitForEditorReady(page);
    await clearSavedDiagrams(page);
  });

  test("新規ダイアグラムでCmd+S → SaveModal → 名前入力 → 保存 → トースト", async ({
    page,
  }) => {
    // Cmd+S で保存モーダル表示
    await page.keyboard.press("Meta+s");
    await expect(page.getByText("ダイアグラムを保存")).toBeVisible();

    // 名前入力して保存（モーダル内の保存ボタンを使用）
    await page.getByPlaceholder("名前を入力").fill("テストダイアグラム");
    const modal = page.locator("div.fixed");
    await modal.getByRole("button", { name: "保存" }).click();

    // トースト表示
    await expect(page.getByText("保存しました")).toBeVisible();
  });

  test("保存後リロードでホームページにカード表示される", async ({ page }) => {
    // まず保存
    await page.keyboard.press("Meta+s");
    await page.getByPlaceholder("名前を入力").fill("リロードテスト");
    const modal = page.locator("div.fixed");
    await modal.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText("保存しました")).toBeVisible();

    // ホームに戻ってカード確認
    await page.goto("/");
    await expect(page.getByText("リロードテスト")).toBeVisible();
  });

  test("既存ダイアグラムの更新はモーダルなしで直接保存される", async ({
    page,
  }) => {
    // まず新規保存
    await page.keyboard.press("Meta+s");
    await page.getByPlaceholder("名前を入力").fill("更新テスト");
    const modal = page.locator("div.fixed");
    await modal.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText("保存しました")).toBeVisible();

    // トーストが消えるのを待つ
    await expect(page.getByText("保存しました")).not.toBeVisible({
      timeout: 5000,
    });

    // 再保存（モーダルが出ないことを確認）
    await page.keyboard.press("Meta+s");

    // モーダルなしでトースト直接表示
    await expect(page.getByText("保存しました")).toBeVisible();
    await expect(
      page.getByText("ダイアグラムを保存"),
    ).not.toBeVisible();
  });
});
