# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

このファイルはリポジトリで作業する際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## 開発サーバー

アプリは **http://localhost:5173** で動作する。動作確認はこのURLをブラウザで参照すること。

## ブラウザ確認（Chrome）

コード変更後にブラウザで動作確認する場合は以下のURLを使用する:

- **開発サーバー**: http://localhost:5173（HMR あり、`make up` で自動起動）
- **プレビューサーバー**: http://localhost:4173（本番ビルド確認用、`make preview` で起動）

`make preview` はすべてのパッケージをビルドしてから Vite のプレビューサーバーを起動する。
`packages/` を変更した場合は開発サーバー（5173）だとビルドが古い可能性があるため、`make preview`（4173）で確認するのが確実。

## コマンド実行の原則

**pnpm・node など、すべてのコマンドは必ず `docker compose exec app <コマンド>` を使ってDockerコンテナ内で実行すること。ローカルの pnpm / node を直接使ってはならない。**

```bash
docker compose exec app pnpm -r typecheck           # 全パッケージの型チェック
docker compose exec app pnpm -r lint                # 全パッケージのlint
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
make preview   # 全ビルド + プレビューサーバー起動 (http://localhost:4173)
```

`make up` を初回実行すると `pnpm install && pnpm -r build && pnpm --filter diagram-editor-web dev --host` が自動的に実行される。

## コード変更後のチェック

**コードを変更した際は、必ず以下をDockerコンテナ内で実行して確認すること:**

```bash
docker compose exec app pnpm -r typecheck   # 型チェック
docker compose exec app pnpm -r lint        # lintチェック (ESLint)
docker compose exec app pnpm -r build       # ビルド確認
docker compose exec app pnpm --filter diagram-dsl-core test  # テスト (coreを変更した場合)
```

lintはルートの `eslint.config.mjs` で一元管理 (ESLint v9 flat config)。TypeScript + React + React Hooks の全ルールをカバー。

## packages 変更後のビルド必須

`packages/core` または `packages/react` を変更した場合、**必ずビルドを実行すること**。
`apps/web` の開発サーバーはビルド済みの `dist/` を参照しているため、ソース変更だけではブラウザに反映されない。

```bash
docker compose exec app pnpm --filter diagram-dsl-core build    # core を変更した場合
docker compose exec app pnpm --filter diagram-dsl-react build   # react を変更した場合
docker compose exec app pnpm -r build                           # 両方変更した場合
```

ビルド後はブラウザをリロードすること。

## モノレポ構造

```
diagram-editor/
├── packages/
│   ├── core/          # diagram-dsl-core (React非依存の純TypeScript)
│   │   └── src/       # types, parser, layout, formatter, syntax, geometry, svg-export
│   └── react/         # diagram-dsl-react (ライブラリ本体)
│       └── src/
│           ├── components/  # SVGコンポーネント群 (ShapeNode, EdgeLine, GroupBox, NoteBox,
│           │                #   CodeEditor, Toolbar, Minimap, SyntaxPanel)
│           ├── hooks/       # useDiagramState, useNodeDrag, useGroupDrag,
│           │                #   useCanvasInteraction, useSplitPane,
│           │                #   syncNodes, syncGroups, syncNotes
│           ├── DiagramEditor.tsx
│           └── styles.ts
├── apps/
│   └── web/           # diagram-editor-web (React Router v7 SPA)
│       └── app/
│           ├── components/  # AppHeader.tsx, SaveModal.tsx
│           ├── data/        # templates.ts
│           ├── hooks/       # useLocalDiagrams.ts
│           └── routes/home.tsx  # アプリのエントリポイント
├── docker-compose.yml
├── Dockerfile
├── Makefile
└── pnpm-workspace.yaml
```

## アーキテクチャ

### データフロー

```
code (文字列ステート)
  → parseDSL()       → ParseResult { nodes, edges, groups, notes, errors }
  → nodeStates / groupStates (ドラッグ位置を保持するミラーステート)
  → autoLayout()     → 位置が割り当てられ、__RANDOM__ カラーが解決される
  → parsed (useMemo) → SVG コンポーネントでレンダリング
```

### 二層ステートモデル

`useDiagramState` が管理する状態は DSL コードと位置ステートの2層：

- **`code`**: DSL 文字列。パース・フォーマット・ドラッグ書き戻しのソース
- **`nodeStates`** (`Record<string, DiagramNode>`): ドラッグ操作で変更されたノードの位置・サイズ
- **`groupStates`** (`Record<string, DiagramGroup>`): ドラッグ/リサイズで変更されたグループの位置・サイズ

`syncNodes.ts` / `syncGroups.ts` が `code` 変更時にステートを同期（新規追加は `_needsPosition: true` でマーク → `autoLayout` で配置）。

### ドラッグ→コード書き戻し

`useNodeDrag` フックで管理。DSL コード文字列の `x=` と `y=` の値を正規表現で直接置換する:

```ts
line.replace(/x=\S+/, `x=${newX}`)
```

グループドラッグは `useGroupDrag` が担当し、グループと内包ノード（子孫グループ含む）を一括移動する。

### localStorage 永続化

`useLocalDiagrams` フック（`apps/web/app/hooks/useLocalDiagrams.ts`）が管理:

- **ストレージキー**: `diagramcraft_saved_diagrams`
- **保存データ**: `SavedDiagram { id, name, code, nodeStates, groupStates, savedAt }`
- `home.tsx` が `currentDiagramId: string | null` を追跡し、Command+S で上書き保存 / 未保存なら名前入力モーダルを開く

### geometry.ts の役割

`packages/core/src/geometry.ts` が `getShapePath`, `getNodeCenter`, `getEdgePoints` を提供。
`ShapeNode.tsx`、`EdgeLine.tsx`、`svg-export.ts` の3箇所が共通してこれをインポートする。

## ライブラリとアプリの責務分離

`packages/react`（ライブラリ）と `apps/web`（アプリ）の責務を明確に分離する。新機能を追加する際は、この基準に従って配置先を判断すること。

### ライブラリ（packages/react・packages/core）に属するもの

- **チャート描画**: ノード・エッジ・グループ・ノートの SVG レンダリング
- **コードエディタ**: DSL 入力、シンタックスハイライト、エラー表示
- **ダイアグラム操作**: ノード・グループ・ノートのドラッグ、ズーム・パン、選択矩形
- **ツールバー**: ノード追加、SVG エクスポート、ズーム操作、レイアウトリセット
- **ミニマップ**: キャンバス全体の俯瞰ビュー
- **構文ヘルプパネル**: DSL 構文リファレンスの表示
- **ステート管理フック**: `useDiagramState`（`DiagramState` 型を export し、アプリから `state` prop として受け取る）
- **DSL パース・フォーマット・レイアウト計算**: `packages/core` に実装

### アプリ（apps/web）に属するもの

- **ブランディング・ヘッダー**: ロゴ、アプリ名、ナビゲーション（`AppHeader.tsx`）
- **テンプレート**: テンプレートデータ定義とテンプレートボタン UI（`data/templates.ts`）
- **保存・読込 UI**: 名前入力モーダル、マイ作品ドロップダウン（`SaveModal.tsx`）
- **localStorage 永続化**: `useLocalDiagrams` フック、`SavedDiagram` 型
- **Cmd+S キーバインド**: 保存トリガー
- **トースト通知**: 保存完了フィードバック

### API パターン（State object prop）

```tsx
// apps/web: ステートを生成してライブラリに渡す
const state = useDiagramState(TEMPLATES.architecture);
<DiagramEditor state={state} style={{ flex: 1 }} />
```

ライブラリ側の `DiagramEditor` は `state: DiagramState` を受け取るだけで、
テンプレート・保存・永続化を一切知らない。

### 判断基準

「この機能は `diagram-dsl-react` を他のアプリで使い回したときも必要か？」

- **Yes** → ライブラリ（packages）に置く
- **No / アプリ固有** → アプリ（apps/web）に置く

## 主な制約

- **SSR なし**: `react-router.config.ts` に `ssr: false` が設定されている。純粋なクライアントサイド SPA。
- **インラインスタイルのみ**: Tailwind クラスは使用しない。スタイルはすべて React のインライン `style={}` プロパティで記述する。
- **pnpm ストア**: `.pnpm-store/` はプロジェクトディレクトリ内（Docker ボリューム）に配置される。
- **esbuild スクリプトのブロック**: pnpm セキュリティが esbuild のインストールスクリプトをブロックするが、tsup/Vite はプリビルドされたバイナリを使用するため正常に動作する。

## DSL シンタックス

```
node <id> "ラベル" { shape=rect color=#6366f1 x=100 y=100 w=150 h=60 }
edge <from> -> <to> { label="テキスト" color=#hex style=dashed|solid animate=true }
group <id> "ラベル" { color=#hex x=0 y=0 w=300 h=200
  group <child-id> "子グループ" { ... }   # ネストされたグループ
  node <id> ...                            # グループ内ノード
}
note <id> "テキスト" { x=0 y=0 color=#hex }
style <nodeId> { color=#hex shape=rect border=#hex text=#hex }
// または # でコメント
```

シェイプ: `rect`, `stadium`, `diamond`, `ellipse`, `circle`, `cylinder`, `hexagon`, `parallelogram`, `trapezoid`

グループはネスト可能。`DiagramGroup.parentGroup` フィールドで親子関係を表現する。
