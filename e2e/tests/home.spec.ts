import { test, expect } from "@playwright/test";
import { clearSavedDiagrams, seedDiagram } from "../fixtures/test-helpers";

test.describe("ホームページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearSavedDiagrams(page);
  });

  test("空状態で「保存済みのダイアグラムはありません」が表示される", async ({
    page,
  }) => {
    await page.reload();
    await expect(
      page.getByText("保存済みのダイアグラムはありません"),
    ).toBeVisible();
  });

  test("「+ 新規作成」で /diagrams/new に遷移する", async ({ page }) => {
    await page.getByRole("link", { name: "+ 新規作成" }).click();
    await expect(page).toHaveURL(/\/diagrams\/new/);
  });

  test("seed済みダイアグラムがカードとして表示される", async ({ page }) => {
    await seedDiagram(page, {
      id: "test-1",
      name: "テスト図",
      code: 'node a "Hello" {}',
    });
    await page.reload();
    await expect(page.getByText("テスト図")).toBeVisible();
  });

  test("削除ボタン2回クリックでカードが削除される", async ({ page }) => {
    await seedDiagram(page, {
      id: "del-1",
      name: "削除対象",
      code: 'node a "A" {}',
    });
    await page.reload();
    await expect(page.getByText("削除対象")).toBeVisible();

    // 1回目: 確認状態に変わる
    await page.getByText("🗑").click();
    await expect(page.getByText("確認？")).toBeVisible();

    // 2回目: 実際に削除
    await page.getByText("確認？").click();
    await expect(page.getByText("削除対象")).not.toBeVisible();
  });
});
