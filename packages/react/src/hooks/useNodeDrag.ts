import { useState, useEffect, useCallback } from "react";
import type { DiagramNode } from "diagram-dsl-core";

interface DragInfo {
  nodeId: string;
  startX: number;
  startY: number;
  type: "move" | "resize";
  isMulti: boolean;
}

export function useNodeDrag(
  nodeById: Record<string, DiagramNode>,
  zoom: number,
  selectedIds: Set<string>,
  setNodeLayout: (nodeId: string, x: number, y: number) => void,
  setNodeSize: (nodeId: string, w: number, h: number) => void,
  onMultiMove: (dx: number, dy: number) => void,
) {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button === 1 || e.button === 2) return;
    const isMulti = selectedIds.size > 1 && selectedIds.has(nodeId);
    setDragInfo({ nodeId, startX: e.clientX, startY: e.clientY, type: "move", isMulti });
  };

  const handleNodeResizeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setDragInfo({ nodeId, startX: e.clientX, startY: e.clientY, type: "resize", isMulti: false });
  };

  const handleNodeTouchStart = useCallback((e: React.TouchEvent, nodeId: string) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const isMulti = selectedIds.size > 1 && selectedIds.has(nodeId);
    setDragInfo({ nodeId, startX: touch.clientX, startY: touch.clientY, type: "move", isMulti });
  }, [selectedIds]);

  useEffect(() => {
    if (!dragInfo) return;

    const applyDrag = (clientX: number, clientY: number, threshold: number): boolean => {
      const dx = (clientX - dragInfo.startX) / zoom;
      const dy = (clientY - dragInfo.startY) / zoom;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return false;

      if (dragInfo.type === "resize") {
        const node = nodeById[dragInfo.nodeId];
        if (!node) return false;
        setNodeSize(dragInfo.nodeId, node.w + dx, node.h + dy);
      } else if (dragInfo.isMulti) {
        onMultiMove(dx, dy);
      } else {
        const node = nodeById[dragInfo.nodeId];
        if (!node) return false;
        setNodeLayout(dragInfo.nodeId, Math.round(node.x + dx), Math.round(node.y + dy));
      }
      return true;
    };

    const handleMove = (e: MouseEvent) => {
      if (applyDrag(e.clientX, e.clientY, 1)) {
        setDragInfo((d) => (d ? { ...d, startX: e.clientX, startY: e.clientY } : null));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (applyDrag(touch.clientX, touch.clientY, 3)) {
        setDragInfo((d) => (d ? { ...d, startX: touch.clientX, startY: touch.clientY } : null));
      }
    };

    const handleUp = () => setDragInfo(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    window.addEventListener("touchcancel", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [dragInfo, nodeById, zoom, setNodeLayout, setNodeSize, onMultiMove]);

  return { handleNodeMouseDown, handleNodeResizeMouseDown, handleNodeTouchStart };
}
