import { useState, useEffect, useRef, useCallback } from "react";
import type { DiagramGroup } from "diagram-dsl-core";

export type ResizeHandle = "n" | "s" | "w" | "e" | "se";

interface GroupDragInfo {
  groupId: string;
  type: "move" | "resize";
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
  isMulti: boolean;
}

export function useGroupDrag(
  groupById: Record<string, DiagramGroup>,
  zoom: number,
  selectedIds: Set<string>,
  setGroupLayout: (groupId: string, dx: number, dy: number) => void,
  setGroupSize: (groupId: string, newW: number, newH: number, newX?: number, newY?: number) => void,
  onMultiMove: (dx: number, dy: number) => void,
) {
  const [dragInfo, setDragInfo] = useState<GroupDragInfo | null>(null);

  const groupByIdRef = useRef(groupById);
  groupByIdRef.current = groupById;

  const handleGroupMoveMouseDown = (e: React.MouseEvent, groupId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const isMulti = selectedIds.size > 1 && selectedIds.has(groupId);
    setDragInfo({ groupId, type: "move", startClientX: e.clientX, startClientY: e.clientY, isMulti });
  };

  const handleGroupMoveTouchStart = useCallback((e: React.TouchEvent, groupId: string) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0]!;
    const isMulti = selectedIds.size > 1 && selectedIds.has(groupId);
    setDragInfo({ groupId, type: "move", startClientX: touch.clientX, startClientY: touch.clientY, isMulti });
  }, [selectedIds]);

  const handleGroupResizeMouseDown = (
    e: React.MouseEvent,
    groupId: string,
    handle: ResizeHandle,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDragInfo({ groupId, type: "resize", handle, startClientX: e.clientX, startClientY: e.clientY, isMulti: false });
  };

  const handleGroupResizeTouchStart = useCallback((
    e: React.TouchEvent,
    groupId: string,
    handle: ResizeHandle,
  ) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0]!;
    setDragInfo({ groupId, type: "resize", handle, startClientX: touch.clientX, startClientY: touch.clientY, isMulti: false });
  }, []);

  useEffect(() => {
    if (!dragInfo) return;

    const applyDrag = (clientX: number, clientY: number) => {
      const dx = (clientX - dragInfo.startClientX) / zoom;
      const dy = (clientY - dragInfo.startClientY) / zoom;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return false;

      if (dragInfo.type === "move") {
        if (dragInfo.isMulti) {
          onMultiMove(dx, dy);
        } else {
          setGroupLayout(dragInfo.groupId, dx, dy);
        }
      } else {
        const g = groupByIdRef.current[dragInfo.groupId];
        if (!g) return false;
        const handle = dragInfo.handle ?? "se";
        const adjustX = handle === "w";
        const adjustY = handle === "n";
        const adjustW = handle === "e" || handle === "w" || handle === "se";
        const adjustH = handle === "n" || handle === "s" || handle === "se";
        const newW = adjustW ? Math.max(120, adjustX ? g.w - dx : g.w + dx) : g.w;
        const newH = adjustH ? Math.max(80, adjustY ? g.h - dy : g.h + dy) : g.h;
        const newX = adjustX && newW > 120 ? g.x + dx : undefined;
        const newY = adjustY && newH > 80 ? g.y + dy : undefined;
        setGroupSize(dragInfo.groupId, newW, newH, newX, newY);
      }
      return true;
    };

    let rafId = 0;

    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (applyDrag(e.clientX, e.clientY)) {
          setDragInfo((d) => d ? { ...d, startClientX: e.clientX, startClientY: e.clientY } : null);
        }
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0]!;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (applyDrag(touch.clientX, touch.clientY)) {
          setDragInfo((d) => d ? { ...d, startClientX: touch.clientX, startClientY: touch.clientY } : null);
        }
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
  }, [dragInfo, zoom, setGroupLayout, setGroupSize, onMultiMove]);

  return { handleGroupMoveMouseDown, handleGroupMoveTouchStart, handleGroupResizeMouseDown, handleGroupResizeTouchStart };
}
