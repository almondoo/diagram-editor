# エッジドラッグ機能 設計ドキュメント

## 概要

エッジをドラッグ操作で扱えるようにする。3つの変更を行う:

1. **エッジ全体の移動**: エッジの線をドラッグして両端ノードを一緒に移動
2. **接続先の付け替え**: エッジの端点をドラッグして別ノードに接続し直す
3. **自動迂回ルーティング削除**: `computeEdgeRoute` / `_routePoints` を完全削除

## 機能1: エッジ全体の移動

### 操作フロー

1. エッジの線部分をマウスダウン → ドラッグ開始
2. マウス移動 → 両端ノード(from, to)が同じ dx/dy で移動
3. マウスアップ → 位置確定

### 実装

- `EdgeLine` に透明な太いパス(`strokeWidth=12`, `stroke=transparent`, `cursor=move`)を重ねてヒットエリアにする
- `useEdgeDrag` フック: `dragInfo { fromId, toId, startX, startY, type: "move" }` を管理
- ドラッグ中は `setNodeLayout(fromId, ...)` と `setNodeLayout(toId, ...)` を呼ぶ
- 既存の `useNodeDrag` パターンを踏襲(window イベントリスナー方式)

## 機能2: 接続先の付け替え(端点ドラッグ)

### 操作フロー

1. エッジの端点付近にホバー → ドラッグハンドル(丸い点)が表示される
2. ハンドルをドラッグ開始 → 仮のエッジ線がカーソルに追従
3. ノード上でドロップ → DSLコードの from/to を書き換え
4. 空白エリアでドロップ → キャンセル(元に戻す)

### 実装

- `EdgeLine` の両端に `<circle>` ハンドルを追加(ホバー時のみ表示)
- `useEdgeDrag` に `type: "reconnect-from" | "reconnect-to"` を追加
- ドラッグ中: 仮のエッジ線を SVG で描画(固定端 → カーソル位置)
- ドロップ時: カーソル位置の最寄りノードを検出(ヒットテスト)
- `reconnectEdge(fromId, toId, newFromId?, newToId?)`: DSLコード内の edge 行を正規表現で検索し、from/to の ID を書き換え
- 全オペレータ対応: `->`, `<-`, `<->`, `-->`, `<--`, `<-->`, `--`

## 機能3: 自動迂回ルーティング削除

現在エッジがノードと重なる場合に自動的に迂回する機能(`computeEdgeRoute`, `_routePoints`)を削除する。エッジを手動で移動できるようになるため不要。

### 削除対象

- `packages/core/src/geometry.ts`: `computeEdgeRoute` 関数、`segmentIntersectsRect` ヘルパー
- `packages/core/src/types.ts`: `DiagramEdge._routePoints` プロパティ
- `packages/core/src/index.ts`: `computeEdgeRoute` のエクスポート
- `packages/react/src/hooks/useDiagramState.ts`: `routedEdges` useMemo 内の迂回計算ロジック
- `packages/react/src/components/EdgeLine.tsx`: `_routePoints` の参照
- `packages/core/src/geometry.ts`: `buildEdgePath` の `routePoints` パラメータ

## 変更ファイル一覧

| ファイル | 変更 |
|---|---|
| `packages/core/src/types.ts` | `_routePoints` 削除 |
| `packages/core/src/geometry.ts` | `computeEdgeRoute` 削除, `buildEdgePath` から `routePoints` 削除 |
| `packages/core/src/index.ts` | `computeEdgeRoute` エクスポート削除 |
| `packages/react/src/hooks/useDiagramState.ts` | 迂回計算削除, `reconnectEdge` 追加 |
| `packages/react/src/components/EdgeLine.tsx` | `_routePoints` 削除, ヒットエリア追加, 端点ハンドル追加 |
| `packages/react/src/hooks/useEdgeDrag.ts` | **新規**: エッジドラッグフック(移動 + 接続付け替え) |
| `packages/react/src/DiagramEditor.tsx` | `useEdgeDrag` 組み込み, コールバック接続 |
