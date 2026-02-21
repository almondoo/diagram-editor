# 設計書: パン操作 DOM直接操作チューニング

## 日付
2026-02-21

## 問題

トラックパッド2本指スクロールによるパン操作で、`setPan()`（React state）が呼ばれるたびに `DiagramEditor` 全体が再レンダリングされる。ホイールイベントは1回のスクロールで数十〜百回以上発火するため、フレームレートが React のレンダリングサイクルに制限されてしまい、引っかかりを感じる。

### 現状のデータフロー

```
wheelイベント
  → setPan() → React state更新
  → DiagramEditor全体 再レンダリング
  → <g transform> + <pattern patternTransform> 再計算
  → ブラウザ描画
```

## 解決策: DOM直接操作

`pan` を React state から `useRef` に変換し、ホイール/タッチイベントで SVG 要素の transform 属性を直接 DOM 操作する。React の再レンダリングサイクルを完全にバイパスする。

### 変更後のデータフロー

```
wheelイベント
  → panRef.current 更新
  → svgGroupRef.setAttribute('transform', ...)     } 直接DOM操作
  → gridRef.setAttribute('patternTransform', ...)  } React再レンダリングなし
  → gridLargeRef.setAttribute('patternTransform', ...)}
  → ブラウザ描画
```

## 変更ファイル

### 1. `packages/react/src/hooks/useCanvasInteraction.ts`

#### 変更内容

- `const [pan, setPan] = useState({ x: 0, y: 0 })` を削除
- `const panRef = useRef({ x: 0, y: 0 })` に置き換え
- `const zoomRef = useRef(zoom); zoomRef.current = zoom;` を追加（applyPanDirect 内で最新の zoom を参照するため）
- パラメータに `svgGroupRef`, `gridRef`, `gridLargeRef` を追加
- `applyPanDirect(x, y)` 関数を追加:

```ts
const applyPanDirect = (x: number, y: number) => {
  panRef.current = { x, y };
  const t = `translate(${x},${y}) scale(${zoomRef.current})`;
  svgGroupRef.current?.setAttribute('transform', t);
  gridRef.current?.setAttribute('patternTransform', t);
  gridLargeRef.current?.setAttribute('patternTransform', t);
};
```

- wheel ハンドラ: `setPan((p) => ...)` → `applyPanDirect(panRef.current.x - e.deltaX, panRef.current.y - e.deltaY)`
- touch ハンドラ: `setPan(...)` → `applyPanDirect(...)` に変更。touchstart 時は `panRef.current` から初期値を読む
- Space+マウスドラッグ: `setPanStart` / `setPan` → ref ベースに変更。move ハンドラで `applyPanDirect` を呼ぶ
- `fitView`: `setPan(...)` → `applyPanDirect(...)` → `setZoom(newZoom)` の順で呼ぶ
- 返り値: `pan` を削除し `panRef` を返す

### 2. `packages/react/src/DiagramEditor.tsx`

#### 変更内容

- `svgGroupRef: React.RefObject<SVGGElement | null>` を新規作成
- `gridRef: React.RefObject<SVGPatternElement | null>` を新規作成
- `gridLargeRef: React.RefObject<SVGPatternElement | null>` を新規作成
- `useCanvasInteraction(svgRef, svgGroupRef, gridRef, gridLargeRef)` に渡す
- `const { zoom, panRef, ... } = useCanvasInteraction(...)` で `panRef` を受け取る
- SVG要素への ref 付与と transform:

```tsx
<pattern
  id="grid"
  ref={gridRef}
  patternTransform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}
  ...
>
<pattern
  id="gridLarge"
  ref={gridLargeRef}
  patternTransform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}
  ...
>
<g
  ref={svgGroupRef}
  transform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}
>
```

- `selectionRect` mousemove 計算: `pan.x/y` → `panRef.current.x/y`
- `startSelectionRect` 呼び出し: `pan.x/y` → `panRef.current.x/y`
- `handleCanvasMouseDown` の `setPanStart`: `pan.x/y` → `panRef.current.x/y`
- `<Minimap viewBox>`:

```tsx
viewBox={{ x: -panRef.current.x / zoom, y: -panRef.current.y / zoom, w: canvasW / zoom, h: canvasH / zoom }}
```

## React再レンダリング時の整合性

JSX の transform 値を `panRef.current.x/y` で記述しておくことで、ノード選択などで React が再レンダリングした際も正しい transform 値が DOM に設定される。`panRef.current` は常に最新の pan 位置を持つため、stale な値が使われることはない。

## ミニマップについて

`pan` が ref になるとミニマップはパン中に更新されない。しかしパン終了後や他の操作（ズーム変更、ノード追加など）が発生した際に正しい値に同期される。ミニマップはセカンダリ UI であり、このわずかな遅延は許容範囲内とする。

## 期待効果

パン操作（2本指スクロール）中の React 再レンダリングがゼロになり、ブラウザのネイティブ描画速度でスムーズにパンできる。`zoom` は引き続き React state として保持するが、ズーム操作は頻度が低くパン性能に影響しない。

## 変更対象外

- `useNodeDrag.ts`: `pan` を参照していないため変更不要
- `useGroupDrag.ts`: `pan` を参照していないため変更不要
- `packages/core/`: 変更なし
