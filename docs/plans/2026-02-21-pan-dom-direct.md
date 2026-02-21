# Pan DOM直接操作チューニング 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** トラックパッド2本指スクロールによるパン操作を、React の再レンダリングを完全にバイパスして DOM 直接操作で実装し、スクロールの引っかかりを解消する。

**Architecture:** `pan` を React state から `useRef` に変換し、wheel/touch イベントで SVG 要素の `transform` 属性を `setAttribute` で直接更新する。React が再レンダリングする際（ズーム変更、ノード選択など）は JSX が `panRef.current` を読んで正しい値を設定する。

**Tech Stack:** React 18, TypeScript, SVG DOM API (`setAttribute`)

---

### Task 1: `useCanvasInteraction.ts` の改修

**Files:**
- Modify: `packages/react/src/hooks/useCanvasInteraction.ts`

このファイルは `pan` state をなくし、SVG 要素への ref を受け取って直接 DOM 操作するように変更する。

**Step 1: 関数シグネチャを変更する**

`useCanvasInteraction` の引数に3つの ref を追加する。

```ts
export function useCanvasInteraction(
  svgRef: React.RefObject<SVGSVGElement | null>,
  svgGroupRef: React.RefObject<SVGGElement | null>,
  gridRef: React.RefObject<SVGPatternElement | null>,
  gridLargeRef: React.RefObject<SVGPatternElement | null>,
) {
```

**Step 2: `pan` state を ref に置き換え、`zoomRef` を追加する**

ファイル先頭の state 宣言を以下のように変更する:

```ts
  const [zoom, setZoom] = useState(1);
  // [pan state を削除]
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // panStart も ref に変換（Spaceドラッグ用）
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
```

古い `const panRef = useRef(pan); panRef.current = pan;` の行も削除する。

**Step 3: `applyPanDirect` 関数を追加する**

`useEffect` の前に追加する:

```ts
  const applyPanDirect = useCallback((x: number, y: number) => {
    panRef.current = { x, y };
    const t = `translate(${x},${y}) scale(${zoomRef.current})`;
    svgGroupRef.current?.setAttribute("transform", t);
    gridRef.current?.setAttribute("patternTransform", t);
    gridLargeRef.current?.setAttribute("patternTransform", t);
  }, [svgGroupRef, gridRef, gridLargeRef]);
```

**Step 4: wheel ハンドラを更新する**

`onWheel` 内の `setPan` を `applyPanDirect` に変更する:

```ts
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setZoom((z) => Math.max(0.2, Math.min(3, z - e.deltaY * 0.005)));
      } else {
        applyPanDirect(
          panRef.current.x - e.deltaX,
          panRef.current.y - e.deltaY,
        );
      }
    };
```

**Step 5: タッチハンドラを更新する**

`onTouchStart` と `onTouchMove` を更新する:

```ts
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        // panRef から現在値を読む（state ではなくなったため）
        touchStartPanX = panRef.current.x;
        touchStartPanY = panRef.current.y;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        applyPanDirect(touchStartPanX + dx, touchStartPanY + dy);
      }
    };
```

**Step 6: `useEffect` の依存配列に `applyPanDirect` を追加する**

wheel/touch を登録する `useEffect` の依存配列:

```ts
  }, [svgRef, applyPanDirect]);
```

**Step 7: `handleCanvasMouseDown` を更新する**

`pan` を直接参照していた箇所を `panRef.current` に変更し、`setPanStart` を `panStartRef` に変更する:

```ts
  const handleCanvasMouseDown = (e: React.MouseEvent, onDeselect: () => void) => {
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.getAttribute("data-bg")) {
      onDeselect();
      if (isSpaceHeld) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      }
    }
  };
```

**Step 8: Space+ドラッグの `useEffect` を更新する**

`isPanning` の `useEffect` から `panStart` state 依存を除去し、ref を使うように変更する:

```ts
  useEffect(() => {
    if (!isPanning) return;
    const move = (e: MouseEvent) => {
      if (!panStartRef.current) return;
      applyPanDirect(
        e.clientX - panStartRef.current.x,
        e.clientY - panStartRef.current.y,
      );
    };
    const up = () => {
      setIsPanning(false);
      panStartRef.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [isPanning, applyPanDirect]);
```

**Step 9: `fitView` を更新する**

`setPan(...)` を `applyPanDirect(...)` に変更する（2箇所）:

```ts
      if (rects.length === 0) {
        setZoom(1);
        applyPanDirect(0, 0);
        return;
      }
      // ... (計算処理はそのまま) ...
      if (contentW <= 0 || contentH <= 0) {
        setZoom(1);
        applyPanDirect(0, 0);
        return;
      }
      // ... (計算処理はそのまま) ...
      applyPanDirect(
        pad - minX * newZoom + (svgW - pad * 2 - contentW * newZoom) / 2,
        pad - minY * newZoom + (svgH - pad * 2 - contentH * newZoom) / 2,
      );
      setZoom(newZoom);
```

**Step 10: 返り値を更新する**

`pan` を削除し `panRef` を追加する:

```ts
  return { zoom, panRef, isPanning, isSpaceHeld, handleCanvasMouseDown, zoomIn, zoomOut, fitView };
```

また、`[pan, setPanStart]` の state 宣言 (`useState`) を削除する。ファイル先頭の import も整理する（`useState` から `pan`, `panStart` 関連の state が不要になったことを確認）。

**Step 11: 型チェック**

```bash
docker compose exec app pnpm --filter diagram-dsl-react typecheck
```

Expected: エラーがあっても `DiagramEditor.tsx` 側の未対応エラーのみ（次の Task で修正する）

---

### Task 2: `DiagramEditor.tsx` の改修

**Files:**
- Modify: `packages/react/src/DiagramEditor.tsx`

**Step 1: 新しい ref を追加する**

`svgRef` の直下に3つの ref を追加する:

```ts
  const svgRef = useRef<SVGSVGElement>(null);
  const svgGroupRef = useRef<SVGGElement>(null);
  const gridRef = useRef<SVGPatternElement>(null);
  const gridLargeRef = useRef<SVGPatternElement>(null);
```

**Step 2: `useCanvasInteraction` の呼び出しを更新する**

```ts
  const { zoom, panRef, isPanning, isSpaceHeld, handleCanvasMouseDown, zoomIn, zoomOut, fitView } =
    useCanvasInteraction(svgRef, svgGroupRef, gridRef, gridLargeRef);
```

**Step 3: `selectionRect` の mousemove ハンドラを更新する**

`useEffect` 内の `pan.x/y` を `panRef.current.x/y` に変更する:

```ts
    const handleMove = (e: MouseEvent) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - panRef.current.x) / zoom;
      const canvasY = (e.clientY - rect.top - panRef.current.y) / zoom;
      updateSelectionRect(canvasX, canvasY);
    };
```

依存配列から `pan` を削除し、`panRef` を追加する（ref は依存配列不要なので削除のみ）:

```ts
  }, [selectionRect, zoom, updateSelectionRect, endSelectionRect]);
```

**Step 4: `onMouseDown` ハンドラ内を更新する**

`pan.x/y` → `panRef.current.x/y` に変更する:

```tsx
            onMouseDown={(e) => {
              const target = e.target as SVGElement;
              if (target === svgRef.current || target.getAttribute("data-bg")) {
                clearSelection();
                handleCanvasMouseDown(e, () => {});
                if (!isSpaceHeld) {
                  const svgEl = svgRef.current;
                  if (!svgEl) return;
                  const rect = svgEl.getBoundingClientRect();
                  const canvasX = (e.clientX - rect.left - panRef.current.x) / zoom;
                  const canvasY = (e.clientY - rect.top - panRef.current.y) / zoom;
                  startSelectionRect(canvasX, canvasY);
                }
              }
            }}
```

**Step 5: `<pattern id="grid">` に ref と正しい patternTransform を付与する**

```tsx
                <pattern
                  id="grid"
                  ref={gridRef}
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}
                >
```

**Step 6: `<pattern id="gridLarge">` に ref と正しい patternTransform を付与する**

```tsx
                <pattern
                  id="gridLarge"
                  ref={gridLargeRef}
                  width="120"
                  height="120"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}
                >
```

**Step 7: `<g>` に ref と正しい transform を付与する**

```tsx
              <g ref={svgGroupRef} transform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}>
```

`selectionRect` の `<g>` も同様に更新する:

```tsx
              {selectionRect && (
                <g transform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}>
```

**Step 8: `<Minimap>` の viewBox を更新する**

```tsx
            <Minimap
              nodes={parsed.nodes}
              viewBox={{ x: -panRef.current.x / zoom, y: -panRef.current.y / zoom, w: canvasW / zoom, h: canvasH / zoom }}
              canvasW={canvasW}
              canvasH={canvasH}
            />
```

**Step 9: 型チェックでエラーがないことを確認する**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

---

### Task 3: ビルドと動作確認

**Step 1: react パッケージをビルドする**

```bash
docker compose exec app pnpm --filter diagram-dsl-react build
```

Expected: ビルド成功

**Step 2: lint チェック**

```bash
docker compose exec app pnpm -r lint
```

Expected: エラーなし（`panRef` の依存配列の扱いについて ESLint の react-hooks/exhaustive-deps 警告が出る可能性があるが、ref は安定した参照のため意図的）

**Step 3: ブラウザで動作確認**

http://localhost:5173 を開き、以下を確認:

1. **パン操作**: トラックパッド2本指スクロールでダイアグラムが滑らかに動く（引っかかりが解消されている）
2. **ズーム操作**: Ctrl+スクロールまたはピンチでズームが正常に動作する
3. **フィットビュー**: ツールバーの「全体表示」ボタンで正しい位置に戻る
4. **ノードドラッグ**: ノードをドラッグして移動できる
5. **Space+ドラッグ**: Space キーを押しながらマウスドラッグでパンできる
6. **選択矩形**: 空白をドラッグして選択矩形が正常に表示される
7. **ミニマップ**: ズーム変更時にミニマップの表示範囲が更新される

**Step 4: コミット**

```bash
git add packages/react/src/hooks/useCanvasInteraction.ts packages/react/src/DiagramEditor.tsx
git commit -m "perf: bypass React re-render for pan via direct DOM manipulation"
```
