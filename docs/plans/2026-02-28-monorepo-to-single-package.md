# モノレポ廃止・単一パッケージ化 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** pnpm workspaceモノレポを廃止し、単一パッケージに統合する。packages/core, packages/react のソースを app/lib/ 配下に移動し、tsupビルドを廃止して Vite が直接TSソースを解決する構造にする。

**Architecture:** `app/lib/core/`（純TS、React非依存）と `app/lib/react/`（Reactコンポーネント・フック）をアプリケーションコード `app/` と同一パッケージ内に配置。importは `~/lib/core`, `~/lib/react` パスエイリアスで解決。E2Eテストはルート直下 `e2e/` に独立配置。

**Tech Stack:** React Router v7, Vite, TypeScript, Tailwind CSS v4, vitest, Playwright, pnpm (workspace不使用), Docker

---

## Task 1: ブランチ作成

**Step 1: フィーチャーブランチ作成**

```bash
git checkout -b refactor/single-package
```

**Step 2: 確認**

```bash
git branch --show-current
```

Expected: `refactor/single-package`

---

## Task 2: ファイル移動 — core ソースを app/lib/core/ へ

**Files:**
- Move: `packages/core/src/*` → `app/lib/core/`
- Move: `packages/core/src/__tests__/*` → `app/lib/core/__tests__/`
- Delete (後で): `packages/core/` 全体

**Step 1: ディレクトリ作成**

```bash
mkdir -p app/lib/core/__tests__
```

**Step 2: core ソースを移動**

`packages/core/src/` の中身（`__tests__/` 以外）を `app/lib/core/` へ:

```bash
# ソースファイル
cp packages/core/src/index.ts app/lib/core/
cp packages/core/src/types.ts app/lib/core/
cp packages/core/src/parser.ts app/lib/core/
cp packages/core/src/formatter.ts app/lib/core/
cp packages/core/src/layout.ts app/lib/core/
cp packages/core/src/colors.ts app/lib/core/
cp packages/core/src/geometry.ts app/lib/core/
cp packages/core/src/svg-export.ts app/lib/core/
cp packages/core/src/syntax.ts app/lib/core/
cp packages/core/src/autocomplete.ts app/lib/core/
cp packages/core/src/icon-list.ts app/lib/core/
cp packages/core/src/segments.ts app/lib/core/

# テスト
cp packages/core/src/__tests__/*.test.ts app/lib/core/__tests__/
```

**Step 3: core の index.ts の内部 import を修正**

`app/lib/core/index.ts` の `.js` 拡張子を削除（Viteはバンドラーモードで `.ts` を直接解決するため）:

Before:
```ts
export { parseProps, parseDSL } from "./parser.js";
```

After:
```ts
export { parseProps, parseDSL } from "./parser";
```

全ての `from "./xxx.js"` を `from "./xxx"` に書き換え。

対象ファイル（core内の相互import）:
- `app/lib/core/index.ts` — 全export行の `.js` 削除
- `app/lib/core/svg-export.ts` — `from "./geometry.js"` → `from "./geometry"`、`from "./types.js"` → `from "./types"`
- `app/lib/core/layout.ts` — 内部importの `.js` 削除
- `app/lib/core/parser.ts` — 同上
- `app/lib/core/formatter.ts` — 同上
- `app/lib/core/autocomplete.ts` — 同上
- `app/lib/core/geometry.ts` — 同上
- その他、`from "./xxx.js"` パターンがある全ファイル

**Step 4: 確認**

```bash
ls app/lib/core/
ls app/lib/core/__tests__/
```

---

## Task 3: ファイル移動 — react ソースを app/lib/react/ へ

**Files:**
- Move: `packages/react/src/*` → `app/lib/react/`
- Skip: `packages/react/src/hooks/useLocalDiagrams.ts` (デッドコード、apps/webに新版あり)
- Delete (後で): `packages/react/` 全体

**Step 1: ディレクトリ作成**

```bash
mkdir -p app/lib/react/components
mkdir -p app/lib/react/hooks
```

**Step 2: react ソースを移動**

```bash
# エントリーポイント
cp packages/react/src/index.ts app/lib/react/
cp packages/react/src/DiagramEditor.tsx app/lib/react/
cp packages/react/src/styles.ts app/lib/react/

# コンポーネント
cp packages/react/src/components/*.tsx app/lib/react/components/

# フック（useLocalDiagrams.ts を除外）
for f in packages/react/src/hooks/*.ts; do
  [ "$(basename "$f")" = "useLocalDiagrams.ts" ] && continue
  cp "$f" app/lib/react/hooks/
done

# sync系ヘルパー
cp packages/react/src/syncNodes.ts app/lib/react/
cp packages/react/src/syncGroups.ts app/lib/react/
cp packages/react/src/syncNotes.ts app/lib/react/
```

**Step 3: react 内の import パスを修正**

3a. `"diagram-dsl-core"` → `"~/lib/core"` に書き換え（全21ファイル）:

対象ファイル:
- `app/lib/react/index.ts`
- `app/lib/react/DiagramEditor.tsx`
- `app/lib/react/components/ShapeNode.tsx`
- `app/lib/react/components/EdgeLine.tsx`
- `app/lib/react/components/GroupBox.tsx`
- `app/lib/react/components/NoteBox.tsx`
- `app/lib/react/components/CodeEditor.tsx`
- `app/lib/react/components/Toolbar.tsx`
- `app/lib/react/components/AutocompleteDropdown.tsx`
- `app/lib/react/components/Minimap.tsx`
- `app/lib/react/components/NodeBottomSheet.tsx`
- `app/lib/react/components/SyntaxPanel.tsx`
- `app/lib/react/hooks/useDiagramState.ts`
- `app/lib/react/hooks/useNodeDrag.ts`
- `app/lib/react/hooks/useGroupDrag.ts`
- `app/lib/react/hooks/useEdgeDrag.ts`
- `app/lib/react/hooks/useCanvasInteraction.ts`
- `app/lib/react/hooks/useMultiSelect.ts`
- `app/lib/react/hooks/useEdgeCreation.ts`
- `app/lib/react/syncNodes.ts`
- `app/lib/react/syncGroups.ts`

3b. `.js` 拡張子の削除（react内の内部import）:

Before:
```ts
export { DiagramEditor } from "./DiagramEditor.js";
export { useDiagramState } from "./hooks/useDiagramState.js";
```

After:
```ts
export { DiagramEditor } from "./DiagramEditor";
export { useDiagramState } from "./hooks/useDiagramState";
```

対象: `app/lib/react/` 配下の全ファイルの相互import

**Step 4: 確認**

```bash
ls app/lib/react/
ls app/lib/react/components/
ls app/lib/react/hooks/
```

---

## Task 4: ファイル移動 — apps/web を app/ に統合

**Files:**
- Existing: `apps/web/app/*` → `app/` (core/reactの移動先と統合)

**Step 1: apps/web/app/ の中身を app/ にコピー**

`app/` には既に `lib/` がある。`apps/web/app/` のファイルをコピー:

```bash
# ルートファイル
cp apps/web/app/root.tsx app/
cp apps/web/app/routes.ts app/
cp apps/web/app/app.css app/

# ディレクトリ
cp -r apps/web/app/components/ app/components/
cp -r apps/web/app/data/ app/data/
cp -r apps/web/app/hooks/ app/hooks/
cp -r apps/web/app/routes/ app/routes/
```

**Step 2: .react-router ディレクトリ用の場所を確認**

React Router v7 が生成する `.react-router/` ディレクトリはルート直下に生成される（tsconfig.jsonの場所に依存）。

**Step 3: 設定ファイルをルートに移動**

```bash
cp apps/web/vite.config.ts vite.config.ts
cp apps/web/react-router.config.ts react-router.config.ts
```

**Step 4: app/ 内のファイルの import を修正**

`"diagram-dsl-react"` / `"diagram-dsl-core"` → `"~/lib/react"` / `"~/lib/core"`:

| ファイル | Before | After |
|---|---|---|
| `app/routes/diagram.tsx:3` | `from "diagram-dsl-react"` | `from "~/lib/react"` |
| `app/routes/home.tsx:5` | `from "diagram-dsl-react"` | `from "~/lib/react"` |
| `app/components/AppHeader.tsx:4` | `from "diagram-dsl-react"` | `from "~/lib/react"` |
| `app/hooks/useLocalDiagrams.ts:2` | `from "diagram-dsl-core"` | `from "~/lib/core"` |

**Step 5: vite.config.ts を修正**

`optimizeDeps.exclude` を削除（もはやworkspaceパッケージではないため不要）:

```ts
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
});
```

---

## Task 5: 設定ファイルの統合

**Files:**
- Create: `tsconfig.json` (ルート)
- Create: `vitest.config.ts` (ルート)
- Modify: `eslint.config.mjs` (ルート)

**Step 1: tsconfig.json をルートに作成**

旧 `tsconfig.base.json` の内容と旧 `apps/web/tsconfig.json` を統合:

```json
{
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noUncheckedSideEffectImports": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "types": ["node", "vite/client"],
    "rootDirs": [".", "./.react-router/types"],
    "baseUrl": ".",
    "paths": {
      "~/*": ["./app/*"]
    },
    "noEmit": true
  },
  "include": [
    "app/**/*",
    "**/.server/**/*",
    "**/.client/**/*",
    ".react-router/types/**/*"
  ],
  "exclude": ["node_modules", "build", "e2e"]
}
```

**Step 2: vitest.config.ts を作成**

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["app/**/*.test.ts"],
  },
});
```

**Step 3: テストファイル内のimportを修正**

`app/lib/core/__tests__/*.test.ts` の import パスを修正。
相対パス `from "../parser"` 等はそのままで動くはず（同じ相対位置関係を維持）。確認のみ。

**Step 4: eslint.config.mjs を更新**

ignores に `e2e/` を追加（既存の `dist/`, `build/` 等と同列）:

```js
{
  ignores: [
    "**/dist/**",
    "**/node_modules/**",
    "**/.react-router/**",
    "**/build/**",
    ".pnpm-store/**",
    "e2e/**",
  ],
},
```

---

## Task 6: package.json 統合

**Files:**
- Modify: `package.json` (ルート)
- Delete: `pnpm-workspace.yaml`
- Delete: `tsconfig.base.json`

**Step 1: ルートの package.json を書き換え**

旧 `apps/web/package.json` をベースに、旧 core の依存を追加し、workspaceスクリプトを直接コマンドに変更:

```json
{
  "name": "diagram-editor",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "react-router build",
    "dev": "react-router dev",
    "start": "react-router-serve ./build/server/index.js",
    "typecheck": "react-router typegen && tsc",
    "lint": "eslint app",
    "test": "vitest run",
    "preview": "HOST=0.0.0.0 PORT=4173 react-router-serve ./build/server/index.js",
    "e2e": "playwright test --config e2e/playwright.config.ts",
    "e2e:headed": "playwright test --config e2e/playwright.config.ts --headed",
    "e2e:ui": "playwright test --config e2e/playwright.config.ts --ui"
  },
  "dependencies": {
    "@dagrejs/dagre": "^2.0.4",
    "@react-router/node": "7.12.0",
    "@react-router/serve": "7.12.0",
    "@tailwindcss/vite": "^4.2.1",
    "@vercel/react-router": "^1.2.5",
    "isbot": "^5.1.31",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router": "7.12.0",
    "tailwindcss": "^4.2.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@playwright/test": "^1.50.0",
    "@react-router/dev": "7.12.0",
    "@types/node": "^22",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "eslint": "^9.0.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "globals": "^15.0.0",
    "typescript": "^5.9.2",
    "typescript-eslint": "^8.0.0",
    "vite": "^7.1.7",
    "vite-tsconfig-paths": "^5.1.4",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: pnpm-workspace.yaml を削除**

```bash
rm pnpm-workspace.yaml
```

**Step 3: tsconfig.base.json を削除**

```bash
rm tsconfig.base.json
```

---

## Task 7: E2E テスト移動

**Files:**
- Move: `packages/e2e/` → `e2e/`
- Modify: `e2e/playwright.config.ts`

**Step 1: e2e ディレクトリを移動**

```bash
cp -r packages/e2e/tests e2e/tests
cp -r packages/e2e/fixtures e2e/fixtures
cp packages/e2e/playwright.config.ts e2e/
cp packages/e2e/tsconfig.json e2e/
```

**Step 2: playwright.config.ts を修正**

webServer の `cwd` と `command` を更新:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    cwd: "..",
  },
});
```

**Step 3: docs を移動**

```bash
mkdir -p docs
cp packages/docs/dsl-syntax.md docs/
```

---

## Task 8: 旧ディレクトリの削除

**Step 1: 旧 packages/ と apps/ を削除**

```bash
rm -rf packages/core packages/react packages/e2e packages/docs
rmdir packages 2>/dev/null || true
rm -rf apps
```

**Step 2: 確認**

```bash
ls -la
# packages/, apps/ が存在しないことを確認
ls app/lib/core/index.ts app/lib/react/index.ts
# 移行先が存在することを確認
```

---

## Task 9: Docker・Makefile の更新

**Files:**
- Modify: `Dockerfile`
- Modify: `Makefile`

**Step 1: Dockerfile を更新**

```dockerfile
FROM node:22-slim

WORKDIR /app

COPY . .

RUN npm install -g pnpm

RUN pnpm install

RUN pnpm exec playwright install --with-deps chromium
```

変更点: `pnpm --filter diagram-dsl-e2e exec` → `pnpm exec`（単一パッケージ）

**Step 2: Makefile を更新**

`pnpm -r` / `pnpm --filter` 系を直接コマンドに変更:

```makefile
.PHONY: up down restart logs build typecheck lint test shell clean preview e2e e2e-headed e2e-ui e2e-install

docker-build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart app

logs:
	docker compose logs -f app

ps:
	docker compose ps

dev:
	docker compose exec app pnpm dev

build:
	docker compose exec app pnpm build

typecheck:
	docker compose exec app pnpm typecheck

lint:
	docker compose exec app pnpm lint

test:
	docker compose exec app pnpm test

app:
	docker compose exec app bash

preview:
	docker compose exec app pnpm preview

clean:
	docker compose down -v

e2e:
	docker compose exec app pnpm e2e

e2e-report:
	docker compose exec app pnpm exec playwright show-report

e2e-headed:
	docker compose exec app pnpm e2e:headed

e2e-ui:
	docker compose exec app pnpm e2e:ui

e2e-install:
	docker compose exec app pnpm exec playwright install --with-deps chromium
```

---

## Task 10: pnpm install + ビルド検証

**Step 1: node_modules を再インストール**

```bash
docker compose down -v
docker compose build
docker compose up -d
```

**Step 2: typecheckを実行**

```bash
docker compose exec app pnpm typecheck
```

Expected: エラーなし

**Step 3: lint を実行**

```bash
docker compose exec app pnpm lint
```

Expected: エラーなし

**Step 4: テストを実行**

```bash
docker compose exec app pnpm test
```

Expected: 全テストパス

**Step 5: ビルドを実行**

```bash
docker compose exec app pnpm build
```

Expected: ビルド成功

**Step 6: 開発サーバーで動作確認**

ブラウザで http://localhost:5173 にアクセスし、以下を確認:
- ホーム画面が表示される
- 新規作成でダイアグラムエディタが開く
- DSLコードの編集と図形の表示が正常
- ドラッグ操作が動作

---

## Task 11: CLAUDE.md の更新

**Files:**
- Modify: `.claude/CLAUDE.md`

新しいディレクトリ構造、コマンド、アーキテクチャに合わせて CLAUDE.md を更新する。
主な変更:
- モノレポ構造 → 単一パッケージ構造の記述に変更
- `pnpm -r` / `pnpm --filter` 系コマンドを直接コマンドに変更
- ファイルパスを新構造に更新
- tsup/ビルドステップの記述を削除
- `packages/` 変更時のビルド必須の注意書きを削除（直接importになるため不要）

---

## Task 12: コミット

**Step 1: 全変更をステージング**

```bash
git add -A
git status
```

**Step 2: コミット**

```bash
git commit -m "refactor: モノレポ廃止・単一パッケージ化

- packages/core, packages/react のソースを app/lib/ に移動
- tsupビルド廃止、Viteが直接TSソースを解決
- pnpm workspace廃止、単一package.jsonに統合
- vitest/eslint設定をルートに統合
- e2eテストをルート直下に移動
- Dockerfile/Makefile更新"
```
