# レスポンシブ対応（スマホ対応）実装計画

## 現状分析

### 問題点

| カテゴリ | 現状 | 影響 |
|---------|------|------|
| レイアウト | コードパネルとキャンバスが左右分割（`useSplitPane`で42%:58%） | スマホでは両パネルが極端に狭くなり使用不可 |
| タッチ操作 | ノード・グループ・ノートのドラッグが `MouseEvent` のみ | スマホでダイアグラムを編集できない |
| ピンチズーム | `useCanvasInteraction` に2本指ジェスチャー未実装 | スマホでズーム操作不可 |
| スプリットハンドル | `useSplitPane` が `mousemove`/`mouseup` のみ | タッチでパネル幅変更不可 |
| ツールバー | ボタンが32×28pxの固定サイズ | タッチターゲットが小さすぎる（推奨44px以上） |
| AppHeader | 全要素が横一列、折り返しなし | 狭い画面で要素が圧縮・はみ出し |
| SyntaxPanel | 幅420px固定の`position: absolute` | スマホ画面幅を超えてはみ出す |
| Minimap | 160×100px固定、右下に絶対配置 | スマホでは画面を圧迫 |
| ホバー効果 | `onMouseEnter`/`onMouseLeave`でスタイル変更 | タッチデバイスにはhoverがない |
| ホームページ | `padding: 40px 48px` 固定 | スマホで余白が大きすぎる |

### 良い点（活用できる既存実装）

- SVGベースのキャンバス（ズームに自然対応）
- 1本指タッチパンが既に実装済み（`useCanvasInteraction`）
- ツールバーに`flexWrap: wrap`が設定済み
- `touchAction: "none"`がキャンバスに設定済み
- ホームページのグリッドに`minmax(280px, 1fr)`が設定済み
- `SaveModal`に`minWidth: 320px`が設定済み

---

## ブレークポイント定義

```
モバイル:  幅 < 768px
タブレット: 768px <= 幅 < 1024px
デスクトップ: 幅 >= 1024px
```

インラインスタイルのみ使用するプロジェクトなので、CSS Media Queryではなく **`useViewport` カスタムフック** で JavaScript ベースのブレークポイント検出を行う。

---

## フェーズ1: 基盤 — ビューポート検出フック

### 1-1. `useViewport` フック新設

**配置先**: `packages/react/src/hooks/useViewport.ts`（ライブラリ）

```typescript
export function useViewport() {
  // window.innerWidth を監視し、ブレークポイントを返す
  // resize イベント + matchMedia でリアクティブに更新
  return { width, isMobile, isTablet, isDesktop };
}
```

- `isMobile`: 幅 < 768px
- `isTablet`: 768px <= 幅 < 1024px
- `isDesktop`: 幅 >= 1024px
- `resize` イベントは `requestAnimationFrame` でデバウンス
- SSR なし（クライアントSPA）なので `window` アクセスは安全

### 1-2. `<meta name="viewport">` 確認

**配置先**: `apps/web/app/root.tsx` または `index.html`

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

ブラウザのデフォルトピンチズームを抑制し、アプリ内ズームに統一する。

---

## フェーズ2: エディタレイアウトのレスポンシブ化

### 2-1. モバイルでのタブ切り替えUI

**変更対象**: `packages/react/src/DiagramEditor.tsx`

モバイル（幅 < 768px）では左右分割をやめて、**タブ切り替え**方式にする。

```
┌──────────────────────┐
│ [コード] [キャンバス] │  ← タブバー
├──────────────────────┤
│                      │
│   選択中のパネル      │  ← 全画面表示
│                      │
└──────────────────────┘
```

- デフォルトは「キャンバス」タブ（ダイアグラム閲覧が主目的）
- タブバーの高さ: 40px
- アクティブタブにアクセントカラー下線
- スプリットハンドルは非表示

**実装方針**:
- `DiagramEditor` 内で `useViewport` を呼び出し
- `isMobile` のとき `activeTab: "code" | "canvas"` state を管理
- コードパネルとキャンバスパネルの表示/非表示を切り替え
- デスクトップ時は既存の左右分割を維持

### 2-2. タブレットでの分割比率調整

**変更対象**: `packages/react/src/hooks/useSplitPane.ts`

- タブレット時のデフォルト分割を 35% に変更（コード少なめ）
- 分割の最小値を 25% に緩和

### 2-3. スプリットハンドルのタッチ対応

**変更対象**: `packages/react/src/hooks/useSplitPane.ts`

- `touchstart`/`touchmove`/`touchend` イベントリスナーを追加
- ハンドル幅をタッチ用に広げる（5px → タッチ判定領域20px、視覚的には5pxのまま）

---

## フェーズ3: タッチ操作対応

### 3-1. ノードドラッグのタッチ対応

**変更対象**: `packages/react/src/hooks/useNodeDrag.ts`

- `handleNodeMouseDown` に加えて `handleNodeTouchStart` を追加
- `touchmove`/`touchend` リスナーを `useEffect` 内で登録
- ドラッグ開始閾値を調整（タッチは指のブレが大きいため 5px に）
- `e.preventDefault()` でスクロール抑制

### 3-2. グループドラッグのタッチ対応

**変更対象**: `packages/react/src/hooks/useGroupDrag.ts`

- ノードドラッグと同様のタッチイベント対応
- `handleGroupMoveTouchStart` / `handleGroupResizeTouchStart`

### 3-3. ノートドラッグのタッチ対応

**変更対象**: `packages/react/src/DiagramEditor.tsx`（`handleNoteMouseDown` 周辺）

- `handleNoteTouchStart` を追加
- `touchmove`/`touchend` でノート位置を更新

### 3-4. ピンチズーム実装

**変更対象**: `packages/react/src/hooks/useCanvasInteraction.ts`

- 2本指タッチでピンチズーム
- `touches.length === 2` を検出
- 2点間距離の変化率をズーム倍率に変換
- ピンチ中心点を基準にズーム（UX向上）

```typescript
// 擬似コード
const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    // 2点間距離を記録（ピンチ開始）
    initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
    initialZoom = currentZoom;
  } else if (e.touches.length === 1) {
    // 既存のパン処理
  }
};

const onTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    const dist = getDistance(e.touches[0], e.touches[1]);
    const scale = dist / initialPinchDistance;
    setZoom(clamp(initialZoom * scale, 0.2, 3));
  }
};
```

### 3-5. SVGコンポーネントへのタッチイベント伝搬

**変更対象**: `packages/react/src/components/ShapeNode.tsx`, `GroupBox.tsx`, `NoteBox.tsx`

- 各SVG要素に `onTouchStart` ハンドラを追加
- `onMouseDown` と `onTouchStart` を統合するか、並行して処理

---

## フェーズ4: コンポーネントのレスポンシブ化

### 4-1. AppHeader のレスポンシブ化

**変更対象**: `apps/web/app/components/AppHeader.tsx`

**モバイル対応**:
- 「DiagramCraft」テキストと「Code → Diagram」バッジを非表示
- ロゴアイコンのみ表示
- テンプレートドロップダウン、保存ボタン、ダイアグラム名を維持
- ダイアグラム名の `maxWidth` を縮小（240px → 120px）
- ヘッダーの `padding` を縮小（`0 20px` → `0 12px`）

### 4-2. ツールバーのレスポンシブ化

**変更対象**: `packages/react/src/components/Toolbar.tsx`

**モバイル対応**:
- ボタンサイズ拡大: 32×28px → 44×40px（タッチ推奨サイズ）
- gap拡大: 3px → 6px
- 「追加」ラベルを非表示
- 「自動配置」テキストを短縮（アイコンのみ）
- SVG出力ボタンのテキストを短縮

**タブレット対応**:
- ボタンサイズ: 36×32px

### 4-3. SyntaxPanel のレスポンシブ化

**変更対象**: `packages/react/src/components/SyntaxPanel.tsx`

**モバイル対応**:
- `position: absolute` → フルスクリーンオーバーレイ（`position: fixed`, `inset: 0`）
- 閉じるボタンを目立たせる
- `width: 420px` → `width: 100%`
- スクロール可能な全画面パネルに

**タブレット対応**:
- `width: min(420px, calc(100vw - 40px))`

### 4-4. Minimap のレスポンシブ化

**変更対象**: `packages/react/src/components/Minimap.tsx`

**モバイル対応**:
- 非表示にする（画面が小さいため表示の意味がない）

**タブレット対応**:
- サイズ縮小: 160×100px → 120×75px

### 4-5. CodeEditor のモバイル最適化

**変更対象**: `packages/react/src/components/CodeEditor.tsx`

- フォントサイズを 16px 以上に（iOS Safari でフォーカス時の自動ズーム防止）
- padding 調整（`12px 16px` → `12px 12px`）
- 行番号欄を縮小（44px → 36px）

### 4-6. SaveModal のレスポンシブ化

**変更対象**: `apps/web/app/components/SaveModal.tsx`

- `maxWidth: calc(100vw - 32px)` を追加
- モバイルで余白を確保

### 4-7. ズーム表示（左下バッジ）

**変更対象**: `packages/react/src/DiagramEditor.tsx`

- モバイルでは非表示またはサイズ縮小

---

## フェーズ5: ホームページのレスポンシブ化

### 5-1. ホームページレイアウト

**変更対象**: `apps/web/app/routes/home.tsx`

- `padding: 40px 48px` → モバイルで `20px 16px`
- タイトル行: モバイルで `flexDirection: column` にし、ボタンを下に配置
- カードグリッド: `minmax(280px, 1fr)` は維持（280px未満の画面では1列になる）
- カードの `padding` を縮小

### 5-2. ホームヘッダー

- AppHeader と同様の調整（テキスト非表示、パディング縮小）

---

## フェーズ6: hover → active 状態の変換

### 6-1. ホバー効果のタッチ対応

**変更対象**: 全コンポーネントの `onMouseEnter`/`onMouseLeave`

以下の方針で統一:
- `onMouseEnter`/`onMouseLeave` はデスクトップ専用として維持
- タッチデバイスでは CSS `:active` 擬似クラスで代替
- `DIAGRAM_EDITOR_STYLES`（`styles.ts`）にグローバルな `:active` スタイルを追加

```css
/* styles.ts に追加 */
@media (hover: none) {
  .tb-btn:active {
    background: #2d3548 !important;
    color: #e2e8f0 !important;
  }
}
```

ツールバーボタン等にクラス名を付与し、CSSで `:active` を処理する。
これにより、タッチデバイスでタップ時にフィードバックが表示される。

---

## 変更ファイル一覧

### 新規作成

| ファイル | 説明 |
|---------|------|
| `packages/react/src/hooks/useViewport.ts` | ビューポート検出フック |

### 変更（packages/react — ライブラリ）

| ファイル | 変更内容 |
|---------|---------|
| `DiagramEditor.tsx` | モバイルタブUI、ノートタッチドラッグ、レスポンシブ分岐 |
| `hooks/useSplitPane.ts` | タッチイベント対応、タブレットデフォルト比率 |
| `hooks/useNodeDrag.ts` | タッチイベント対応 |
| `hooks/useGroupDrag.ts` | タッチイベント対応 |
| `hooks/useCanvasInteraction.ts` | ピンチズーム実装 |
| `components/Toolbar.tsx` | タッチターゲット拡大、レスポンシブ表示 |
| `components/CodeEditor.tsx` | フォントサイズ調整（iOS対策） |
| `components/SyntaxPanel.tsx` | モバイルフルスクリーン化 |
| `components/Minimap.tsx` | モバイル非表示 |
| `components/ShapeNode.tsx` | `onTouchStart` 追加 |
| `components/GroupBox.tsx` | `onTouchStart` 追加 |
| `components/NoteBox.tsx` | `onTouchStart` 追加 |
| `styles.ts` | `:active` スタイル、タッチ用CSS追加 |

### 変更（apps/web — アプリ）

| ファイル | 変更内容 |
|---------|---------|
| `app/components/AppHeader.tsx` | モバイルレイアウト |
| `app/components/SaveModal.tsx` | maxWidth追加 |
| `app/routes/home.tsx` | パディング・レイアウト調整 |
| `index.html` または `app/root.tsx` | viewport meta確認・修正 |

---

## 実装順序

```
フェーズ1 (基盤)
  └─ 1-1 useViewport フック
  └─ 1-2 viewport meta 確認
      ↓
フェーズ2 (レイアウト)
  └─ 2-1 モバイルタブUI
  └─ 2-2 タブレット分割比率
  └─ 2-3 スプリットハンドルタッチ対応
      ↓
フェーズ3 (タッチ操作)
  └─ 3-1 ノードドラッグ
  └─ 3-2 グループドラッグ
  └─ 3-3 ノートドラッグ
  └─ 3-4 ピンチズーム
  └─ 3-5 SVGコンポーネント連携
      ↓
フェーズ4 (コンポーネント)
  └─ 4-1 AppHeader
  └─ 4-2 Toolbar
  └─ 4-3 SyntaxPanel
  └─ 4-4 Minimap
  └─ 4-5 CodeEditor
  └─ 4-6 SaveModal
  └─ 4-7 ズーム表示
      ↓
フェーズ5 (ホームページ)
  └─ 5-1 レイアウト
  └─ 5-2 ヘッダー
      ↓
フェーズ6 (hover → active)
  └─ 6-1 全コンポーネント
```

各フェーズの完了後に `typecheck` / `lint` / `build` を実行して品質を確認する。

---

## 責務分離の遵守

- `useViewport` はライブラリ（`packages/react`）に配置 → 他のアプリでも使い回せる
- タブUI、タッチドラッグ、ピンチズームはライブラリ（`packages/react`）に配置
- AppHeader、ホームページの調整はアプリ（`apps/web`）に配置
- `packages/core` には変更なし（UIに依存しない純粋TypeScript層）

## 制約の遵守

- **インラインスタイルのみ**: Tailwindクラスは一切使用しない。CSSが必要な場合は `styles.ts` の `DIAGRAM_EDITOR_STYLES` 文字列に追加
- **Docker内実行**: すべてのコマンドは `docker compose exec app` 経由
- **ビルド必須**: `packages/core` / `packages/react` を変更した場合は必ず `pnpm -r build`
