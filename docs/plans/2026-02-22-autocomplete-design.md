# DSL 予測変換（オートコンプリート）デザイン

## 概要

CodeEditor に入力中の自動補完機能を追加する。補完ロジックを `packages/core` に、UIを `packages/react` に配置。

## アーキテクチャ

### ファイル構成

- `packages/core/src/autocomplete.ts` - 補完コンテキスト解析 + 候補生成
- `packages/react/src/components/AutocompleteDropdown.tsx` - ドロップダウンUI
- `packages/react/src/components/CodeEditor.tsx` - 統合（キーハンドリング + コンテキスト計算）

## 補完コンテキスト

カーソル位置のテキストを解析し、以下のコンテキストを判定:

| コンテキスト | 判定条件 | 補完候補 |
|---|---|---|
| `keyword` | 行頭で文字入力中 | `node`, `edge`, `group`, `note`, `style` |
| `nodeId` | `edge`/`style` の後 | 定義済み node/group/note ID |
| `edgeOperator` | `edge <from>` の後 | `->`, `<-`, `<->`, `-->`, `<--`, `<-->`, `--` |
| `property` | `{ }` ブロック内でキー入力中 | コンテキスト依存のプロパティ名 |
| `value` | `プロパティ名=` の後 | プロパティに応じた値 |

### 値の補完候補

| プロパティ | 候補 |
|---|---|
| `shape` | rect, stadium, diamond, ellipse, circle, cylinder, hexagon, parallelogram, trapezoid |
| `animate`, `dashed` | true, false |
| `curve` | smooth, straight |
| `color`, `text`, `border` | よく使う色プリセット |

### プロパティ候補（コンテキスト依存）

- **node**: shape, color, text, border, borderWidth, icon, fontSize, opacity, dashed, x, y, w, h
- **edge**: label, color, animate, thickness, curve
- **group**: color, x, y, w, h
- **note**: color, x, y
- **style**: color, shape, border, text

## UI デザイン

- ダークテーマ（背景 `#1e293b`、ボーダー `#334155`）
- カーソル直下に absolute positioned ドロップダウン
- 最大 8 候補表示、スクロール可能
- 選択中の候補はハイライト（`#334155` 背景）

### キー操作

| キー | 動作 |
|---|---|
| 上下矢印 | 候補を選択 |
| Tab / Enter | 選択した候補を挿入 |
| Escape | 候補リストを閉じる |
| 文字入力 | 候補をフィルタリング |

## 挿入ロジック

- 入力中のプレフィックスを置換して候補テキストを挿入
- キーワード選択時は末尾スペースを付加
- プロパティ選択時は `=` を付加

## CodeEditor 統合

- `handleKeyDown` で補完関連キーをインターセプト（表示中のみ）
- 入力のたびに補完コンテキストを計算（カーソル行のみ、軽量）
- 既存機能（`{` ペアリング、Tab インデント、Enter 改行）は補完非表示時に維持

## 定義済みID取得

parseDSL() の結果から node/group/note の ID を収集。CodeEditor に nodes/groups/notes を追加 props として渡す。
