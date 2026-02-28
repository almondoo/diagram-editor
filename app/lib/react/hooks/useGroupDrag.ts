import { useState, useEffect, useRef, useCallback } from "react";
import type { DiagramGroup } from "~/lib/core";

export type ResizeHandle = "n" | "s" | "w" | "e" | "se";

interface GroupDragInfo {
  groupId: string;
  type: "move" | "resize";
  handle?: ResizeHandle;
  isMulti: boolean;
}

export function useGroupDrag(
  groupById: Record<string, DiagramGroup>,
  zoom: number,
  selectedIds: Set<string>,
  setGroupLayout: (groupId: string, dx: number, dy: number) => void,
  setGroupSize: (groupId: string, newW: number, newH: number, newX?: number, newY?: number) => void,
  onMultiMove: (dx: number, dy: number) => void,
  onDragEnd?: () => void,
) {
  const [dragInfo, setDragInfo] = useState<GroupDragInfo | null>(null);

  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const hasDraggedRef = useRef(false);

  // ドラッグ開始時の初期値（同期的に参照）
  const dragStartRef = useRef<{
    cursorX: number;
    cursorY: number;
    groupX: number;
    groupY: number;
    groupW: number;
    groupH: number;
  } | null>(null);
  // 最後に処理したカーソル位置（incremental delta用）
  const lastCursorRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const handleGroupMoveMouseDown = (e: React.MouseEvent, groupId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const group = groupById[groupId];
    if (!group) return;
    const isMulti = selectedIds.size > 1 && selectedIds.has(groupId);
    dragStartRef.current = {
      cursorX: e.clientX, cursorY: e.clientY,
      groupX: group.x, groupY: group.y, groupW: group.w, groupH: group.h,
    };
    lastCursorRef.current = { x: e.clientX, y: e.clientY };
    setDragInfo({ groupId, type: "move", isMulti });
  };

  const handleGroupMoveTouchStart = useCallback((e: React.TouchEvent, groupId: string) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0]!;
    const group = groupById[groupId];
    if (!group) return;
    const isMulti = selectedIds.size > 1 && selectedIds.has(groupId);
    dragStartRef.current = {
      cursorX: touch.clientX, cursorY: touch.clientY,
      groupX: group.x, groupY: group.y, groupW: group.w, groupH: group.h,
    };
    lastCursorRef.current = { x: touch.clientX, y: touch.clientY };
    setDragInfo({ groupId, type: "move", isMulti });
  }, [selectedIds, groupById]);

  const handleGroupResizeMouseDown = (
    e: React.MouseEvent,
    groupId: string,
    handle: ResizeHandle,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const group = groupById[groupId];
    if (!group) return;
    dragStartRef.current = {
      cursorX: e.clientX, cursorY: e.clientY,
      groupX: group.x, groupY: group.y, groupW: group.w, groupH: group.h,
    };
    lastCursorRef.current = { x: e.clientX, y: e.clientY };
    setDragInfo({ groupId, type: "resize", handle, isMulti: false });
  };

  const handleGroupResizeTouchStart = useCallback((
    e: React.TouchEvent,
    groupId: string,
    handle: ResizeHandle,
  ) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0]!;
    const group = groupById[groupId];
    if (!group) return;
    dragStartRef.current = {
      cursorX: touch.clientX, cursorY: touch.clientY,
      groupX: group.x, groupY: group.y, groupW: group.w, groupH: group.h,
    };
    lastCursorRef.current = { x: touch.clientX, y: touch.clientY };
    setDragInfo({ groupId, type: "resize", handle, isMulti: false });
  }, [groupById]);

  useEffect(() => {
    if (!dragInfo) return;
    hasDraggedRef.current = false;

    const applyDrag = (clientX: number, clientY: number) => {
      const start = dragStartRef.current;
      if (!start) return false;
      const z = zoomRef.current;

      if (dragInfo.type === "move") {
        // 移動: incremental delta（同期ref）
        const dx = (clientX - lastCursorRef.current.x) / z;
        const dy = (clientY - lastCursorRef.current.y) / z;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return false;

        if (!hasDraggedRef.current) {
          onDragEndRef.current?.();
          hasDraggedRef.current = true;
        }

        if (dragInfo.isMulti) {
          onMultiMove(dx, dy);
        } else {
          setGroupLayout(dragInfo.groupId, dx, dy);
        }
      } else {
        // リサイズ: 初期値 + 総デルタ（絶対値）
        const totalDx = (clientX - start.cursorX) / z;
        const totalDy = (clientY - start.cursorY) / z;
        if (Math.abs(totalDx) < 1 && Math.abs(totalDy) < 1) return false;

        if (!hasDraggedRef.current) {
          onDragEndRef.current?.();
          hasDraggedRef.current = true;
        }

        const handle = dragInfo.handle ?? "se";
        const adjustX = handle === "w";
        const adjustY = handle === "n";
        const adjustW = handle === "e" || handle === "w" || handle === "se";
        const adjustH = handle === "n" || handle === "s" || handle === "se";
        const newW = adjustW ? Math.max(120, adjustX ? start.groupW - totalDx : start.groupW + totalDx) : start.groupW;
        const newH = adjustH ? Math.max(80, adjustY ? start.groupH - totalDy : start.groupH + totalDy) : start.groupH;
        const newX = adjustX && newW > 120 ? start.groupX + totalDx : undefined;
        const newY = adjustY && newH > 80 ? start.groupY + totalDy : undefined;
        setGroupSize(dragInfo.groupId, newW, newH, newX, newY);
      }

      lastCursorRef.current = { x: clientX, y: clientY };
      return true;
    };

    let rafId = 0;

    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyDrag(e.clientX, e.clientY);
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0]!;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyDrag(touch.clientX, touch.clientY);
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
  }, [dragInfo, setGroupLayout, setGroupSize, onMultiMove]);

  return { handleGroupMoveMouseDown, handleGroupMoveTouchStart, handleGroupResizeMouseDown, handleGroupResizeTouchStart };
}
