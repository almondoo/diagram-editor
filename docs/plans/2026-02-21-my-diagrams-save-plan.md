# My Diagrams 保存・更新機能 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Command+S ショートカットで既存ダイアグラムを即時上書き保存、未保存なら名前入力モーダルを開く。groupStates も保存対象に追加して完全保存を実現する。

**Architecture:** `useLocalDiagrams` に groupStates 追加、`DiagramEditor` に currentDiagramId を追加して保存済み/未保存を判定。`useDiagramState.loadSaved` も groupStates を受け取るよう拡張。テスト対象は `diagram-dsl-core` のみなので React 層は手動確認。

**Tech Stack:** React 18, TypeScript, localStorage, Vite (Docker 内 pnpm)

**コマンド実行ルール:** すべてのコマンドは `docker compose exec app <cmd>` を使うこと。

---

### Task 1: `useLocalDiagrams` に groupStates を追加

**Files:**
- Modify: `packages/react/src/hooks/useLocalDiagrams.ts`

**Step 1: `SavedDiagram` 型に `groupStates` を追加する**

`useLocalDiagrams.ts` を以下のように変更する：

```ts
import { useState, useCallback } from "react";
import type { DiagramNode, DiagramGroup } from "diagram-dsl-core";

const STORAGE_KEY = "diagramcraft_saved_diagrams";

export interface SavedDiagram {
  id: string;
  name: string;
  code: string;
  nodeStates: Record<string, DiagramNode>;
  groupStates: Record<string, DiagramGroup>;  // 追加
  savedAt: number;
}
```

**Step 2: `loadFromStorage` の後方互換を確認する**

既存 localStorage データに `groupStates` がない場合のフォールバックを追加：

```ts
function loadFromStorage(): SavedDiagram[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const diagrams = raw ? (JSON.parse(raw) as SavedDiagram[]) : [];
    // 古いデータへの後方互換: groupStates がなければ {} に
    return diagrams.map((d) => ({ groupStates: {}, ...d }));
  } catch {
    return [];
  }
}
```

**Step 3: `saveDiagram` のシグネチャを変更する**

```ts
export function useLocalDiagrams() {
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>(loadFromStorage);

  const saveDiagram = useCallback(
    (
      name: string,
      id: string | null,
      code: string,
      nodeStates: Record<string, DiagramNode>,
      groupStates: Record<string, DiagramGroup>
    ): SavedDiagram => {
      let result!: SavedDiagram;
      setSavedDiagrams((prev) => {
        const existingIdx = id ? prev.findIndex((d) => d.id === id) : -1;
        const entry: SavedDiagram = {
          id: existingIdx >= 0 ? prev[existingIdx].id : `d${Date.now()}`,
          name,
          code,
          nodeStates,
          groupStates,
          savedAt: Date.now(),
        };
        result = entry;
        const next =
          existingIdx >= 0
            ? prev.map((d, i) => (i === existingIdx ? entry : d))
            : [...prev, entry];
        saveToStorage(next);
        return next;
      });
      return result;
    },
    []
  );

  const deleteDiagram = useCallback((id: string) => {
    setSavedDiagrams((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  return { savedDiagrams, saveDiagram, deleteDiagram };
}
```

**Step 4: 型チェックを実行して確認する**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーが発生する（呼び出し側の引数が合わなくなる）— 次のタスクで修正する。

---

### Task 2: `useDiagramState.loadSaved` に groupStates を追加

**Files:**
- Modify: `packages/react/src/hooks/useDiagramState.ts`

**Step 1: `loadSaved` のシグネチャに `savedGroupStates` を追加する**

```ts
const loadSaved = (
  savedCode: string,
  savedNodeStates: Record<string, DiagramNode>,
  savedGroupStates: Record<string, DiagramGroup>
) => {
  setNodeStates(savedNodeStates);
  setGroupStates(savedGroupStates);  // {} ではなく savedGroupStates を設定
  setCode(savedCode);
};
```

**Step 2: 戻り値に `groupStates` を追加する**

`useDiagramState` の return に `groupStates` を追加：

```ts
return {
  code,
  setCode,
  parsed,
  nodeById,
  groupById,
  nodeStates,
  groupStates,   // 追加（DiagramEditorがsaveDiagramに渡すため）
  setNodeLayout,
  setGroupLayout,
  setGroupSize,
  addNode,
  exportSVG,
  formatCode,
  resetLayout,
  loadTemplate,
  loadSaved,
};
```

**Step 3: 型チェックを実行する**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: まだエラーあり（DiagramEditor.tsx の呼び出し側が未修正）

---

### Task 3: `DiagramEditor.tsx` に currentDiagramId とトーストを追加

**Files:**
- Modify: `packages/react/src/DiagramEditor.tsx`

**Step 1: `currentDiagramId` と `toastVisible` の state を追加する**

```tsx
const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
const [toastVisible, setToastVisible] = useState(false);
```

**Step 2: `useDiagramState` の destructuring に `groupStates` を追加する**

```tsx
const {
  code, setCode, parsed, nodeById, groupById, nodeStates, groupStates,
  setNodeLayout, setGroupLayout, setGroupSize,
  addNode, exportSVG, formatCode, resetLayout, loadTemplate, loadSaved,
} = useDiagramState(initialCode);
```

**Step 3: `showToast` ヘルパー関数を追加する**

```tsx
const showToast = useCallback(() => {
  setToastVisible(true);
  setTimeout(() => setToastVisible(false), 2000);
}, []);
```

**Step 4: `handleSave` ヘルパー関数を追加する（Command+S とボタンの共通ロジック）**

```tsx
const handleSave = useCallback(() => {
  if (currentDiagramId) {
    const name = savedDiagrams.find((d) => d.id === currentDiagramId)?.name ?? "無題";
    saveDiagram(name, currentDiagramId, code, nodeStates, groupStates);
    showToast();
  } else {
    setShowSaveModal(true);
  }
}, [currentDiagramId, code, nodeStates, groupStates, savedDiagrams, saveDiagram, showToast]);
```

**Step 5: Command+S キーハンドラを追加する**

既存の `showMyDiagrams` の `useEffect` の下に追加：

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, [handleSave]);
```

**Step 6: SaveModal の `onSave` を更新して currentDiagramId をセットする**

```tsx
{showSaveModal && (
  <SaveModal
    existingNames={savedDiagrams.map((d) => d.name)}
    onSave={(name) => {
      const saved = saveDiagram(name, null, code, nodeStates, groupStates);
      setCurrentDiagramId(saved.id);
    }}
    onClose={() => setShowSaveModal(false)}
  />
)}
```

**Step 7: マイ作品ドロップダウンの `loadSaved` 呼び出しを更新する**

```tsx
onClick={() => {
  loadSaved(d.code, d.nodeStates, d.groupStates);
  setCurrentDiagramId(d.id);
  setShowMyDiagrams(false);
}}
```

また、現在開いているダイアグラムに ✓ マークを追加：

```tsx
<div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>
  {d.id === currentDiagramId && (
    <span style={{ color: "#6366f1", marginRight: 4 }}>✓</span>
  )}
  {d.name}
</div>
```

**Step 8: 保存ボタンを `handleSave` に変更してラベルを動的にする**

```tsx
<button
  onClick={handleSave}
  style={{
    background: "#312e81",
    border: "1px solid #4338ca",
    color: "#c7d2fe",
    padding: "3px 12px",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    marginLeft: 8,
  }}
>
  {currentDiagramId ? "更新" : "保存"}
</button>
```

**Step 9: トースト通知 UI を追加する**

`</div>` の閉じタグ（DiagramEditor の最後）の前、`showSaveModal` の直後に追加：

```tsx
{toastVisible && (
  <div
    style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      background: "#1e2435",
      border: "1px solid #4338ca",
      borderRadius: 8,
      padding: "10px 18px",
      fontSize: 12,
      color: "#a5b4fc",
      fontWeight: 600,
      zIndex: 2000,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    <span style={{ color: "#6366f1" }}>✓</span> 保存しました
  </div>
)}
```

---

### Task 4: 型チェック・ビルド・動作確認

**Step 1: 型チェックを実行する**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 2: ビルドを実行する**

```bash
docker compose exec app pnpm -r build
```

Expected: すべてのパッケージが成功

**Step 3: ブラウザで動作確認する（http://localhost:5173）**

確認項目：
- [ ] 「保存」ボタンをクリック → 名前入力モーダルが開く
- [ ] 名前を入力して保存 → ボタンが「更新」に変わる
- [ ] Command+S を押す → 「✓ 保存しました」トーストが2秒表示される
- [ ] マイ作品ドロップダウンを開く → 現在開いているものに ✓ マーク
- [ ] グループをドラッグ移動後に保存 → 読み込み時にグループ位置が復元される
- [ ] テンプレートをロード → ボタンが「保存」に戻る（currentDiagramId がリセットされる）

**Step 4: テンプレート読み込み時に currentDiagramId をリセットする**

動作確認で問題があれば `loadTemplate` 呼び出し時に `setCurrentDiagramId(null)` を追加：

```tsx
onClick={() => {
  loadTemplate(val);
  setCurrentDiagramId(null);
}}
```

新規（`+ 新規`）ボタンと `loadTemplate(TEMPLATES.empty)` も同様に追加。

---

### Task 5: コミット

**Step 1: 変更をコミットする**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r build
git add packages/react/src/hooks/useLocalDiagrams.ts \
        packages/react/src/hooks/useDiagramState.ts \
        packages/react/src/DiagramEditor.tsx
git commit -m "feat: add Command+S save/update and groupStates persistence"
```
