# CLAUDE.md

このファイルはリポジトリで作業する際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## コマンド実行の原則

**すべてのコマンドは必ず `docker compose exec app` を使って実行すること。**

```bash
docker compose exec app pnpm -r typecheck           # 全パッケージの型チェック
docker compose exec app pnpm -r build               # 全パッケージのビルド
docker compose exec app pnpm --filter diagram-dsl-core test   # coreのテスト
docker compose exec app pnpm install                # 依存関係インストール
docker compose exec app sh                          # コンテナ内シェル
```

コンテナの起動・停止には `make` コマンドを使用する:

```bash
make up        # コンテナ起動 (pnpm install && pnpm -r build && dev, http://localhost:5173)
make down      # コンテナ停止
make clean     # 停止 + ボリューム削除 (pnpm 再インストールを強制)
make logs      # 開発サーバーのログを追跡
make build     # 全パッケージをビルド
make typecheck # 全パッケージの型チェック
make test      # diagram-dsl-core のテスト
```

`make up` を初回実行すると `pnpm install && pnpm -r build && pnpm --filter diagram-editor-web dev --host` が自動的に実行される。

## モノレポ構造

```
diagram-editor/
├── packages/
│   ├── core/          # diagram-dsl-core (React非依存の純TypeScript)
│   │   └── src/       # types, parser, layout, formatter, syntax, geometry, svg-export, templates
│   └── react/         # diagram-dsl-react
│       └── src/
│           ├── components/  # SVGコンポーネント群
│           ├── hooks/       # useDiagramState, useNodeDrag, useCanvasInteraction, useSplitPane
│           ├── DiagramEditor.tsx
│           └── styles.ts
├── apps/
│   └── web/           # diagram-editor-web (React Router v7 SPA)
│       ├── app/
│       │   ├── routes/home.tsx  # import { DiagramEditor } from "diagram-dsl-react"
│       │   ├── root.tsx
│       │   ├── routes.ts
│       │   └── app.css
│       ├── vite.config.ts
│       └── react-router.config.ts
├── docker-compose.yml
├── Dockerfile
├── Makefile
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## アーキテクチャ

### データフロー

```
code (文字列ステート)
  → parseDSL()       → ParseResult { nodes, edges, groups, notes, errors }
  → autoLayout()     → 位置が割り当てられ、__RANDOM__ カラーが解決される
  → SVG コンポーネント → <DiagramEditor> でレンダリング
```

`parsed` は `useDiagramState` フック内の単一の `useMemo` で管理。

### ドラッグ→コード書き戻し

`useNodeDrag` フックで管理。DSL コード文字列の `x=` と `y=` の値を正規表現で直接置換する:

```ts
line.replace(/x=\S+/, `x=${newX}`)
```

### geometry.ts の役割

`packages/core/src/geometry.ts` が `getShapePath`, `getNodeCenter`, `getEdgePoints` を提供。
ShapeNode.tsx と EdgeLine.tsx はこれをimportし、svg-export.ts も同様にgeometry.tsからimportする。

## 主な制約

- **SSR なし**: `react-router.config.ts` に `ssr: false` が設定されている。純粋なクライアントサイド SPA。
- **インラインスタイルのみ**: Tailwind クラスは使用しない。スタイルはすべて React のインライン `style={}` プロパティで記述する。
- **pnpm ストア**: `.pnpm-store/` はプロジェクトディレクトリ内（Docker ボリューム）に配置される。
- **esbuild スクリプトのブロック**: pnpm セキュリティが esbuild のインストールスクリプトをブロックするが、tsup/Vite はプリビルドされたバイナリを使用するため正常に動作する。

## DSL シンタックス

```
node <id> "ラベル" { shape=rect color=#6366f1 x=100 y=100 w=150 h=60 }
edge <from> -> <to> { label="テキスト" color=#hex style=dashed|solid animate=true }
group <id> "ラベル" { color=#hex x=0 y=0 w=300 h=200 }
note <id> "テキスト" { x=0 y=0 color=#hex }
style <nodeId> { color=#hex shape=rect border=#hex text=#hex }
// または # でコメント
```

シェイプ: `rect`, `stadium`, `diamond`, `ellipse`, `circle`, `cylinder`, `hexagon`, `parallelogram`, `trapezoid`
