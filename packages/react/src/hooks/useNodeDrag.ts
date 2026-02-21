import { useState, useEffect } from "react";
import type { DiagramNode } from "diagram-dsl-core";

interface DragInfo {
  nodeId: string;
  startX: number;
  startY: number;
}

export function useNodeDrag(
  nodeById: Record<string, DiagramNode>,
  zoom: number,
  setNodeLayout: (nodeId: string, x: number, y: number) => void
) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button === 1 || e.button === 2) return;
    setSelectedNodeId(nodeId);
    setDragInfo({ nodeId, startX: e.clientX, startY: e.clientY });
  };

  useEffect(() => {
    if (!dragInfo) return;
    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragInfo.startX) / zoom;
      const dy = (e.clientY - dragInfo.startY) / zoom;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      const node = nodeById[dragInfo.nodeId];
      if (!node) return;
      const newX = Math.round(node.x + dx);
      const newY = Math.round(node.y + dy);

      setNodeLayout(dragInfo.nodeId, newX, newY);
      setDragInfo((d) => (d ? { ...d, startX: e.clientX, startY: e.clientY } : null));
    };
    const handleUp = () => setDragInfo(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragInfo, nodeById, zoom, setNodeLayout]);

  return { selectedNodeId, setSelectedNodeId, handleNodeMouseDown };
}
