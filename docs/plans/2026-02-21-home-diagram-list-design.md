# ホームページをダイアグラム一覧に変更

**日付**: 2026-02-21
**ステータス**: 承認済み

## 概要

現在のホームページ（`/`）はダイアグラムエディタそのものを表示している。
これを以下のように変更する：

- `/` → ダイアグラム一覧ページ（新規）
- `/diagrams/new` → 新規ダイアグラムエディタ
- `/diagrams/:id` → 既存ダイアグラムエディタ（現home.tsxを移動）

## ルーティング設計

```ts
// routes.ts
export default [
  index("routes/home.tsx"),                    // 一覧ページ
  route("diagrams/new", "routes/diagram.tsx"), // 新規エディタ
  route("diagrams/:id", "routes/diagram.tsx"), // 既存エディタ
] satisfies RouteConfig;
```

## 一覧ページ（`routes/home.tsx` を書き換え）

- DiagramCraftヘッダー（ロゴ＋タイトル）
- 「+ 新規作成」ボタン → `/diagrams/new` へ遷移
- 保存済みダイアグラムをカードグリッドで表示
  - 名前・保存日時を表示
  - カードクリックで `/diagrams/{id}` へ遷移
  - 削除ボタン（`×`）
- 保存済みがない場合は空状態メッセージを表示

## エディタページ（`routes/diagram.tsx` として新規作成）

現在の `home.tsx` の内容を移動し、以下を変更：

- `useParams()` で `:id` を取得
- `id` が存在する場合 → localStorageからダイアグラムを読み込んでstateを初期化
- `new` ルートの場合 → デフォルトテンプレート（architecture）で開始
- 保存完了後 → `useNavigate` で `/diagrams/{id}` へリダイレクト（`/diagrams/new` の場合のみ）

## AppHeader の変更

- 「マイ作品」ドロップダウン → 削除（一覧ページが担当するため）
- 「← 一覧へ」ホームリンクを追加
- テンプレートボタン・保存ボタンはそのまま維持
- 不要になったprops (`savedDiagrams`, `currentDiagramId`, `onLoadSaved`, `onDeleteDiagram`) を削除

## ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `apps/web/app/routes.ts` | 変更 | ルート追加 |
| `apps/web/app/routes/home.tsx` | 書き換え | エディタ → 一覧ページ |
| `apps/web/app/routes/diagram.tsx` | 新規作成 | エディタページ（home.tsxから移動） |
| `apps/web/app/components/AppHeader.tsx` | 変更 | マイ作品削除、ホームリンク追加 |
