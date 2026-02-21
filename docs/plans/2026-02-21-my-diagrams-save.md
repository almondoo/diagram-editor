# My Diagrams 保存・更新機能 設計ドキュメント

**作成日**: 2026-02-21

## 概要

localStorageを使ったダイアグラム保存機能（My Diagrams / マイ作品）に以下を追加する：

1. `groupStates` を保存対象に追加（グループの位置・サイズも完全保存）
2. `currentDiagramId` の追跡（現在開いているダイアグラムのIDを管理）
3. Command+S ショートカット（新規 or 上書き）
4. 保存ボタンの振る舞い統一（Command+S と同じ）
5. 上書き保存時のトースト通知

## データ層

### `SavedDiagram` 型の変更 (`useLocalDiagrams.ts`)

```ts
export interface SavedDiagram {
  id: string;
  name: string;
  code: string;
  nodeStates: Record<string, DiagramNode>;
  groupStates: Record<string, DiagramGroup>;  // 追加
  savedAt: number;
}
```

### `saveDiagram` シグネチャ変更

```ts
// 変更前
saveDiagram(name: string, code: string, nodeStates: Record<string, DiagramNode>)

// 変更後
saveDiagram(
  name: string,
  id: string | null,
  code: string,
  nodeStates: Record<string, DiagramNode>,
  groupStates: Record<string, DiagramGroup>
): SavedDiagram
```

- `id` が null なら新規追加
- `id` が既存エントリと一致すれば上書き更新
- 保存した `SavedDiagram` を返す（呼び出し元が currentDiagramId を更新するため）

## 状態管理

### `DiagramEditor.tsx` への追加

```tsx
const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
```

### `useDiagramState.loadSaved` の変更

```ts
// 変更前: loadSaved(code, nodeStates)
// 変更後: loadSaved(code, nodeStates, groupStates)
const loadSaved = (
  savedCode: string,
  savedNodeStates: Record<string, DiagramNode>,
  savedGroupStates: Record<string, DiagramGroup>
)
```

groupStates の復元を追加することで、ドラッグ移動済みグループの位置を完全復元できる。

## キーハンドラ

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (currentDiagramId) {
        // 既存ダイアグラムを即時上書き更新
        const name = savedDiagrams.find(d => d.id === currentDiagramId)?.name ?? "無題";
        saveDiagram(name, currentDiagramId, code, nodeStates, groupStates);
        showToast("保存しました");
      } else {
        // 新規保存モーダルを開く
        setShowSaveModal(true);
      }
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, [currentDiagramId, code, nodeStates, groupStates, savedDiagrams]);
```

## UI 変更

### 保存ボタン（ヘッダー）

- `currentDiagramId` がある場合: ラベルを「更新」に変更、同じ即時保存ロジックを実行
- `currentDiagramId` がない場合: ラベルは「保存」のまま、モーダルを開く

### マイ作品ドロップダウン

- 現在開いているダイアグラム（`currentDiagramId` と一致）に ✓ マーク表示

### トースト通知

- 上書き保存成功時に右下に「✓ 保存しました」を2秒間表示
- 小さい `div` をインラインで実装（ライブラリ不要）

```tsx
const [toastVisible, setToastVisible] = useState(false);
const showToast = () => {
  setToastVisible(true);
  setTimeout(() => setToastVisible(false), 2000);
};
```

## 影響ファイル一覧

| ファイル | 変更内容 |
|----------|---------|
| `packages/react/src/hooks/useLocalDiagrams.ts` | groupStates 追加、saveDiagram シグネチャ変更 |
| `packages/react/src/hooks/useDiagramState.ts` | loadSaved に groupStates 追加 |
| `packages/react/src/DiagramEditor.tsx` | currentDiagramId 追加、Command+S ハンドラ、保存ボタン変更、トースト |

## 非機能要件

- localStorage の既存データとの後方互換性: `groupStates` が undefined の場合は `{}` にフォールバック
