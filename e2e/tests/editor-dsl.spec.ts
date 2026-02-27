import { test, expect } from "@playwright/test";
import { waitForEditorReady, seedDiagram, clearSavedDiagrams } from "../fixtures/test-helpers";

test.describe("DSLコード → 描画", () => {
  test("デフォルトテンプレートのノードがSVG内に描画される", async ({
    page,
  }) => {
    await page.goto("/diagrams/new");
    await waitForEditorReady(page);

    const svg = page.locator("svg").first();
    await expect(svg.locator("text", { hasText: "ALB" })).toBeVisible();
  });

  test("不正DSLでエラー表示される", async ({ page }) => {
    // 不正DSLをseedしてエディタに遷移
    await page.goto("/");
    await clearSavedDiagrams(page);
    await seedDiagram(page, {
      id: "err-test",
      name: "エラーテスト",
      code: "invalid syntax here",
    });
    await page.goto("/diagrams/err-test");
    await waitForEditorReady(page);

    await expect(page.getByText(/⚠ \d+エラー/)).toBeVisible();
  });

  test("ノード数に応じて統計表示が更新される", async ({ page }) => {
    // 2ノードのDSLをseedしてエディタに遷移
    await page.goto("/");
    await clearSavedDiagrams(page);
    await seedDiagram(page, {
      id: "count-test",
      name: "カウントテスト",
      code: 'node a "A" { shape=rect }\nnode b "B" { shape=rect }',
    });
    await page.goto("/diagrams/count-test");
    await waitForEditorReady(page);

    await expect(page.getByText(/2ノード/)).toBeVisible();
  });
});
