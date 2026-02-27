import { useState, useEffect, useCallback, useRef } from "react";
import type { DiagramNode, DiagramEdge } from "~/lib/core";

interface BendDragInfo {
  type: "bend";
  fromId: string;
  toId: string;
  /** ドラッグ開始時の bendX/bendY */
  initialBendX: number;
  initialBendY: number;
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

type DragInfo = BendDragInfo | ReconnectDragInfo;

export function useEdgeDrag(
  nodeById: Record<string, DiagramNode>,
  edges: DiagramEdge[],
  zoom: number,
  updateEdgeBend: (fromId: string, toId: string, bendX: number, bendY: number) => void,
  reconnectEdge: (originalFrom: string, originalTo: string, newFrom: string, newTo: string) => void,
  svgRef: React.RefObject<SVGSVGElement | null>,
  panRef: React.RefObject<{ x: number; y: number }>,
  onDragEnd?: () => void,
) {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const nodeByIdRef = useRef(nodeById);
  nodeByIdRef.current = nodeById;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const hasDraggedRef = useRef(false);

  // エッジの線をドラッグ開始(ベンド変更)
  const handleEdgeMoveMouseDown = useCallback((e: React.MouseEvent, fromId: string, toId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const edge = edgesRef.current.find((ed) => ed.from === fromId && ed.to === toId);
    setDragInfo({
      type: "bend",
      fromId,
      toId,
      initialBendX: edge?.bendX ?? 0,
      initialBendY: edge?.bendY ?? 0,
      startX: e.clientX,
      startY: e.clientY,
    });
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
    hasDraggedRef.current = false;

    const handleMove = (e: MouseEvent) => {
      if (!hasDraggedRef.current) {
        onDragEndRef.current?.();
        hasDraggedRef.current = true;
      }
      if (dragInfo.type === "bend") {
        const dx = (e.clientX - dragInfo.startX) / zoom;
        const dy = (e.clientY - dragInfo.startY) / zoom;
        updateEdgeBend(
          dragInfo.fromId,
          dragInfo.toId,
          Math.round(dragInfo.initialBendX + dx),
          Math.round(dragInfo.initialBendY + dy),
        );
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
  }, [dragInfo, zoom, updateEdgeBend, reconnectEdge, svgRef, panRef]);

  return {
    edgeDragInfo: dragInfo,
    handleEdgeMoveMouseDown,
    handleEdgeEndpointMouseDown,
  };
}
