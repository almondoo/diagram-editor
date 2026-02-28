import { useState, useEffect, useCallback, useRef } from "react";
import type { DiagramNode } from "~/lib/core";

export type NodeResizeHandle = "n" | "s" | "w" | "e" | "se";

interface DragInfo {
  nodeId: string;
  type: "move" | "resize";
  handle?: NodeResizeHandle;
  isMulti: boolean;
}

export function useNodeDrag(
  nodeById: Record<string, DiagramNode>,
  zoom: number,
  selectedIds: Set<string>,
  setNodeLayout: (nodeId: string, x: number, y: number) => void,
  setNodeSize: (nodeId: string, w: number, h: number, x?: number, y?: number) => void,
  onMultiMove: (dx: number, dy: number) => void,
  onDragEnd?: () => void,
) {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const hasDraggedRef = useRef(false);

  // ドラッグ開始時の初期値（同期的に参照）
  const dragStartRef = useRef<{
    cursorX: number;
    cursorY: number;
    nodeX: number;
    nodeY: number;
    nodeW: number;
    nodeH: number;
  } | null>(null);
  // 最後に処理したカーソル位置（incremental delta用）
  const lastCursorRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button === 1 || e.button === 2) return;
    const node = nodeById[nodeId];
    if (!node) return;
    const isMulti = selectedIds.size > 1 && selectedIds.has(nodeId);
    dragStartRef.current = {
      cursorX: e.clientX, cursorY: e.clientY,
      nodeX: node.x, nodeY: node.y, nodeW: node.w, nodeH: node.h,
    };
    lastCursorRef.current = { x: e.clientX, y: e.clientY };
    setDragInfo({ nodeId, type: "move", isMulti });
  };

  const handleNodeResizeMouseDown = (e: React.MouseEvent, nodeId: string, handle: NodeResizeHandle = "se") => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const node = nodeById[nodeId];
    if (!node) return;
    dragStartRef.current = {
      cursorX: e.clientX, cursorY: e.clientY,
      nodeX: node.x, nodeY: node.y, nodeW: node.w, nodeH: node.h,
    };
    lastCursorRef.current = { x: e.clientX, y: e.clientY };
    setDragInfo({ nodeId, type: "resize", handle, isMulti: false });
  };

  const handleNodeTouchStart = useCallback((e: React.TouchEvent, nodeId: string) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0]!;
    const node = nodeById[nodeId];
    if (!node) return;
    const isMulti = selectedIds.size > 1 && selectedIds.has(nodeId);
    dragStartRef.current = {
      cursorX: touch.clientX, cursorY: touch.clientY,
      nodeX: node.x, nodeY: node.y, nodeW: node.w, nodeH: node.h,
    };
    lastCursorRef.current = { x: touch.clientX, y: touch.clientY };
    setDragInfo({ nodeId, type: "move", isMulti });
  }, [selectedIds, nodeById]);

  useEffect(() => {
    if (!dragInfo) return;
    hasDraggedRef.current = false;

    const applyDrag = (clientX: number, clientY: number, threshold: number): boolean => {
      const start = dragStartRef.current;
      if (!start) return false;
      const z = zoomRef.current;

      if (dragInfo.type === "resize") {
        // リサイズ: 初期値 + 総デルタ（絶対値）
        const totalDx = (clientX - start.cursorX) / z;
        const totalDy = (clientY - start.cursorY) / z;
        if (Math.abs(totalDx) < threshold && Math.abs(totalDy) < threshold) return false;

        if (!hasDraggedRef.current) {
          onDragEndRef.current?.();
          hasDraggedRef.current = true;
        }

        const h = dragInfo.handle ?? "se";
        const adjustX = h === "w";
        const adjustY = h === "n";
        const adjustW = h === "e" || h === "w" || h === "se";
        const adjustH = h === "n" || h === "s" || h === "se";
        const newW = adjustW ? (adjustX ? start.nodeW - totalDx : start.nodeW + totalDx) : start.nodeW;
        const newH = adjustH ? (adjustY ? start.nodeH - totalDy : start.nodeH + totalDy) : start.nodeH;
        const newX = adjustX ? start.nodeX + totalDx : undefined;
        const newY = adjustY ? start.nodeY + totalDy : undefined;
        setNodeSize(dragInfo.nodeId, newW, newH, newX, newY);
      } else if (dragInfo.isMulti) {
        // 複数選択: incremental delta（同期ref）
        const dx = (clientX - lastCursorRef.current.x) / z;
        const dy = (clientY - lastCursorRef.current.y) / z;
        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return false;

        if (!hasDraggedRef.current) {
          onDragEndRef.current?.();
          hasDraggedRef.current = true;
        }

        onMultiMove(dx, dy);
      } else {
        // 単体ノード: 初期位置 + 総デルタ（絶対値）
        const totalDx = (clientX - start.cursorX) / z;
        const totalDy = (clientY - start.cursorY) / z;
        if (Math.abs(totalDx) < threshold && Math.abs(totalDy) < threshold) return false;

        if (!hasDraggedRef.current) {
          onDragEndRef.current?.();
          hasDraggedRef.current = true;
        }

        setNodeLayout(dragInfo.nodeId, Math.round(start.nodeX + totalDx), Math.round(start.nodeY + totalDy));
      }

      lastCursorRef.current = { x: clientX, y: clientY };
      return true;
    };

    let rafId = 0;

    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyDrag(e.clientX, e.clientY, 1);
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0]!;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyDrag(touch.clientX, touch.clientY, 3);
      });
    };

    const handleUp = () => setDragInfo(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    window.addEventListener("touchcancel", handleUp);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [dragInfo, setNodeLayout, setNodeSize, onMultiMove]);

  return { handleNodeMouseDown, handleNodeResizeMouseDown, handleNodeTouchStart };
}
