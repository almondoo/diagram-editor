import { useState, useEffect, useCallback, useRef } from "react";
import type { DiagramNode } from "~/lib/core";

interface EdgeCreationDragInfo {
  fromNodeId: string;
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
