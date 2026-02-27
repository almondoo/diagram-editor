# モノレポ廃止・単一パッケージ化 設計

## 背景

packagesはnpm公開しないため、モノレポ構造を廃止して単一パッケージに統合する。

## ディレクトリ構造

### Before

```
diagram-editor/
├── packages/
│   ├── core/src/          # diagram-dsl-core (tsup→dist/)
│   ├── react/src/         # diagram-dsl-react (tsup→dist/)
│   ├── e2e/               # Playwright
│   └── docs/              # dsl-syntax.md
├── apps/web/app/          # React Router SPA
├── pnpm-workspace.yaml
└── package.json           # ルート（scriptsの振り分けのみ）
```

### After

```
diagram-editor/
├── app/
│   ├── lib/
│   │   ├── core/          # 旧packages/core/src の中身
│   │   └── react/         # 旧packages/react/src の中身
│   ├── components/        # AppHeader, SaveModal
│   ├── data/              # templates.ts
│   ├── hooks/             # useLocalDiagrams.ts
│   ├── routes/            # home.tsx
│   └── app.css
├── e2e/                   # Playwright（ルート直下）
├── docs/                  # dsl-syntax.md
├── package.json           # 単一パッケージ（全依存を集約）
├── vite.config.ts
├── react-router.config.ts
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── docker-compose.yml
├── Makefile
└── Dockerfile
```

## 変更内容

### 1. ファイル移動

| From | To |
|---|---|
| `packages/core/src/*` | `app/lib/core/` |
| `packages/react/src/*` | `app/lib/react/` |
| `apps/web/app/*` | `app/` |
| `apps/web/vite.config.ts` | `vite.config.ts` |
| `apps/web/react-router.config.ts` | `react-router.config.ts` |
| `apps/web/tsconfig.json` | `tsconfig.json` |
| `packages/e2e/` | `e2e/` |
| `packages/docs/dsl-syntax.md` | `docs/dsl-syntax.md` |

### 2. Importパス変更

```ts
// Before
import { parseDSL } from "diagram-dsl-core";
import { DiagramEditor } from "diagram-dsl-react";

// After
import { parseDSL } from "~/lib/core";
import { DiagramEditor } from "~/lib/react";
```

tsconfigの `paths` で `~/*` → `./app/*` をマッピング。

### 3. 廃止するもの

- `pnpm-workspace.yaml`
- `packages/core/package.json`, `tsconfig.json`, `tsup.config.ts`
- `packages/react/package.json`, `tsconfig.json`, `tsup.config.ts`
- `apps/web/package.json` (ルートに統合)
- 各パッケージの `eslint.config.js`
- `tsup` 依存

### 4. package.json 統合

旧 `apps/web/package.json` をベースに:
- `@dagrejs/dagre` (旧core依存) を追加
- `vitest` (旧coreのdevDeps) を追加
- `tsup` を削除
- `workspace:*` 参照を全て削除

### 5. ビルド設定

- tsup廃止。Viteが直接 `app/lib/` のTSソースを解決
- `react-router build` のみで本番ビルド完了

### 6. テスト統合

ルートに `vitest.config.ts` を作成。テストファイルは `app/lib/core/` 配下に維持。

### 7. eslint統合

ルートの `eslint.config.js` 1つで全体カバー。

### 8. Docker / Makefile

- Dockerfile: `pnpm -r build` 不要（`react-router build` のみ）
- Makefile: `pnpm -r` / `pnpm --filter` 系を直接コマンドに変更
- docker-compose.yml: 変更なし

### 9. CLAUDE.md

プロジェクト構造の変更に合わせて更新。

## 移行戦略

一括移行。gitブランチで作業し、全変更を一度に適用する。
