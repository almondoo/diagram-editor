# エッジ追加UI（ノードからドラッグ）実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ノードのコネクションポイントからドラッグして別ノードにドロップすることで、新規エッジを作成する機能を実装する。

**Architecture:** ShapeNodeにホバー時のコネクションポイント（上下左右4点）を追加し、新規hook `useEdgeCreation` でドラッグ状態を管理する。ドロップ時は既存の `addEdge()` を呼んでDSLに追記する。

**Tech Stack:** React, TypeScript, SVG

---

### Task 1: `useEdgeCreation` hook を作成

**Files:**
- Create: `packages/react/src/hooks/useEdgeCreation.ts`

**Step 1: hookファイルを作成**

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import type { DiagramNode } from "diagram-dsl-core";

interface EdgeCreationDragInfo {
  fromNodeId: string;
  /** SVG座標でのカーソル位置 */
  cursorX: number;
  cursorY: number;
}

export function useEdgeCreation(
  nodeById: Record<string, DiagramNode>,
  zoom: number,
  addEdge: (fromId: string, toId: string) => void,
  svgRef: React.RefObject<SVGSVGElement | null>,
  panRef: React.RefObject<{ x: number; y: number }>,
) {
  const [dragInfo, setDragInfo] = useState<EdgeCreationDragInfo | null>(null);
  const nodeByIdRef = useRef(nodeById);
  nodeByIdRef.current = nodeById;

  const handleConnectionPointMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      const cursorX = (e.clientX - rect.left - panRef.current.x) / zoom;
      const cursorY = (e.clientY - rect.top - panRef.current.y) / zoom;
      setDragInfo({ fromNodeId: nodeId, cursorX, cursorY });
    },
    [svgRef, panRef, zoom],
  );

  useEffect(() => {
    if (!dragInfo) return;

    const handleMove = (e: MouseEvent) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      const cursorX = (e.clientX - rect.left - panRef.current.x) / zoom;
      const cursorY = (e.clientY - rect.top - panRef.current.y) / zoom;
      setDragInfo((d) => (d ? { ...d, cursorX, cursorY } : null));
    };

    const handleUp = (e: MouseEvent) => {
      const svgEl = svgRef.current;
      if (svgEl) {
        const rect = svgEl.getBoundingClientRect();
        const cx = (e.clientX - rect.left - panRef.current.x) / zoom;
        const cy = (e.clientY - rect.top - panRef.current.y) / zoom;

        for (const [id, node] of Object.entries(nodeByIdRef.current)) {
          if (id === dragInfo.fromNodeId) continue;
          if (cx >= node.x && cx <= node.x + node.w && cy >= node.y && cy <= node.y + node.h) {
            addEdge(dragInfo.fromNodeId, id);
            break;
          }
        }
      }
      setDragInfo(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragInfo, zoom, addEdge, svgRef, panRef]);

  return {
    edgeCreationDragInfo: dragInfo,
    handleConnectionPointMouseDown,
  };
}
```

**Step 2: ビルドして型エラーがないことを確認**

Run: `docker compose exec app pnpm --filter diagram-dsl-react build`
Expected: ビルド成功

**Step 3: コミット**

```bash
git add packages/react/src/hooks/useEdgeCreation.ts
git commit -m "feat: useEdgeCreation hook を追加"
```

---

### Task 2: ShapeNode にコネクションポイントを追加

**Files:**
- Modify: `packages/react/src/components/ShapeNode.tsx`

**Step 1: ShapeNodeProps にコネクションポイント用のpropsを追加**

`ShapeNodeProps` に以下を追加:

```typescript
onConnectionPointMouseDown?: (e: React.MouseEvent, nodeId: string) => void;
edgeCreationActive?: boolean;  // ドラッグ中にドロップターゲットのハイライトを出すか
```

memo比較関数にも `edgeCreationActive` を追加。

**Step 2: コネクションポイントのレンダリングを追加**

各 `<g>` の戻り値の末尾（`{resizeHandle}` の後）に、ホバー時に表示されるコネクションポイントをレンダリングする。

コネクションポイントは上下左右の4点で、位置は:
- 上: `(x + w/2, y)`
- 下: `(x + w/2, y + h)`
- 左: `(x, y + h/2)`
- 右: `(x + w, y + h/2)`

```tsx
const connectionPoints = onConnectionPointMouseDown ? (
  <g className="connection-points" style={{ opacity: 0 }}>
    {[
      { cx: x + w / 2, cy: y },           // 上
      { cx: x + w / 2, cy: y + h },       // 下
      { cx: x, cy: y + h / 2 },           // 左
      { cx: x + w, cy: y + h / 2 },       // 右
    ].map((pt, i) => (
      <circle
        key={i}
        cx={pt.cx}
        cy={pt.cy}
        r={6}
        fill="#6366f1"
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: "crosshair", pointerEvents: "all" }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onConnectionPointMouseDown(e, node.id);
        }}
      />
    ))}
  </g>
) : null;
```

CSS（DIAGRAM_EDITOR_STYLES に追加）でホバー時の表示:
```css
g:hover > .connection-points { opacity: 1 !important; }
```

**Step 3: `edgeCreationActive` 時のドロップターゲットハイライト**

`edgeCreationActive` が true のとき、ノード周りに薄いハイライト枠を表示:

```tsx
const dropTarget = edgeCreationActive ? (
  <rect
    x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={8}
    fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="5,3" opacity={0.5}
  />
) : null;
```

**Step 4: ビルドして型エラーがないことを確認**

Run: `docker compose exec app pnpm --filter diagram-dsl-react build`
Expected: ビルド成功

**Step 5: コミット**

```bash
git add packages/react/src/components/ShapeNode.tsx
git commit -m "feat: ShapeNode にコネクションポイントを追加"
```

---

### Task 3: DiagramEditor に useEdgeCreation を組み込み

**Files:**
- Modify: `packages/react/src/DiagramEditor.tsx`

**Step 1: import と hook 呼び出しを追加**

```typescript
import { useEdgeCreation } from "./hooks/useEdgeCreation.js";
```

既存の `useEdgeDrag` の後に追加:

```typescript
const { edgeCreationDragInfo, handleConnectionPointMouseDown } =
  useEdgeCreation(nodeById, zoom, addEdge, svgRef, panRef);
```

**Step 2: ShapeNode に新しいpropsを渡す**

`parsed.nodes.map((node) => (` の `<ShapeNode>` に追加:

```tsx
onConnectionPointMouseDown={handleConnectionPointMouseDown}
edgeCreationActive={edgeCreationDragInfo !== null && edgeCreationDragInfo.fromNodeId !== node.id}
```

**Step 3: ドラッグ中のプレビュー線を追加**

既存の接続付け替え中の仮エッジ線（`edgeDragInfo?.type === "reconnect"`）の後に追加:

```tsx
{edgeCreationDragInfo && (() => {
  const fromNode = nodeById[edgeCreationDragInfo.fromNodeId];
  if (!fromNode) return null;
  const fromCenter = { x: fromNode.x + fromNode.w / 2, y: fromNode.y + fromNode.h / 2 };
  return (
    <line
      x1={fromCenter.x} y1={fromCenter.y}
      x2={edgeCreationDragInfo.cursorX} y2={edgeCreationDragInfo.cursorY}
      stroke="#6366f1"
      strokeWidth={2}
      strokeDasharray="6,3"
      markerEnd="url(#arrowEnd)"
      style={{ pointerEvents: "none" }}
    />
  );
})()}
```

**Step 4: ビルドして確認**

Run: `docker compose exec app pnpm --filter diagram-dsl-react build`
Expected: ビルド成功

**Step 5: コミット**

```bash
git add packages/react/src/DiagramEditor.tsx
git commit -m "feat: DiagramEditor に useEdgeCreation を組み込み"
```

---

### Task 4: styles.ts にホバーCSS追加

**Files:**
- Modify: `packages/react/src/styles.ts`

**Step 1: コネクションポイントのホバースタイルを追加**

`DIAGRAM_EDITOR_STYLES` に以下を追加:

```css
g:hover > .connection-points { opacity: 1 !important; }
.connection-points { transition: opacity 0.15s; }
```

**Step 2: ビルドして確認**

Run: `docker compose exec app pnpm --filter diagram-dsl-react build`
Expected: ビルド成功

**Step 3: コミット**

```bash
git add packages/react/src/styles.ts
git commit -m "feat: コネクションポイントのホバースタイルを追加"
```

---

### Task 5: 動作確認とビルド

**Step 1: 全パッケージビルド**

Run: `docker compose exec app pnpm -r build`
Expected: ビルド成功

**Step 2: 型チェック**

Run: `docker compose exec app pnpm -r typecheck`
Expected: エラーなし

**Step 3: ブラウザで動作確認**

http://localhost:5173 で以下を確認:
- ノードにホバーするとコネクションポイント（4つの丸）が表示される
- コネクションポイントからドラッグするとプレビュー線が表示される
- 別ノードにドロップするとエッジが追加される（DSLに `edge fromId -> toId` が追記される）
- 空白エリアにドロップするとキャンセルされる
- 自分自身へのドロップは無視される
- 既存のノードドラッグ（移動）が壊れていないこと
