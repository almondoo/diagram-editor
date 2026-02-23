import { useState, useRef, useCallback } from "react";
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
  const rectStartRef = useRef<{ x: number; y: number } | null>(null);

  const startSelectionRect = useCallback((canvasX: number, canvasY: number) => {
    rectStartRef.current = { x: canvasX, y: canvasY };
    setSelectionRect({ x: canvasX, y: canvasY, w: 0, h: 0 });
  }, []);

  const updateSelectionRect = useCallback((canvasX: number, canvasY: number) => {
    const start = rectStartRef.current;
    if (!start) return;
    const x = Math.min(start.x, canvasX);
    const y = Math.min(start.y, canvasY);
    const w = Math.abs(canvasX - start.x);
    const h = Math.abs(canvasY - start.y);
    setSelectionRect({ x, y, w, h });
  }, []);

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
      rectStartRef.current = null;
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionRect(null);
    rectStartRef.current = null;
  }, []);

  const selectSingle = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  return {
    selectedIds,
    selectionRect,
    startSelectionRect,
    updateSelectionRect,
    endSelectionRect,
    clearSelection,
    selectSingle,
    isSelected,
  };
}
