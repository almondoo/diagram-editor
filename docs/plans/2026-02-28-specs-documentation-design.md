# 仕様書作成設計: docs/specs/

## 概要

コードベース全体から機能ドメイン単位の仕様書を `docs/specs/` に作成する。
対象読者は開発者自身（将来の参照用）。技術的に詳細かつ簡潔なリファレンス形式。

## 決定事項

- **範囲**: コア全体（全機能）
- **構成**: 機能ドメイン単位で分割（10ファイル + README索引）
- **既存docs**: `docs/dsl-syntax.md` を `docs/specs/dsl-syntax.md` に移動・拡充
- **フォーマット**: 統一テンプレート（概要 → API → 動作仕様 → デフォルト値 → 関連ファイル）

## ファイル構成

```
docs/specs/
├── README.md              # 全体概要・アーキテクチャ図・ファイル索引
├── dsl-syntax.md          # DSL文法仕様（既存を移動・拡充）
├── parser.md              # パーサー仕様（parseDSL, parseProps, formatDSLCode）
├── layout.md              # レイアウトエンジン（dagre, 方向, グループ対応, FLIP）
├── geometry.md            # ジオメトリ計算（シェイプパス, エッジ接続点, パス構築）
├── state-management.md    # ステート管理（二層モデル, 同期, Undo/Redo）
├── drag-interaction.md    # ドラッグ操作（ノード/グループ/エッジ/ノート, ズーム/パン）
├── svg-export.md          # SVGエクスポート
├── editor-components.md   # UIコンポーネント群
├── persistence.md         # 保存・読込・テンプレート
└── colors.md              # カラーシステム
```

## 各仕様書の内容

### README.md
- プロジェクト概要（1段落）
- データフロー図: `code → parseDSL() → nodeStates/groupStates → autoLayout() → SVG`
- 各仕様書へのリンクと1行説明

### dsl-syntax.md
- 全要素の構文定義（node, edge, group, note, style, comment）
- エッジ演算子一覧と意味（7種）
- プロパティ一覧（デフォルト値付き）
- シェイプ一覧（9種）
- グループネスト構文
- コメント構文

### parser.md
- `parseDSL(code)` の入出力（string → ParseResult）
- `parseProps(str)` の動作（プロパティ文字列 → Record）
- パース処理フロー（行単位、ブロック対応）
- エラー検出と ParseError 形式
- `formatDSLCode(code)` のフォーマットルール

### layout.md
- `autoLayout()` の引数と戻り値
- dagre レイアウトアルゴリズム概要
- レイアウト方向（auto/TB/LR）の判定ロジック
- グループ対応（ネスト深さ、パディング定数）
- `_needsPosition` フラグの仕組み
- FLIPアニメーション連携

### geometry.md
- `getShapePath(shape, x, y, w, h)` — 9シェイプのSVGパス生成
- `getNodeCenter(node)` — ノード中心座標
- `getEdgePoints(fromNode, toNode)` — エッジ始終点計算
- `buildEdgePath(from, to, curve, bendX?, bendY?)` — パス構築

### state-management.md
- `DiagramState` インターフェース全体
- 二層ステートモデル（code層 + 位置層）
- syncNodes / syncGroups / syncNotes の同期ロジック
- Undo/Redo スナップショット方式
- `useDiagramState(initialCode)` の責務

### drag-interaction.md
- useNodeDrag — ドラッグ・リサイズ・コード書き戻し（正規表現置換）
- useGroupDrag — グループ移動（子ノード一括）・リサイズ
- useEdgeDrag — ベンドポイント・エンドポイントリコネクト
- ノートドラッグ
- useMultiSelect — 複数選択
- useCanvasInteraction — ズーム・パン・背景クリック
- 座標変換（スクリーン → キャンバス）

### svg-export.md
- `generateExportSVG(parsed)` の入出力
- エクスポートSVGの構造
- `escapeXml()` のエスケープルール

### editor-components.md
- DiagramEditor — メインコンポーネント、props
- ShapeNode / EdgeLine / GroupBox / NoteBox — 描画系
- CodeEditor — シンタックス強調、オートコンプリート
- Toolbar / Minimap / SyntaxPanel
- BottomSheet（モバイル対応）

### persistence.md
- SavedDiagram 型定義
- localStorage キー・データ構造
- useLocalDiagrams API
- テンプレート一覧・構造
- loadTemplate / loadSaved の動作

### colors.md
- VIBRANT_COLORS 配列
- COLOR_PRESETS（5種）
- randomColor() / colorForId() のアルゴリズム
- randomPosition() の重複回避

## 統一フォーマット

各仕様書は以下のセクション構成（該当しないセクションは省略）:

1. **概要** — 機能が何をするか（1-2文）
2. **API** — 関数シグネチャ、型定義
3. **動作仕様** — 入出力、処理フロー、制約
4. **デフォルト値** — テーブル形式
5. **関連ファイル** — ソースコードパス
