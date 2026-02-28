# Diagram Editor 仕様書

## プロジェクト概要

DSLベースのダイアグラムエディタ。テキストでノード・エッジ・グループ・ノートを記述し、リアルタイムにSVG描画する。自動レイアウト、ドラッグ操作、コード書き戻し、Undo/Redo、SVGエクスポート、localStorage永続化をサポート。

## データフロー

```
code (DSL文字列)
  → parseDSL()
  → syncNodes/syncGroups/syncNotes (コード⇔位置層の同期)
  → autoLayout() (_needsPosition ノードの自動配置)
  → SVG描画
```

## 仕様書一覧

| ファイル | 内容 |
|---------|------|
| [dsl-syntax.md](./dsl-syntax.md) | DSL文法仕様 — node, edge, group, note, style, comment の構文とプロパティ |
| [parser.md](./parser.md) | パーサー仕様 — parseDSL, parseProps, エラー検出, デフォルト値 |
| [layout.md](./layout.md) | レイアウトエンジン — dagre/force レイアウト, 方向, グループ対応 |
| [geometry.md](./geometry.md) | ジオメトリ計算 — シェイプパス生成, エッジ接続点, パス構築 |
| [state-management.md](./state-management.md) | ステート管理 — 二層モデル, 同期, Undo/Redo, DiagramState API |
| [drag-interaction.md](./drag-interaction.md) | ドラッグ操作 — ノード/グループ/エッジドラッグ, ズーム/パン, 範囲選択 |
| [svg-export.md](./svg-export.md) | SVGエクスポート — スタンドアロンSVG生成, エスケープ |
| [editor-components.md](./editor-components.md) | UIコンポーネント — DiagramEditor, ShapeNode, CodeEditor, Toolbar 等 |
| [persistence.md](./persistence.md) | 保存・読込 — localStorage永続化, テンプレート, SavedDiagram |
| [colors.md](./colors.md) | カラーシステム — 5プリセット, ランダム/ID連動色, 位置生成 |
