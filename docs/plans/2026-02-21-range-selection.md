# Range Selection & Multi-element Move Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** キャンバス上でマウスドラッグによる範囲選択を行い、選択した複数要素（ノード・グループ・ノート）を同時に移動できるようにする。

**Architecture:** `useMultiSelect` フックで選択状態と選択矩形を管理。キャンバス背景ドラッグがデフォルトで選択矩形、Space+ドラッグでパン。`useDiagramState` に `noteStates` と `multiMoveLayout` を追加し、選択要素の一括移動を実現する。

**Tech Stack:** React hooks, TypeScript, SVG

---

## ファイル構成（変更対象）

```
packages/react/src/
  hooks/
    syncNotes.ts          # 新規作成
    useMultiSelect.ts     # 新規作成
    useDiagramState.ts    # noteStates / setNoteLayout / multiMoveLayout 追加
    useCanvasInteraction.ts  # isSpaceHeld 追加
    useNodeDrag.ts        # 複数選択対応
    useGroupDrag.ts       # 複数選択対応
  components/
    NoteBox.tsx           # onMouseDown / isSelected prop 追加
  DiagramEditor.tsx       # 全体を結線
```

---

## Wave 1: 独立タスク（並列実行可能）

### Task 1A: syncNotes.ts の作成 + useDiagramState に noteStates 追加

**Files:**
- Create: `packages/react/src/hooks/syncNotes.ts`
- Modify: `packages/react/src/hooks/useDiagramState.ts`

**Step 1: syncNotes.ts を作成**

```typescript
// packages/react/src/hooks/syncNotes.ts
import type { DiagramNote } from "diagram-dsl-core";

export function syncNotes(
  parsedNotes: DiagramNote[],
  prevStates: Record<string, DiagramNote>
): Record<string, DiagramNote> {
  const result: Record<string, DiagramNote> = {};
  for (const parsed of parsedNotes) {
    const prev = prevStates[parsed.id];
    if (!prev) {
      result[parsed.id] = { ...parsed };
    } else {
      // x/y はドラッグ位置を維持、text/color はコードから更新
      result[parsed.id] = { ...prev, text: parsed.text, color: parsed.color };
    }
  }
  return result;
}
```

**Step 2: useDiagramState.ts を修正**

以下を追加：

```typescript
// import 追加
import { syncNotes } from "./syncNotes.js";

// state 追加（useState の並びに）
const [noteStates, setNoteStates] = useState<Record<string, DiagramNote>>({});
const noteStatesRef = useRef(noteStates);
noteStatesRef.current = noteStates;

// コード変更時の同期（useEffect の並びに）
useEffect(() => {
  setNoteStates((prev) => syncNotes(parsedRaw.notes, prev));
}, [parsedRaw]);

// displayNotes（displayNodes の並びに）
const displayNotes = useMemo<DiagramNote[]>(() => {
  return parsedRaw.notes.map((n) => noteStates[n.id] ?? n);
}, [parsedRaw.notes, noteStates]);
```

`parsed` の定義を更新して `displayNotes` を使用：

```typescript
const parsed: ParseResult = useMemo(
  () => ({ ...parsedRaw, nodes: displayNodes, groups: displayGroups, notes: displayNotes }),
  [parsedRaw, displayNodes, displayGroups, displayNotes],
);
```

`setNoteLayout` を追加（`setGroupSize` の後に）：

```typescript
const setNoteLayout = useCallback((noteId: string, x: number, y: number) => {
  setNoteStates((prev) => {
    const n = prev[noteId];
    if (!n) return prev;
    return { ...prev, [noteId]: { ...n, x, y } };
  });
}, []);
```

`multiMoveLayout` を追加：

```typescript
const multiMoveLayout = useCallback((selectedIds: Set<string>, dx: number, dy: number) => {
  // 選択グループの子孫グループを収集
  const collectDescendants = (id: string): string[] => {
    const children = Object.values(groupStatesRef.current).filter(
      (g) => g.parentGroup === id,
    );
    return [id, ...children.flatMap((c) => collectDescendants(c.id))];
  };

  // トップレベルの選択グループのみ展開（親グループが選択済みの場合はスキップ）
  const groupsToMove = new Set<string>();
  for (const id of selectedIds) {
    const group = groupStatesRef.current[id];
    if (group) {
      const parentSelected = group.parentGroup && selectedIds.has(group.parentGroup);
      if (!parentSelected) {
        for (const gid of collectDescendants(id)) {
          groupsToMove.add(gid);
        }
      }
    }
  }

  // グループ移動
  if (groupsToMove.size > 0) {
    setGroupStates((prev) => {
      const updates: Record<string, DiagramGroup> = {};
      for (const gid of groupsToMove) {
        const g = prev[gid];
        if (g) updates[gid] = { ...g, x: g.x + dx, y: g.y + dy };
      }
      return { ...prev, ...updates };
    });
  }

  // ノード移動: 選択済み（移動グループ外）または移動グループ内のノード
  setNodeStates((prev) => {
    const updates: Record<string, DiagramNode> = {};
    for (const [id, node] of Object.entries(prev)) {
      const inMovedGroup = groupsToMove.has(node.group);
      const isSelected = selectedIds.has(id);
      if (isSelected || inMovedGroup) {
        updates[id] = { ...node, x: node.x + dx, y: node.y + dy };
      }
    }
    return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
  });

  // ノート移動
  setNoteStates((prev) => {
    const updates: Record<string, DiagramNote> = {};
    for (const id of selectedIds) {
      const note = prev[id];
      if (note) updates[id] = { ...note, x: note.x + dx, y: note.y + dy };
    }
    return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
  });
}, []);
```

return に `noteStates`, `setNoteLayout`, `multiMoveLayout` を追加。

**Step 3: 型チェック**

```bash
docker compose exec app pnpm --filter diagram-dsl-react typecheck
```

---

### Task 1B: useMultiSelect.ts の作成

**Files:**
- Create: `packages/react/src/hooks/useMultiSelect.ts`

```typescript
// packages/react/src/hooks/useMultiSelect.ts
import { useState, useCallback } from "react";
import type { DiagramNode, DiagramGroup, DiagramNote } from "diagram-dsl-core";

export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectsOverlap(sel: SelectionRect, item: { x: number; y: number; w: number; h: number }) {
  return (
    sel.x < item.x + item.w &&
    sel.x + sel.w > item.x &&
    sel.y < item.y + item.h &&
    sel.y + sel.h > item.y
  );
}

export function useMultiSelect() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);

  const startSelectionRect = useCallback((canvasX: number, canvasY: number) => {
    setRectStart({ x: canvasX, y: canvasY });
    setSelectionRect({ x: canvasX, y: canvasY, w: 0, h: 0 });
  }, []);

  const updateSelectionRect = useCallback(
    (canvasX: number, canvasY: number) => {
      setRectStart((start) => {
        if (!start) return start;
        const x = Math.min(start.x, canvasX);
        const y = Math.min(start.y, canvasY);
        const w = Math.abs(canvasX - start.x);
        const h = Math.abs(canvasY - start.y);
        setSelectionRect({ x, y, w, h });
        return start;
      });
    },
    [],
  );

  const endSelectionRect = useCallback(
    (
      nodes: DiagramNode[],
      groups: DiagramGroup[],
      notes: DiagramNote[],
    ) => {
      setSelectionRect((rect) => {
        if (rect && (rect.w > 4 || rect.h > 4)) {
          const ids = new Set<string>();
          for (const n of nodes) {
            if (rectsOverlap(rect, { x: n.x, y: n.y, w: n.w, h: n.h })) ids.add(n.id);
          }
          for (const g of groups) {
            if (rectsOverlap(rect, { x: g.x, y: g.y, w: g.w, h: g.h })) ids.add(g.id);
          }
          for (const note of notes) {
            const w = Math.max(note.text.length * 7 + 16, 80);
            if (rectsOverlap(rect, { x: note.x, y: note.y, w, h: 28 })) ids.add(note.id);
          }
          setSelectedIds(ids);
        }
        return null;
      });
      setRectStart(null);
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionRect(null);
    setRectStart(null);
  }, []);

  const selectSingle = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const hasSelection = selectedIds.size > 0;

  return {
    selectedIds,
    selectionRect,
    startSelectionRect,
    updateSelectionRect,
    endSelectionRect,
    clearSelection,
    selectSingle,
    isSelected,
    hasSelection,
  };
}
```

**Step 2: 型チェック**

```bash
docker compose exec app pnpm --filter diagram-dsl-react typecheck
```

---

### Task 1C: useCanvasInteraction.ts に isSpaceHeld を追加

**Files:**
- Modify: `packages/react/src/hooks/useCanvasInteraction.ts`

**変更内容:**

ファイルの先頭（`useState` の後）に Space キーのトラッキングを追加。

`useCanvasInteraction` 関数の冒頭に追加：

```typescript
const [isSpaceHeld, setIsSpaceHeld] = useState(false);

useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space" && !e.repeat) setIsSpaceHeld(true);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") setIsSpaceHeld(false);
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
}, []);
```

`handleCanvasMouseDown` を修正：Space が押されていない場合はパンを開始しない（returnのみ）：

```typescript
const handleCanvasMouseDown = (e: React.MouseEvent, onDeselect: () => void) => {
  const target = e.target as SVGElement;
  if (target === svgRef.current || target.getAttribute("data-bg")) {
    onDeselect();
    if (isSpaceHeld) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
    // Space なしの場合は選択矩形モード（呼び出し元が処理）
  }
};
```

`return` に `isSpaceHeld` を追加：

```typescript
return { zoom, pan, isPanning, isSpaceHeld, handleCanvasMouseDown, handleWheel, zoomIn, zoomOut, fitView };
```

**注意:** `isSpaceHeld` を使うために `handleCanvasMouseDown` の中で `isSpaceHeld` を参照しているが、`isSpaceHeld` は `useState` なので依存関係の問題はない。

**Step 2: 型チェック**

```bash
docker compose exec app pnpm --filter diagram-dsl-react typecheck
```

---

### Task 1D: NoteBox.tsx に drag/selection props 追加

**Files:**
- Modify: `packages/react/src/components/NoteBox.tsx`

```typescript
import type { DiagramNote } from "diagram-dsl-core";
import type { MouseEvent } from "react";

interface NoteBoxProps {
  note: DiagramNote;
  isSelected?: boolean;
  onMouseDown?: (e: MouseEvent) => void;
}

export function NoteBox({ note, isSelected, onMouseDown }: NoteBoxProps) {
  const w = Math.max(note.text.length * 7 + 16, 80);
  return (
    <g style={{ cursor: onMouseDown ? "grab" : "default" }} onMouseDown={onMouseDown}>
      <rect
        x={note.x}
        y={note.y}
        width={w}
        height={28}
        rx={4}
        fill={note.color}
        fillOpacity={isSelected ? 0.35 : 0.15}
        stroke={note.color}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray={isSelected ? "none" : undefined}
      />
      <text
        x={note.x + 8}
        y={note.y + 17}
        fill={note.color}
        fontSize={11}
        fontFamily="'IBM Plex Mono', monospace"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {note.text}
      </text>
    </g>
  );
}
```

**Step 2: 型チェック**

```bash
docker compose exec app pnpm --filter diagram-dsl-react typecheck
```

---

## Wave 2: Wave 1 完了後（並列実行可能）

### Task 2A: useNodeDrag.ts を複数選択対応に更新

**Files:**
- Modify: `packages/react/src/hooks/useNodeDrag.ts`

```typescript
import { useState, useEffect } from "react";
import type { DiagramNode } from "diagram-dsl-core";

interface DragInfo {
  nodeId: string;
  startX: number;
  startY: number;
  isMulti: boolean;
}

export function useNodeDrag(
  nodeById: Record<string, DiagramNode>,
  zoom: number,
  selectedIds: Set<string>,
  setNodeLayout: (nodeId: string, x: number, y: number) => void,
  onMultiMove: (dx: number, dy: number) => void,
) {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button === 1 || e.button === 2) return;
    const isMulti = selectedIds.size > 1 && selectedIds.has(nodeId);
    setDragInfo({ nodeId, startX: e.clientX, startY: e.clientY, isMulti });
  };

  useEffect(() => {
    if (!dragInfo) return;
    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragInfo.startX) / zoom;
      const dy = (e.clientY - dragInfo.startY) / zoom;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;

      if (dragInfo.isMulti) {
        onMultiMove(dx, dy);
      } else {
        const node = nodeById[dragInfo.nodeId];
        if (!node) return;
        setNodeLayout(dragInfo.nodeId, Math.round(node.x + dx), Math.round(node.y + dy));
      }
      setDragInfo((d) => (d ? { ...d, startX: e.clientX, startY: e.clientY } : null));
    };
    const handleUp = () => setDragInfo(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragInfo, nodeById, zoom, selectedIds, setNodeLayout, onMultiMove]);

  return { handleNodeMouseDown };
}
```

**注意:** `selectedNodeId` の return を削除。選択状態は `useMultiSelect` で管理する。`DiagramEditor.tsx` で `selectedNodeId` の参照を `isSelected(node.id)` に置き換える。

**Step 2: 型チェック**

```bash
docker compose exec app pnpm --filter diagram-dsl-react typecheck
```

---

### Task 2B: useGroupDrag.ts を複数選択対応に更新

**Files:**
- Modify: `packages/react/src/hooks/useGroupDrag.ts`

```typescript
import { useState, useEffect, useRef } from "react";
import type { DiagramGroup } from "diagram-dsl-core";
import type { ResizeHandle } from "./useGroupDrag.js";

export type { ResizeHandle };

interface GroupDragInfo {
  groupId: string;
  type: "move" | "resize";
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
  isMulti: boolean;
}

export function useGroupDrag(
  groupById: Record<string, DiagramGroup>,
  zoom: number,
  selectedIds: Set<string>,
  setGroupLayout: (groupId: string, dx: number, dy: number) => void,
  setGroupSize: (groupId: string, newW: number, newH: number) => void,
  onMultiMove: (dx: number, dy: number) => void,
) {
  const [dragInfo, setDragInfo] = useState<GroupDragInfo | null>(null);
  const groupByIdRef = useRef(groupById);
  groupByIdRef.current = groupById;

  const handleGroupMoveMouseDown = (e: React.MouseEvent, groupId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const isMulti = selectedIds.size > 1 && selectedIds.has(groupId);
    setDragInfo({ groupId, type: "move", startClientX: e.clientX, startClientY: e.clientY, isMulti });
  };

  const handleGroupResizeMouseDown = (
    e: React.MouseEvent,
    groupId: string,
    handle: ResizeHandle,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDragInfo({ groupId, type: "resize", handle, startClientX: e.clientX, startClientY: e.clientY, isMulti: false });
  };

  useEffect(() => {
    if (!dragInfo) return;

    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragInfo.startClientX) / zoom;
      const dy = (e.clientY - dragInfo.startClientY) / zoom;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      if (dragInfo.type === "move") {
        if (dragInfo.isMulti) {
          onMultiMove(dx, dy);
        } else {
          setGroupLayout(dragInfo.groupId, dx, dy);
        }
      } else {
        const g = groupByIdRef.current[dragInfo.groupId];
        if (!g) return;
        const handle = dragInfo.handle ?? "se";
        const newW = handle === "s" ? g.w : Math.max(120, g.w + dx);
        const newH = handle === "e" ? g.h : Math.max(80, g.h + dy);
        setGroupSize(dragInfo.groupId, newW, newH);
      }

      setDragInfo((d) => d ? { ...d, startClientX: e.clientX, startClientY: e.clientY } : null);
    };

    const handleUp = () => setDragInfo(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragInfo, zoom, selectedIds, setGroupLayout, setGroupSize, onMultiMove]);

  return { handleGroupMoveMouseDown, handleGroupResizeMouseDown };
}
```

**Step 2: 型チェック**

```bash
docker compose exec app pnpm --filter diagram-dsl-react typecheck
```

---

## Wave 3: DiagramEditor.tsx の結線

### Task 3: DiagramEditor.tsx を全面更新

**Files:**
- Modify: `packages/react/src/DiagramEditor.tsx`

**変更点:**

1. **import 追加:**
```typescript
import { useMultiSelect } from "./hooks/useMultiSelect.js";
```

2. **useDiagramState の分割代入に追加:**
```typescript
const {
  code, setCode, parsed, nodeById, groupById, noteStates, nodeStates, groupStates,
  setNodeLayout, setGroupLayout, setGroupSize, setNoteLayout, multiMoveLayout,
  addNode, exportSVG, formatCode, resetLayout, loadTemplate, loadSaved,
} = useDiagramState(initialCode);
```

3. **useMultiSelect フックを追加** (`useCanvasInteraction` の後）：
```typescript
const {
  selectedIds, selectionRect,
  startSelectionRect, updateSelectionRect, endSelectionRect,
  clearSelection, selectSingle, isSelected,
} = useMultiSelect();
```

4. **onMultiMove コールバックを作成:**
```typescript
const onMultiMove = useCallback((dx: number, dy: number) => {
  multiMoveLayout(selectedIds, dx, dy);
}, [selectedIds, multiMoveLayout]);
```

5. **useNodeDrag の呼び出しを更新:**
```typescript
const { handleNodeMouseDown } = useNodeDrag(
  nodeById, zoom, selectedIds, setNodeLayout, onMultiMove
);
```

6. **useGroupDrag の呼び出しを更新:**
```typescript
const { handleGroupMoveMouseDown, handleGroupResizeMouseDown } =
  useGroupDrag(groupById, zoom, selectedIds, setGroupLayout, setGroupSize, onMultiMove);
```

7. **ノートドラッグの state を追加** (useState の並びに)：
```typescript
const [noteDragInfo, setNoteDragInfo] = useState<{ noteId: string; startX: number; startY: number; isMulti: boolean } | null>(null);

const handleNoteMouseDown = (e: React.MouseEvent, noteId: string) => {
  e.stopPropagation();
  if (e.button !== 0) return;
  const isMulti = selectedIds.size > 1 && selectedIds.has(noteId);
  setNoteDragInfo({ noteId, startX: e.clientX, startY: e.clientY, isMulti });
};

useEffect(() => {
  if (!noteDragInfo) return;
  const handleMove = (e: MouseEvent) => {
    const dx = (e.clientX - noteDragInfo.startX) / zoom;
    const dy = (e.clientY - noteDragInfo.startY) / zoom;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
    if (noteDragInfo.isMulti) {
      onMultiMove(dx, dy);
    } else {
      const note = noteStates[noteDragInfo.noteId] ?? parsed.notes.find(n => n.id === noteDragInfo.noteId);
      if (!note) return;
      setNoteLayout(noteDragInfo.noteId, Math.round(note.x + dx), Math.round(note.y + dy));
    }
    setNoteDragInfo((d) => d ? { ...d, startX: e.clientX, startY: e.clientY } : null);
  };
  const handleUp = () => setNoteDragInfo(null);
  window.addEventListener("mousemove", handleMove);
  window.addEventListener("mouseup", handleUp);
  return () => {
    window.removeEventListener("mousemove", handleMove);
    window.removeEventListener("mouseup", handleUp);
  };
}, [noteDragInfo, zoom, noteStates, parsed.notes, setNoteLayout, onMultiMove]);
```

8. **キャンバス背景のマウスダウン処理を更新。** SVGラッパーの `onMouseDown` を修正：
```typescript
onMouseDown={(e) => {
  const target = e.target as SVGElement;
  if (target === svgRef.current || target.getAttribute("data-bg")) {
    clearSelection();
    handleCanvasMouseDown(e, () => {}); // Space時のみパン開始
    if (!isSpaceHeld) {
      // 選択矩形開始: canvas座標に変換
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;
      startSelectionRect(canvasX, canvasY);
    }
  }
}}
```

9. **選択矩形の更新と確定のための window イベント:**
```typescript
useEffect(() => {
  if (!selectionRect) return;
  const handleMove = (e: MouseEvent) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;
    updateSelectionRect(canvasX, canvasY);
  };
  const handleUp = () => {
    endSelectionRect(parsed.nodes, parsed.groups, parsed.notes);
  };
  window.addEventListener("mousemove", handleMove);
  window.addEventListener("mouseup", handleUp);
  return () => {
    window.removeEventListener("mousemove", handleMove);
    window.removeEventListener("mouseup", handleUp);
  };
}, [selectionRect, pan, zoom, parsed.nodes, parsed.groups, parsed.notes, updateSelectionRect, endSelectionRect]);
```

10. **ShapeNode の isSelected prop を更新:**
```typescript
<ShapeNode
  key={node.id}
  node={node}
  isSelected={isSelected(node.id)}
  onMouseDown={(e) => {
    if (!isSelected(node.id)) selectSingle(node.id);
    handleNodeMouseDown(e, node.id);
  }}
/>
```

11. **GroupBox の選択表示と mousedown:** GroupBox は `isSelected` prop を持っていないため、選択時にラッパーで視覚フィードバックを出す（またはGroupBoxに prop 追加。シンプルにするためGroupBoxはそのままでよい）。

12. **NoteBox に props を渡す:**
```typescript
{parsed.notes.map((n) => (
  <NoteBox
    key={n.id}
    note={n}
    isSelected={isSelected(n.id)}
    onMouseDown={(e) => {
      e.stopPropagation();
      if (!isSelected(n.id)) selectSingle(n.id);
      handleNoteMouseDown(e, n.id);
    }}
  />
))}
```

13. **選択矩形を SVG に描画** (`</g>` の後、Minimap の前）：
```typescript
{selectionRect && (
  <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
    <rect
      x={selectionRect.x}
      y={selectionRect.y}
      width={selectionRect.w}
      height={selectionRect.h}
      fill="#6366f1"
      fillOpacity={0.08}
      stroke="#6366f1"
      strokeWidth={1 / zoom}
      strokeDasharray={`${4 / zoom},${2 / zoom}`}
      style={{ pointerEvents: "none" }}
    />
  </g>
)}
```

14. **cursor の更新:** 選択矩形描画中は `crosshair`、Space中は `grabbing`：
```typescript
style={{
  cursor: selectionRect ? "crosshair" : isPanning ? "grabbing" : isSpaceHeld ? "grab" : "default"
}}
```

**Step 2: ビルドと型チェック**

```bash
docker compose exec app pnpm -r typecheck
docker compose exec app pnpm -r build
```

**Step 3: 動作確認**

- http://localhost:5173 でキャンバス上をドラッグして選択矩形が表示されることを確認
- 複数ノードを選択して移動できることを確認
- Space+ドラッグでパンできることを確認
- ノートをドラッグで移動できることを確認

**Step 4: コミット**

```bash
git add packages/react/src/
git commit -m "feat: add range selection and multi-element move

- 空白ドラッグ → 選択矩形でノード/グループ/ノートを複数選択
- 選択要素を一括ドラッグ移動
- Space+ドラッグでパン (従来動作)
- noteStates 追加でノートの個別ドラッグも対応"
```

---

## 注意事項

- `useNodeDrag` から `selectedNodeId` の return を削除したため、`DiagramEditor.tsx` で参照している箇所を `isSelected(node.id)` に置き換えること
- `ResizeHandle` 型は `useGroupDrag.ts` から export されているため import パスに注意
- `useCanvasInteraction` の `handleCanvasMouseDown` は Space なしの場合に何もしないが、`onDeselect` は `clearSelection` で代替する
