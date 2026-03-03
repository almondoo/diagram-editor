# ダイアグラムエディタ使い勝手改善 設計書

## 概要

4つの使い勝手の課題を解決する。

1. ドラッグ操作の安定化
2. コード⟷キャンバス双方向連携
3. ドラッグのレイヤー優先度（グループヘッダー vs エッジ）
4. グループスペーシング改善

## 1. ドラッグ操作の安定化

### 問題

高速ドラッグ時にジッター（位置のブレ）が発生する。根本原因は5つ:
- pan情報の無視（座標変換が不完全）
- RAFによるフレームロス
- useStateによる更新遅延
- thresholdによる微細ドラッグ喪失
- Math.round()の累積丸め誤差

### 対象ファイル

- `app/lib/react/hooks/useNodeDrag.ts`
- `app/lib/react/hooks/useGroupDrag.ts`
- `app/lib/react/DiagramEditor.tsx`（ノートドラッグ部分）

### 方針

`useEdgeDrag.ts`のreconnectモード（正常動作する参照実装）のパターンに統一する。

| 修正項目 | Before | After |
|---|---|---|
| 座標変換 | `clientX - rect.left` | `(clientX - rect.left - panRef.current.x) / zoomRef.current` |
| フレーム更新 | `requestAnimationFrame` | 直接mousemoveハンドラ内で更新 |
| ドラッグ状態 | `useState` | `useRef` |
| threshold | 1-3px | 削除 |
| 丸め | `Math.round()` | DSL書き戻し時のみ整数化 |

### 影響範囲

- ドラッグ中のリアルタイム位置更新のみ変更
- DSLへの書き戻しロジック（正規表現置換）は変更なし
- マルチ選択ドラッグにも同パターンを適用

## 2. コード⟷キャンバス双方向連携

### 2A: キャンバス→コード（選択時ジャンプ＋ハイライト）

**現状**: ダブルクリック時のみ`findCodeLine()` → `setFocusLine()`でCodeEditorにジャンプ。

**変更**:
- `DiagramEditor.tsx`のシングルクリック選択時（`selectSingle()`呼び出し箇所）で`findCodeLine()` → `setFocusLine()`を実行
- CodeEditorにスクロール＋ハイライトするが、textareaへのfocusは奪わない

**対象ファイル**: `app/lib/react/DiagramEditor.tsx`

### 2B: コード→キャンバス（カーソル行ハイライト）

**現状**: CodeEditorは内部で`cursorLine`を管理しているが外部に公開していない。

**変更**:
1. CodeEditorに`onCursorLineChange?: (line: number) => void`コールバック追加
2. DiagramEditorで受け取り、行番号からDSL要素IDを逆引き
3. 特定された要素をキャンバス上でハイライト表示（選択とは別のビジュアル）

**対象ファイル**:
- `app/lib/react/components/CodeEditor.tsx` — コールバック追加
- `app/lib/react/DiagramEditor.tsx` — 逆引き＋ハイライト管理

## 3. ドラッグのレイヤー優先度

### 問題

エッジの透明ヒットパス（strokeWidth=14）がグループヘッダーの上に描画されるため、グループヘッダーをドラッグしようとするとエッジが反応してしまう。

### 方針

エッジの`onMouseDown`でクリック位置がグループヘッダー領域（上部26px）内かを判定し、該当する場合はイベントをスルーしてグループドラッグを優先させる。

**ロジック**:
- クリック位置がいずれかのグループのヘッダー領域（y ～ y+26px）に該当 → `return`（イベントハンドラを終了、グループに伝播）
- それ以外 → 従来通りエッジのドラッグを実行

**対象ファイル**:
- `app/lib/react/components/EdgeLine.tsx` — onMouseDownにグループヘッダー判定追加
- `app/lib/react/DiagramEditor.tsx` — グループ位置情報をEdgeLineに渡す

## 4. グループスペーシング改善

### 問題

自動配置時にネストされたグループ間の間隔が狭く（12px）、グループ内側の余白も不十分。

### 変更

| 定数 | Before | After |
|---|---|---|
| `GROUP_PADDING` | 12px | 20px |
| ネストグループ間間隔 | 12px（PADDINGと共用） | 24px（専用定数） |

**対象ファイル**: `app/lib/core/layout.ts`
