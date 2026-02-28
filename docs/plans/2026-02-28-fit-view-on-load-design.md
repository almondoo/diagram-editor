# テンプレート選択・ダイアグラム読み込み時の自動 fitView

## 問題

テンプレート選択時や保存済みダイアグラム読み込み時に `fitView` が自動実行されず、ダイアグラムが画面にフィットしない。

## 解決策

`DiagramState` に `fitViewRequested` フラグを追加。`loadTemplate` / `loadSaved` で `true` にセットし、`DiagramEditor` で検知して `fitView` を実行。

## 変更ファイル

### `app/lib/react/hooks/useDiagramState.ts`

- `DiagramState` に `fitViewRequested: boolean` と `clearFitViewRequest: () => void` を追加
- `loadTemplate` / `loadSaved` 内で `fitViewRequested` を `true` にセット

### `app/lib/react/DiagramEditor.tsx`

- `state.fitViewRequested` を監視する `useEffect` を追加
- `loadTemplate`: アニメーション経由 → 既存の `pendingFitViewRef` パターンを使う（`isAnimating` 完了後に実行）
- `loadSaved`: アニメーションなし → `parsed` 更新後の次フレームで即実行

## タイミング

| トリガー | アニメーション | fitView 実行タイミング |
|---|---|---|
| `loadTemplate` | あり（`isAnimating`） | アニメーション完了後 |
| `loadSaved` | なし | 次フレーム（`requestAnimationFrame`） |
