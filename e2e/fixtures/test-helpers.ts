import { type Page } from "@playwright/test";

/** SVGキャンバスの描画完了を待つ */
export async function waitForEditorReady(page: Page) {
  await page.waitForSelector("svg", { state: "visible" });
  await page.waitForSelector('[data-bg="true"]', { state: "attached" });
}

/** textarea のコードを置換する */
export async function setEditorCode(page: Page, code: string) {
  const textarea = page.locator("textarea");
  await textarea.focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(code, { delay: 2 });
}

/** localStorage の保存済みダイアグラムをクリア */
export async function clearSavedDiagrams(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("diagramcraft_saved_diagrams");
  });
}

/** テスト用ダイアグラムを localStorage に注入 */
export async function seedDiagram(
  page: Page,
  data: {
    id: string;
    name: string;
    code: string;
  },
) {
  await page.evaluate((d) => {
    const existing = JSON.parse(
      localStorage.getItem("diagramcraft_saved_diagrams") || "[]",
    );
    existing.push({
      id: d.id,
      name: d.name,
      code: d.code,
      nodeStates: {},
      groupStates: {},
      noteStates: {},
      savedAt: Date.now(),
    });
    localStorage.setItem(
      "diagramcraft_saved_diagrams",
      JSON.stringify(existing),
    );
  }, data);
}
