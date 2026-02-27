# CLAUDE.md

このファイルはリポジトリで作業する際のClaude Code へのガイダンスを提供する。

## コマンド実行の原則

**すべてのコマンドは必ず `docker compose exec app <コマンド>` で実行。ローカルの pnpm / node を直接使わない。**

### make コマンド

| コマンド | 説明 |
|---|---|
| `make up` | コンテナ起動 (http://localhost:5173) |
| `make down` | コンテナ停止 |
| `make clean` | 停止 + ボリューム削除 (pnpm 再インストール強制) |
| `make logs` | 開発サーバーのログ追跡 |
| `make build` | 本番ビルド |
| `make typecheck` | 型チェック |
| `make test` | ユニットテスト (vitest) |
| `make preview` | 本番ビルド + プレビューサーバー (http://localhost:4173) |

### よく使う docker コマンド

```bash
docker compose exec app pnpm typecheck    # 型チェック
docker compose exec app pnpm lint         # lint (ESLint v9 flat config)
docker compose exec app pnpm build        # 本番ビルド
docker compose exec app pnpm test         # ユニットテスト
docker compose exec app pnpm e2e          # E2Eテスト
```

### コード変更後の必須チェック

変更後は必ず **typecheck → lint → build** を実行。core 変更時は test も実行。

### サーバー確認

- **開発サーバー**: http://localhost:5173 (HMR, `make up`)
- **プレビューサーバー**: http://localhost:4173 (`make preview`, 本番ビルド確認用)

## プロジェクト構造

```
diagram-editor/
├── app/
│   ├── lib/
│   │   ├── core/          # 純TypeScript (React非依存)
│   │   │   ├── __tests__/ # ユニットテスト (vitest)
│   │   │   └── ...        # types, parser, layout, formatter, syntax, geometry, svg-export
│   │   └── react/         # React コンポーネント・フック
│   │       ├── components/ # ShapeNode, EdgeLine, GroupBox, NoteBox,
│   │       │               # CodeEditor, Toolbar, Minimap, SyntaxPanel
│   │       ├── hooks/      # useDiagramState, useNodeDrag, useGroupDrag,
│   │       │               # useCanvasInteraction, useSplitPane,
│   │       │               # syncNodes, syncGroups, syncNotes
│   │       ├── DiagramEditor.tsx
│   │       └── index.ts
│   ├── components/         # AppHeader.tsx, SaveModal.tsx
│   ├── data/               # templates.ts
│   ├── hooks/              # useLocalDiagrams.ts
│   ├── routes/             # home.tsx, diagram.tsx
│   ├── root.tsx
│   ├── routes.ts
│   └── app.css
├── e2e/                    # Playwright E2Eテスト
├── docs/                   # ドキュメント
├── package.json            # 単一パッケージ
├── vite.config.ts
├── react-router.config.ts
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.mjs
├── docker-compose.yml, Dockerfile, Makefile
```

## アーキテクチャ

### データフロー

```
code (文字列) → parseDSL() → ParseResult { nodes, edges, groups, notes, errors }
  → nodeStates/groupStates (ドラッグ位置ミラー) → autoLayout() → SVG レンダリング
```

### Import パス

```ts
import { parseDSL } from "~/lib/core";
import { DiagramEditor } from "~/lib/react";
import { useLocalDiagrams } from "~/hooks/useLocalDiagrams";
```

`~/` は `app/` にマッピング（tsconfig.json の paths で設定）。

### 二層ステートモデル (`useDiagramState`)

- **`code`**: DSL 文字列。パース・フォーマット・ドラッグ書き戻しのソース
- **`nodeStates`** / **`groupStates`**: ドラッグ/リサイズで変更された位置・サイズ

`syncNodes.ts` / `syncGroups.ts` が `code` 変更時にステートを同期（新規は `_needsPosition: true` → `autoLayout` で配置）。

### ドラッグ→コード書き戻し

`useNodeDrag`: DSL の `x=`/`y=` を正規表現で直接置換 (`line.replace(/x=\S+/, ...)`)。
`useGroupDrag`: グループと内包ノード（子孫グループ含む）を一括移動。

### localStorage 永続化

`useLocalDiagrams` フック（`app/hooks/`）。キー: `diagramcraft_saved_diagrams`。
`SavedDiagram { id, name, code, nodeStates, groupStates, savedAt }`。Cmd+S で保存。

### geometry.ts

`getShapePath`, `getNodeCenter`, `getEdgePoints` を提供。`ShapeNode.tsx`・`EdgeLine.tsx`・`svg-export.ts` が共通インポート。

## コード配置の指針

- **`app/lib/core/`**: React非依存の純TypeScript。DSLパース、レイアウト、ジオメトリ計算、SVGエクスポート
- **`app/lib/react/`**: Reactコンポーネント・フック。SVG描画, コードエディタ, ドラッグ/ズーム/パン, ツールバー, ミニマップ, 構文パネル, ステート管理
- **`app/`（直下）**: アプリ固有。ヘッダー/ブランディング, テンプレート, 保存/読込UI, localStorage永続化, ルーティング

```tsx
// API: State object prop パターン
const state = useDiagramState(TEMPLATES.architecture);
<DiagramEditor state={state} style={{ flex: 1 }} />
// DiagramEditor は state: DiagramState を受け取るだけ。テンプレート・保存を知らない。
```

## 実装原則: YAGNI / KISS

- **YAGNI (You Aren't Gonna Need It)**: 今必要な機能だけを実装する。「将来使うかも」で作らない。
- **KISS (Keep It Simple, Stupid)**: 最もシンプルな実装を選ぶ。複雑さは必要になってから導入する。

具体的なルール:

- 依頼された変更だけを行う。周辺コードの「ついでリファクタ」はしない
- 1回しか使わない処理をヘルパー関数や抽象化に切り出さない
- 将来の拡張性のためのフィーチャーフラグ・設定項目・抽象レイヤーを作らない
- 変更していないコードに docstring・コメント・型注釈を追加しない
- 内部コードやフレームワーク保証を信頼し、起こり得ないケースのエラーハンドリングを書かない。バリデーションはシステム境界（ユーザー入力・外部API）のみ
- 後方互換のための未使用変数リネーム・再エクスポート・`// removed` コメントは不要。不要なものは完全に削除する

## 主な制約

- **SSR 有効**: `react-router.config.ts` に `ssr: true` + `vercelPreset()`。Vercel デプロイ。
- **Tailwind CSS v4**: `@tailwindcss/vite` プラグイン使用。カスタムカラーパレットは `app/app.css` の `@theme` で定義。静的スタイルは Tailwind ユーティリティクラス、動的値（DSLデータ由来の色、計算値、SVG属性）のみ `style={}` で記述。
- **pnpm ストア**: `.pnpm-store/` はプロジェクト内 Docker ボリューム。

## DSL シンタックス

```
node <id> "ラベル" { shape=rect color=#6366f1 x=100 y=100 w=150 h=60 }
edge <from> OP <to> { label="テキスト" color=#hex animate=true }
# OP: -> <- <-> --> <-- <--> --
group <id> "ラベル" { color=#hex x=0 y=0 w=300 h=200
  group <child-id> "子グループ" { ... }
  node <id> ...
}
note <id> "テキスト" { x=0 y=0 color=#hex }
style <nodeId> { color=#hex shape=rect border=#hex text=#hex }
// または # でコメント
```

シェイプ: `rect`, `stadium`, `diamond`, `ellipse`, `circle`, `cylinder`, `hexagon`, `parallelogram`, `trapezoid`

グループはネスト可能。`DiagramGroup.parentGroup` で親子関係を表現。

## Subagent の活用

**独立した作業は並列で subagent に委譲し、待ち時間を最小化する。**

| ユースケース | subagent_type | 備考 |
|---|---|---|
| コードベース調査 | `Explore` | 読み取り専用、高速 |
| 実装計画 | `Plan` | 読み取り専用 |
| コード変更 | `general-purpose` | フル権限 |
| コードレビュー | `pr-review-toolkit:code-reviewer` | PR前品質チェック |
| テスト分析 | `pr-review-toolkit:pr-test-analyzer` | カバレッジ確認 |

注意: subagent と同じ調査をメインで重複しない / 結果はサマリーを報告 / 依存作業は順序を守る
