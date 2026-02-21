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
  setCode: React.Dispatch<React.SetStateAction<string>>
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

      setCode((prev) => {
        const lines = prev.split("\n");
        const updated = lines.map((line) => {
          const m = line.match(
            new RegExp(`^(node\\s+${dragInfo.nodeId}\\s+"[^"]*"\\s*\\{)(.*)\\}`)
          );
          if (!m) return line;
          let props = m[2];
          if (/x=/.test(props)) props = props.replace(/x=\S+/, `x=${newX}`);
          else props += ` x=${newX}`;
          if (/y=/.test(props)) props = props.replace(/y=\S+/, `y=${newY}`);
          else props += ` y=${newY}`;
          return `${m[1]}${props}}`;
        });
        return updated.join("\n");
      });

      setDragInfo((d) => (d ? { ...d, startX: e.clientX, startY: e.clientY } : null));
    };
    const handleUp = () => setDragInfo(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragInfo, nodeById, zoom]);

  return { selectedNodeId, setSelectedNodeId, handleNodeMouseDown };
}
