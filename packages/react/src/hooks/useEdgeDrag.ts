import { useState, useEffect, useCallback, useRef } from "react";
import type { DiagramNode } from "diagram-dsl-core";

interface EdgeDragInfo {
  type: "move";
  fromId: string;
  toId: string;
  startX: number;
  startY: number;
}

interface ReconnectDragInfo {
  type: "reconnect";
  /** ドラッグ中の端: "from" = 始点を付け替え, "to" = 終点を付け替え */
  end: "from" | "to";
  /** 元の edge の from/to */
  originalFrom: string;
  originalTo: string;
  /** 固定端のノードID */
  anchorId: string;
  /** 現在のカーソル位置(SVG座標) */
  cursorX: number;
  cursorY: number;
  startX: number;
  startY: number;
}

type DragInfo = EdgeDragInfo | ReconnectDragInfo;

export function useEdgeDrag(
  nodeById: Record<string, DiagramNode>,
  zoom: number,
  setNodeLayout: (nodeId: string, x: number, y: number) => void,
  reconnectEdge: (originalFrom: string, originalTo: string, newFrom: string, newTo: string) => void,
  svgRef: React.RefObject<SVGSVGElement | null>,
  panRef: React.RefObject<{ x: number; y: number }>,
) {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const nodeByIdRef = useRef(nodeById);
  nodeByIdRef.current = nodeById;

  // エッジの線をドラッグ開始(全体移動)
  const handleEdgeMoveMouseDown = useCallback((e: React.MouseEvent, fromId: string, toId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setDragInfo({ type: "move", fromId, toId, startX: e.clientX, startY: e.clientY });
  }, []);

  // 端点のドラッグ開始(接続先付け替え)
  const handleEdgeEndpointMouseDown = useCallback((e: React.MouseEvent, fromId: string, toId: string, end: "from" | "to") => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const cursorX = (e.clientX - rect.left - panRef.current.x) / zoom;
    const cursorY = (e.clientY - rect.top - panRef.current.y) / zoom;
    setDragInfo({
      type: "reconnect",
      end,
      originalFrom: fromId,
      originalTo: toId,
      anchorId: end === "from" ? toId : fromId,
      cursorX,
      cursorY,
      startX: e.clientX,
      startY: e.clientY,
    });
  }, [svgRef, panRef, zoom]);

  useEffect(() => {
    if (!dragInfo) return;

    const handleMove = (e: MouseEvent) => {
      if (dragInfo.type === "move") {
        const dx = (e.clientX - dragInfo.startX) / zoom;
        const dy = (e.clientY - dragInfo.startY) / zoom;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

        const fromNode = nodeByIdRef.current[dragInfo.fromId];
        const toNode = nodeByIdRef.current[dragInfo.toId];
        if (fromNode) setNodeLayout(dragInfo.fromId, Math.round(fromNode.x + dx), Math.round(fromNode.y + dy));
        if (toNode) setNodeLayout(dragInfo.toId, Math.round(toNode.x + dx), Math.round(toNode.y + dy));
        setDragInfo((d) => d ? { ...d, startX: e.clientX, startY: e.clientY } : null);
      } else if (dragInfo.type === "reconnect") {
        const svgEl = svgRef.current;
        if (!svgEl) return;
        const rect = svgEl.getBoundingClientRect();
        const cursorX = (e.clientX - rect.left - panRef.current.x) / zoom;
        const cursorY = (e.clientY - rect.top - panRef.current.y) / zoom;
        setDragInfo((d) => d && d.type === "reconnect" ? { ...d, cursorX, cursorY } : d);
      }
    };

    const handleUp = (e: MouseEvent) => {
      if (dragInfo.type === "reconnect") {
        // ドロップ先のノードを検出
        const svgEl = svgRef.current;
        if (svgEl) {
          const rect = svgEl.getBoundingClientRect();
          const cx = (e.clientX - rect.left - panRef.current.x) / zoom;
          const cy = (e.clientY - rect.top - panRef.current.y) / zoom;

          let targetNodeId: string | null = null;
          for (const [id, node] of Object.entries(nodeByIdRef.current)) {
            if (id === dragInfo.anchorId) continue;
            if (cx >= node.x && cx <= node.x + node.w && cy >= node.y && cy <= node.y + node.h) {
              targetNodeId = id;
              break;
            }
          }

          if (targetNodeId) {
            const newFrom = dragInfo.end === "from" ? targetNodeId : dragInfo.originalFrom;
            const newTo = dragInfo.end === "to" ? targetNodeId : dragInfo.originalTo;
            if (newFrom !== newTo) {
              reconnectEdge(dragInfo.originalFrom, dragInfo.originalTo, newFrom, newTo);
            }
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
  }, [dragInfo, zoom, setNodeLayout, reconnectEdge, svgRef, panRef]);

  return {
    edgeDragInfo: dragInfo,
    handleEdgeMoveMouseDown,
    handleEdgeEndpointMouseDown,
  };
}
