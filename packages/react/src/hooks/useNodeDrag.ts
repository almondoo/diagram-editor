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
  }, [dragInfo, nodeById, zoom, setNodeLayout, onMultiMove]);

  return { handleNodeMouseDown };
}
