# Layout Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fit-view がコンテンツに合わせてズームし、dagre による高品質な自動配置を実装し、グループが常にノードを包含するよう自動フィットし、DSL でのグループ変更時に自動でノードを移動させる。

**Architecture:** `packages/core/src/layout.ts` に dagre を導入して `autoLayout` の返り値を `{ nodes, groupUpdates }` に変更。`useDiagramState` がグループ更新を適用。`syncNodes` がグループ変更を検出して `_needsPosition: true` をセット。`useCanvasInteraction.fitView` がコンテンツのバウンディングボックスからズーム・パンを計算。

**Tech Stack:** `@dagrejs/dagre`（ESM 対応版 dagre）、vitest（テスト）、TypeScript

---

## Task 1: dagre インストールと型確認

**Files:**
- Modify: `packages/core/package.json`

**Step 1: dagre をインストール**

```bash
docker compose exec app pnpm --filter diagram-dsl-core add @dagrejs/dagre
```

Expected: `packages/core/package.json` の `dependencies` に `@dagrejs/dagre` が追加される。

**Step 2: TypeScript から import できることを確認**

`packages/core/src/layout.ts` の先頭に一時的に追加してタイプチェック:

```bash
# layout.ts の先頭に追加してtypecheckが通るか確認
docker compose exec app pnpm --filter diagram-dsl-core typecheck
```

Expected: エラーなし（dagre の型定義が含まれている）

**Step 3: コミット**

```bash
git add packages/core/package.json pnpm-lock.yaml
git commit -m "feat: add @dagrejs/dagre dependency to core package"
```

---

## Task 2: `autoLayout` の返り値変更 + テスト更新

**Files:**
- Modify: `packages/core/src/layout.ts`
- Modify: `packages/core/src/__tests__/layout.test.ts`

**Step 1: テストを先に更新（返り値 `{ nodes, groupUpdates }` を期待するよう変更）**

`packages/core/src/__tests__/layout.test.ts` を以下に書き換える:

```ts
import { describe, it, expect } from "vitest";
import { autoLayout } from "../layout.js";
import type { DiagramNode, DiagramEdge, DiagramGroup } from "../types.js";

function makeNode(id: string, needsPos = true, group = ""): DiagramNode {
  return {
    id,
    label: id,
    shape: "rect",
    color: "#6366f1",
    textColor: "#ffffff",
    x: needsPos ? NaN : 100,
    y: needsPos ? NaN : 100,
    w: 150,
    h: 60,
    icon: "",
    group,
    fontSize: 13,
    borderColor: "",
    borderWidth: 2,
    opacity: 1,
    dashed: false,
    _needsPosition: needsPos,
  };
}

function makeGroup(id: string, x = 0, y = 0, w = 300, h = 200): DiagramGroup {
  return { id, label: id, x, y, w, h, color: "#6366f1" };
}

const EDGE = (from: string, to: string): DiagramEdge => ({
  from, to, label: "", color: "#fff", style: "solid",
  animate: false, thickness: 1.5, arrow: "end", curve: "smooth",
});

describe("autoLayout", () => {
  it("ノードが空の場合は nodes:[] groupUpdates:{} を返す", () => {
    const result = autoLayout([], []);
    expect(result.nodes).toEqual([]);
    expect(result.groupUpdates).toEqual({});
  });

  it("__RANDOM__カラーを解決する", () => {
    const nodes = [{ ...makeNode("a"), color: "__RANDOM__" }];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0].color).not.toBe("__RANDOM__");
    expect(result[0].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("位置なしノードに座標を割り当てる", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0].x).not.toBeNaN();
    expect(result[0].y).not.toBeNaN();
    expect(result[1].x).not.toBeNaN();
    expect(result[1].y).not.toBeNaN();
  });

  it("_needsPositionが削除される", () => {
    const nodes = [makeNode("a")];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0]._needsPosition).toBeUndefined();
  });

  it("位置があるノードは変更しない", () => {
    const nodes = [makeNode("a", false)];
    const { nodes: result } = autoLayout(nodes, []);
    expect(result[0].x).toBe(100);
    expect(result[0].y).toBe(100);
  });

  it("エッジに基づいてレイヤーを割り当てる (a < b < c)", () => {
    const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
    const edges = [EDGE("a", "b"), EDGE("b", "c")];
    const { nodes: result } = autoLayout(nodes, edges);
    const byId = Object.fromEntries(result.map(n => [n.id, n]));
    expect(byId.a.x).toBeLessThan(byId.b.x);
    expect(byId.b.x).toBeLessThan(byId.c.x);
  });

  it("循環グラフでクラッシュしない", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [EDGE("a", "b"), EDGE("b", "a")];
    expect(() => autoLayout(nodes, edges)).not.toThrow();
  });

  it("グループ内ノードはグループ枠内に配置される", () => {
    const group = makeGroup("g1", 10, 10, 400, 300);
    const nodes = [makeNode("a", true, "g1"), makeNode("b", true, "g1")];
    const { nodes: result, groupUpdates } = autoLayout(nodes, [], [group]);
    // グループ更新が返される
    expect(groupUpdates["g1"]).toBeDefined();
    // groupUpdates の幅・高さは正の値
    expect(groupUpdates["g1"].w).toBeGreaterThan(0);
    expect(groupUpdates["g1"].h).toBeGreaterThan(0);
  });

  it("グループ自動フィット: groupUpdates のサイズが全ノードを含む", () => {
    const group = makeGroup("g1", 0, 0, 400, 300);
    const nodes = [makeNode("a", true, "g1"), makeNode("b", true, "g1")];
    const { nodes: result, groupUpdates } = autoLayout(nodes, [], [group]);
    const g = groupUpdates["g1"];
    // 全メンバーノードが groupUpdates の枠内に入っている
    for (const n of result.filter(n => n.group === "g1")) {
      expect(n.x).toBeGreaterThanOrEqual(g.x);
      expect(n.y).toBeGreaterThanOrEqual(g.y);
      expect(n.x + n.w).toBeLessThanOrEqual(g.x + g.w + 1); // 1px 余裕
      expect(n.y + n.h).toBeLessThanOrEqual(g.y + g.h + 1);
    }
  });
});
```

**Step 2: テストが失敗することを確認**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: FAIL（`autoLayout` がまだ `DiagramNode[]` を返している）

**Step 3: `layout.ts` を dagre ベースに書き換える**

`packages/core/src/layout.ts` を以下に置き換える:

```ts
import dagre from "@dagrejs/dagre";
import type { DiagramNode, DiagramEdge, DiagramGroup } from "./types.js";
import { randomColor } from "./colors.js";

const LABEL_HEIGHT = 26; // グループラベルの高さ
const PADDING = 12;      // グループ内パディング
const NODE_SEP = 40;     // dagre: 同一レイヤー内ノード間隔
const RANK_SEP = 80;     // dagre: レイヤー間隔

/** グループ内ノードを dagre でレイアウト（グループ左上を原点としたローカル座標） */
function layoutGroupNodesDagre(
  toLayout: DiagramNode[],
  g: DiagramGroup,
  edges: DiagramEdge[],
): void {
  if (toLayout.length === 0) return;

  const nodeIds = new Set(toLayout.map((n) => n.id));
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 0, marginy: 0 });
  graph.setDefaultEdgeLabel(() => ({}));

  toLayout.forEach((n) => graph.setNode(n.id, { width: n.w, height: n.h }));
  edges.forEach((e) => {
    if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
      graph.setEdge(e.from, e.to);
    }
  });

  dagre.layout(graph);

  // dagre の中心座標をグループ左上 + padding に変換
  const offsetX = g.x + PADDING;
  const offsetY = g.y + LABEL_HEIGHT + PADDING;

  toLayout.forEach((n) => {
    const pos = graph.node(n.id);
    n.x = offsetX + pos.x - n.w / 2;
    n.y = offsetY + pos.y - n.h / 2;
  });
}

/** グループを全メンバーノードを包含するサイズに計算する */
function computeGroupFit(allMembers: DiagramNode[], g: DiagramGroup): DiagramGroup {
  if (allMembers.length === 0) return g;
  const minX = Math.min(...allMembers.map((n) => n.x)) - PADDING;
  const minY = Math.min(...allMembers.map((n) => n.y)) - LABEL_HEIGHT - PADDING;
  const maxX = Math.max(...allMembers.map((n) => n.x + n.w)) + PADDING;
  const maxY = Math.max(...allMembers.map((n) => n.y + n.h)) + PADDING;
  return { ...g, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** フリーノードを dagre でレイアウト（startY の下から開始） */
function layoutFreeNodesDagre(
  toLayout: DiagramNode[],
  allFreeNodes: DiagramNode[],
  edges: DiagramEdge[],
  startY: number,
): void {
  if (toLayout.length === 0) return;

  const nodeIds = new Set(toLayout.map((n) => n.id));
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 40, marginy: 40 });
  graph.setDefaultEdgeLabel(() => ({}));

  toLayout.forEach((n) => graph.setNode(n.id, { width: n.w, height: n.h }));

  // nodeIds 内の両端点を持つエッジのみ追加
  edges.forEach((e) => {
    if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
      graph.setEdge(e.from, e.to);
    }
  });

  dagre.layout(graph);

  // dagre 結果の最小 Y を求めて startY に合わせるオフセットを計算
  const dagreMinY = Math.min(...toLayout.map((n) => {
    const pos = graph.node(n.id);
    return pos.y - n.h / 2;
  }));
  const offsetY = startY - dagreMinY;

  toLayout.forEach((n) => {
    const pos = graph.node(n.id);
    n.x = pos.x - n.w / 2;
    n.y = pos.y - n.h / 2 + offsetY;
  });
}

export function autoLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  groups: DiagramGroup[] = [],
): { nodes: DiagramNode[]; groupUpdates: Record<string, DiagramGroup> } {
  if (nodes.length === 0) return { nodes, groupUpdates: {} };

  // __RANDOM__ カラーを解決
  nodes.forEach((n) => {
    if (n.color === "__RANDOM__") n.color = randomColor();
  });

  const needsLayout = nodes.some((n) => n._needsPosition);
  if (!needsLayout) return { nodes, groupUpdates: {} };

  const groupById: Record<string, DiagramGroup> = {};
  groups.forEach((g) => (groupById[g.id] = g));

  // グループ内ノードとフリーノードを分離
  const groupedNodesMap: Record<string, DiagramNode[]> = {};
  const freeNodes: DiagramNode[] = [];

  nodes.forEach((n) => {
    if (n.group && groupById[n.group]) {
      (groupedNodesMap[n.group] ??= []).push(n);
    } else {
      freeNodes.push(n);
    }
  });

  // グループ内ノードを dagre でレイアウト → グループ自動フィット
  const groupUpdates: Record<string, DiagramGroup> = {};
  for (const [groupId, gnodes] of Object.entries(groupedNodesMap)) {
    const g = groupById[groupId];
    if (!g) continue;
    const toLayout = gnodes.filter((n) => n._needsPosition);
    if (toLayout.length > 0) layoutGroupNodesDagre(toLayout, g, edges);
    // 全メンバー（既配置ノードを含む）でグループ枠を再計算
    groupUpdates[groupId] = computeGroupFit(gnodes, g);
  }

  // フリーノードを dagre でレイアウト（全グループの下から開始）
  const freeToLayout = freeNodes.filter((n) => n._needsPosition);
  if (freeToLayout.length > 0) {
    const updatedGroups = groups.map((g) => groupUpdates[g.id] ?? g);
    const groupsBottom =
      updatedGroups.length > 0 ? Math.max(...updatedGroups.map((g) => g.y + g.h)) : 0;
    const startY = groupsBottom > 0 ? groupsBottom + 80 : 40;
    layoutFreeNodesDagre(freeToLayout, freeNodes, edges, startY);
  }

  nodes.forEach((n) => delete n._needsPosition);
  return { nodes, groupUpdates };
}
```

**Step 4: テストを実行して通ることを確認**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: PASS（全テスト）

**Step 5: ビルド確認**

```bash
docker compose exec app pnpm --filter diagram-dsl-core build
```

Expected: dist/ が生成される。エラーなし。

**Step 6: コミット**

```bash
git add packages/core/src/layout.ts packages/core/src/__tests__/layout.test.ts
git commit -m "feat: replace autoLayout with dagre, add group auto-fit, return groupUpdates"
```

---

## Task 3: `useDiagramState` で groupUpdates を適用

**Files:**
- Modify: `packages/react/src/hooks/useDiagramState.ts`

`autoLayout` の返り値が `{ nodes, groupUpdates }` になったため、呼び出し側を更新し、groupUpdates を `groupStates` に反映する。

**Step 1: `useDiagramState.ts` を更新**

`useDiagramState.ts` の `displayNodes` useMemo を `layoutResult` useMemo に変更し、後続の `useEffect` を更新する:

```ts
// 変更前 (line 46-51):
const displayNodes = useMemo(() => {
  const nodes = parsedRaw.nodes
    .filter((n) => nodeStates[n.id] !== undefined)
    .map((n) => ({ ...nodeStates[n.id] }));
  return autoLayout(nodes, parsedRaw.edges, displayGroups);
}, [parsedRaw, nodeStates, displayGroups]);
```

```ts
// 変更後:
const layoutResult = useMemo(() => {
  const nodes = parsedRaw.nodes
    .filter((n) => nodeStates[n.id] !== undefined)
    .map((n) => ({ ...nodeStates[n.id] as DiagramNode }));
  return autoLayout(nodes, parsedRaw.edges, displayGroups);
}, [parsedRaw, nodeStates, displayGroups]);

const displayNodes = layoutResult.nodes;
```

次に既存の `_needsPosition` 解消 useEffect を更新（groupUpdates も同時に適用）:

```ts
// 変更前 (line 54-66):
useEffect(() => {
  const updates: Record<string, DiagramNode> = {};
  for (const node of displayNodes) {
    if (nodeStates[node.id]?._needsPosition) {
      updates[node.id] = { ...node, _needsPosition: false };
    }
  }
  if (Object.keys(updates).length > 0) {
    setNodeStates((prev) => ({ ...prev, ...updates }));
  }
  prevDisplayNodesRef.current = displayNodes;
}, [displayNodes]); // eslint-disable-line react-hooks/exhaustive-deps
```

```ts
// 変更後:
useEffect(() => {
  // _needsPosition をクリア
  const nodeUpdates: Record<string, DiagramNode> = {};
  for (const node of displayNodes) {
    if (nodeStates[node.id]?._needsPosition) {
      nodeUpdates[node.id] = { ...node, _needsPosition: false };
    }
  }
  if (Object.keys(nodeUpdates).length > 0) {
    setNodeStates((prev) => ({ ...prev, ...nodeUpdates }));
  }

  // グループ自動フィットを反映
  const { groupUpdates } = layoutResult;
  if (Object.keys(groupUpdates).length > 0) {
    setGroupStates((prev) => ({ ...prev, ...groupUpdates }));
  }

  prevDisplayNodesRef.current = displayNodes;
}, [displayNodes]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Step 2: 型チェック**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし

**Step 3: ビルド**

```bash
docker compose exec app pnpm -r build
```

Expected: エラーなし

**Step 4: コミット**

```bash
git add packages/react/src/hooks/useDiagramState.ts
git commit -m "feat: apply groupUpdates from autoLayout to groupStates in useDiagramState"
```

---

## Task 4: `syncNodes` でグループ変更を検出して `_needsPosition: true` をセット

**Files:**
- Modify: `packages/react/src/hooks/syncNodes.ts`

**Step 1: テストを追加**

`packages/core/src/__tests__/` にはフロントエンドのフックテストはないが、`syncNodes` は pure function なのでテストを追加する。

`packages/react/src/hooks/syncNodes.ts` はコアパッケージ外なので、ここでは型チェックで確認する。代わりに手動テストで確認する（Step 4 参照）。

**Step 2: `syncNodes.ts` を更新**

既存ノードの `group` が変わった場合、`_needsPosition: true` をセット:

```ts
// 変更前 (line 45-53):
} else {
  // 既存ノード: 明示されたプロパティのみ上書き
  const updates: Partial<DiagramNode> = {};
  explicit.forEach((key: string) => {
    (updates as Record<string, unknown>)[key] = (parsed as unknown as Record<string, unknown>)[key];
  });
  const { _explicitProps: _, ...prevClean } = prev;
  result[parsed.id] = { ...prevClean, ...updates };
}
```

```ts
// 変更後:
} else {
  // 既存ノード: 明示されたプロパティのみ上書き
  const updates: Partial<DiagramNode> = {};
  explicit.forEach((key: string) => {
    (updates as Record<string, unknown>)[key] = (parsed as unknown as Record<string, unknown>)[key];
  });
  // group が変更された場合は再配置が必要
  if ("group" in updates && updates.group !== prev.group) {
    updates._needsPosition = true;
  }
  const { _explicitProps: _, ...prevClean } = prev;
  result[parsed.id] = { ...prevClean, ...updates };
}
```

**Step 3: 型チェック + ビルド**

```bash
docker compose exec app pnpm -r typecheck
docker compose exec app pnpm -r build
```

Expected: エラーなし

**Step 4: 手動テスト（ブラウザ）**

1. `http://localhost:5173` を開く
2. コードエディタに以下を入力:
   ```
   node a "Node A" { shape=rect }
   node b "Node B" { shape=rect }
   group g1 "Group1" { color=#6366f1 x=0 y=0 w=300 h=200 }
   ```
3. `⊞ 自動配置` をクリック → a, b がグループ外に配置される
4. `node a "Node A" { shape=rect group=g1 }` に変更
5. Node A が自動的に Group1 の中に移動し、Group1 の枠がフィットすることを確認

**Step 5: コミット**

```bash
git add packages/react/src/hooks/syncNodes.ts
git commit -m "feat: detect group membership change in syncNodes and set _needsPosition"
```

---

## Task 5: `useCanvasInteraction.fitView` をコンテンツ依存に変更

**Files:**
- Modify: `packages/react/src/hooks/useCanvasInteraction.ts`

**Step 1: `useCanvasInteraction.ts` を更新**

`fitView` の型を `() => void` から `(nodes: DiagramNode[], groups: DiagramGroup[]) => void` に変更し、バウンディングボックス計算を実装する:

```ts
import { useState, useEffect, useCallback } from "react";
import type { DiagramNode, DiagramGroup } from "diagram-dsl-core";

export function useCanvasInteraction(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  const handleCanvasMouseDown = (e: React.MouseEvent, onDeselect: () => void) => {
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.getAttribute("data-bg")) {
      onDeselect();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  useEffect(() => {
    if (!isPanning || !panStart) return;
    const move = (e: MouseEvent) => setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    const up = () => setIsPanning(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [isPanning, panStart]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.2, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(3, z + 0.15));
  const zoomOut = () => setZoom((z) => Math.max(0.2, z - 0.15));

  const fitView = useCallback(
    (nodes: DiagramNode[], groups: DiagramGroup[]) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;

      // コンテンツのバウンディングボックスを計算
      const rects = [
        ...nodes.map((n) => ({ x: n.x, y: n.y, r: n.x + n.w, b: n.y + n.h })),
        ...groups.map((g) => ({ x: g.x, y: g.y, r: g.x + g.w, b: g.y + g.h })),
      ].filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y));

      if (rects.length === 0) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      const minX = Math.min(...rects.map((r) => r.x));
      const minY = Math.min(...rects.map((r) => r.y));
      const maxX = Math.max(...rects.map((r) => r.r));
      const maxY = Math.max(...rects.map((r) => r.b));
      const contentW = maxX - minX;
      const contentH = maxY - minY;

      if (contentW <= 0 || contentH <= 0) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      const { width: svgW, height: svgH } = svgEl.getBoundingClientRect();
      const pad = 40;
      const newZoom = Math.max(0.2, Math.min(3, Math.min(
        (svgW - pad * 2) / contentW,
        (svgH - pad * 2) / contentH,
      )));

      // コンテンツを中央に配置するパン
      setPan({
        x: pad - minX * newZoom + (svgW - pad * 2 - contentW * newZoom) / 2,
        y: pad - minY * newZoom + (svgH - pad * 2 - contentH * newZoom) / 2,
      });
      setZoom(newZoom);
    },
    [svgRef],
  );

  return { zoom, pan, isPanning, handleCanvasMouseDown, handleWheel, zoomIn, zoomOut, fitView };
}
```

**Step 2: 型チェック**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: エラーなし（次の Task で DiagramEditor の呼び出し側を更新するまでエラーが出る場合は Task 6 と同時に確認）

**Step 3: コミット**（Task 6 完了後に一緒にコミットしてもよい）

---

## Task 6: `DiagramEditor` で fitView に nodes/groups を渡す

**Files:**
- Modify: `packages/react/src/DiagramEditor.tsx`

**Step 1: `DiagramEditor.tsx` の `onFitView` の渡し方を更新**

Toolbar に渡す `onFitView` を、`parsed.nodes` と `parsed.groups` を捕捉したアロー関数に変更する:

```tsx
// 変更前 (line 399-406):
<Toolbar
  onAddNode={addNode}
  onExportSVG={exportSVG}
  onZoomIn={zoomIn}
  onZoomOut={zoomOut}
  onFitView={fitView}
  onResetLayout={resetLayout}
/>
```

```tsx
// 変更後:
<Toolbar
  onAddNode={addNode}
  onExportSVG={exportSVG}
  onZoomIn={zoomIn}
  onZoomOut={zoomOut}
  onFitView={() => fitView(parsed.nodes, parsed.groups)}
  onResetLayout={resetLayout}
/>
```

Toolbar の `ToolbarProps` は `onFitView: () => void` のまま変更不要。

**Step 2: 型チェック + ビルド**

```bash
docker compose exec app pnpm -r typecheck
docker compose exec app pnpm -r build
```

Expected: エラーなし

**Step 3: コアテスト**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: PASS（全テスト）

**Step 4: 手動テスト（ブラウザ）**

1. `http://localhost:5173` を開く
2. アーキテクチャテンプレートをロード
3. `⊞ 自動配置` をクリック → ノードが dagre でレイアウトされる
4. キャンバスを大きくパン・ズームで移動する
5. 全体表示ボタン（⊡ または フィットビューアイコン）をクリック → 全ノード・グループが画面内に収まることを確認
6. グループの枠がノードを包含していることを確認

**Step 5: コミット**

```bash
git add packages/react/src/DiagramEditor.tsx packages/react/src/hooks/useCanvasInteraction.ts
git commit -m "feat: fitView now fits all nodes/groups into view instead of fixed reset"
```

---

## 最終確認

```bash
docker compose exec app pnpm -r typecheck
docker compose exec app pnpm -r lint
docker compose exec app pnpm -r build
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: 全てエラーなし、全テスト PASS
