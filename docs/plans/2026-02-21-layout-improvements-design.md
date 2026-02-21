# Layout Improvements Design

**Goal:** Improve fit-view, auto-layout (dagre), group auto-fit, and DSL group membership change handling.

**Architecture:** Four independent but related improvements to `useCanvasInteraction`, `layout.ts`, `useDiagramState`, and `syncNodes`. All changes stay within the existing data-flow pattern (code → parseDSL → autoLayout → render).

**Tech Stack:** dagre (`@dagrejs/dagre`) added to `packages/core`

---

## Feature 1: Fit View — コンテンツに合わせた全体表示

`useCanvasInteraction.fitView` を引数なし固定リセットから、`nodes` と `groups` を受け取るコンテンツ依存計算に変更する。

```
padding = 40px
bbox = union of all node rects (x,y,x+w,y+h) and group rects
zoomX = (svgWidth - 2*padding) / bboxWidth
zoomY = (svgHeight - 2*padding) / bboxHeight
newZoom = clamp(min(zoomX, zoomY), 0.2, 3)
panX = padding - bbox.minX * newZoom
panY = padding - bbox.minY * newZoom
```

`DiagramEditor` で `fitView(parsed.nodes, parsed.groups)` を渡すよう更新。SVG の実サイズは `svgRef.current.getBoundingClientRect()` で取得。

---

## Feature 2: dagre による自動配置

`packages/core` に `@dagrejs/dagre` を追加。`layout.ts` の `autoLayout` を刷新：

1. **グループ内ノード**: 各グループのノードのみで dagre グラフを構成し、グループローカル座標でレイアウト。グループのパディング・ラベル高さを考慮したオフセットを加算。
2. **フリーノード**: 全フリーノードと関連エッジで dagre グラフを構成。`rankdir: "LR"` (左→右)。グループ全体の下端 + 余白を `marginY` として渡す。
3. dagre は `_needsPosition: true` のノードのみ位置付け（既存ポジションは保持）。

---

## Feature 3: グループ自動フィット

`autoLayout` がノードを配置した後、各グループのメンバーノードのバウンディングボックスを計算してグループ境界を更新する。

```
return type: { nodes: DiagramNode[], groupUpdates: Record<string, DiagramGroup> }
```

`useDiagramState` の `useEffect(displayNodes)` でこの `groupUpdates` を `groupStates` に適用する（_needsPosition ノードが存在した場合のみ）。

---

## Feature 4: DSL group 変更 → ノード自動移動

`syncNodes.ts` で既存ノードの `group` プロパティが変わった場合に `_needsPosition: true` をセットする。

```ts
if ('group' in updates && updates.group !== prev.group) {
  updates._needsPosition = true;
}
```

これにより DSL 編集で `group=X` を変えると次の autoLayout サイクルでノードが新グループ内に移動し、Feature 3 によってグループ境界も自動調整される。
