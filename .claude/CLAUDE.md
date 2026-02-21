# CLAUDE.md

このファイルはリポジトリで作業する際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## コマンド実行の原則

**すべてのコマンドは必ず `docker compose exec app` を使って実行すること。**

```bash
docker compose exec app pnpm typecheck   # react-router typegen && tsc
docker compose exec app pnpm build       # プロダクションビルド
docker compose exec app pnpm install     # 依存関係インストール
docker compose exec app sh               # コンテナ内シェル
```

コンテナの起動・停止には `make` コマンドを使用する:

```bash
make up      # コンテナ起動 (http://localhost:5173)
make down    # コンテナ停止
make clean   # 停止 + ボリューム削除 (pnpm 再インストールを強制)
make logs    # 開発サーバーのログを追跡
```

`make up` を初回実行すると、compose コマンド経由で `pnpm install && pnpm dev --host` が自動的に実行される。

## アーキテクチャ

### データフロー

```
code (文字列ステート)
  → parseDSL()       → ParseResult { nodes, edges, groups, notes, errors }
  → autoLayout()     → 位置が割り当てられ、__RANDOM__ カラーが解決される
  → SVG コンポーネント → <DiagramEditor> でレンダリング
```

`parsed` は `DiagramEditor.tsx` 内の単一の `useMemo` で、キー入力のたびに再実行される。位置やカラーの独立したステートは存在しない — すべては DSL 文字列の中に格納される。

### ドラッグ→コード書き戻し

ノードのドラッグは位置ステートを更新**しない**。代わりに、DSL コード文字列の `x=` と `y=` の値を正規表現で直接置換する:

```ts
line.replace(/x=\S+/, `x=${newX}`)
```

これにより、単一の `code` ステートを通じてコードエディタとキャンバスが常に同期される。

### 自動レイアウト

`utils/layout.ts` の `autoLayout()` はカーンのトポロジカルソートを実行し、左から右へレイヤーを割り当てる。`_needsPosition: true` のノード（DSL に `x`/`y` がないもの）のみ位置を決定する。`color` の `__RANDOM__` センチネルもここで解決される。

### svg-export のクロスモジュールインポート

`utils/svg-export.ts` は `components/ShapeNode.tsx` から `getShapePath` を、`components/EdgeLine.tsx` から `getEdgePoints` をインポートする。これらのシェイプ/ジオメトリ関数は再利用のためコンポーネントファイルからエクスポートされている。

## 主な制約

- **SSR なし**: `react-router.config.ts` に `ssr: false` が設定されている。純粋なクライアントサイド SPA。
- **インラインスタイルのみ**: `app.css` で Tailwind をインポートしているが、Tailwind クラスは使用しない。スタイルはすべて React のインライン `style={}` プロパティで記述する。
- **pnpm ストア**: `.pnpm-store/` はプロジェクトディレクトリ内（Docker ボリューム）に配置される。.gitignore に追加済み。
- **esbuild スクリプトのブロック**: pnpm セキュリティが esbuild のインストールスクリプトをブロックするが、Vite はプリビルドされたバイナリを使用するため開発・ビルドは正常に動作する。

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
