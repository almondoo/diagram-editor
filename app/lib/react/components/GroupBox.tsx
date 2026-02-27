import { useRef, useCallback, memo } from "react";
import type { DiagramGroup } from "~/lib/core";
import type { MouseEvent, TouchEvent as RTouchEvent } from "react";
import type { ResizeHandle } from "../hooks/useGroupDrag";

interface GroupBoxProps {
  group: DiagramGroup;
  isSelected?: boolean;
  isNested?: boolean;
  onMoveMouseDown: (e: MouseEvent) => void;
  onMoveTouchStart?: (e: RTouchEvent) => void;
  onResizeMouseDown: (e: MouseEvent, handle: ResizeHandle) => void;
  onResizeTouchStart?: (e: RTouchEvent, handle: ResizeHandle) => void;
}

const HANDLE = 8;
const TOUCH_HANDLE = 28;
const HEADER_H = 26;
const FRAME_W = 12;

export const GroupBox = memo(
  function GroupBox({ group, isSelected, isNested, onMoveMouseDown, onMoveTouchStart, onResizeMouseDown, onResizeTouchStart }: GroupBoxProps) {
    const onMoveRef = useRef(onMoveMouseDown);
    onMoveRef.current = onMoveMouseDown;
    const onMoveTouchRef = useRef(onMoveTouchStart);
    onMoveTouchRef.current = onMoveTouchStart;
    const onResizeRef = useRef(onResizeMouseDown);
    onResizeRef.current = onResizeMouseDown;
    const onResizeTouchRef = useRef(onResizeTouchStart);
    onResizeTouchRef.current = onResizeTouchStart;

    const handleMove = useCallback((e: MouseEvent) => { onMoveRef.current(e); }, []);
    const handleMoveTouch = useCallback((e: RTouchEvent) => { onMoveTouchRef.current?.(e); }, []);
    const handleResizeN = useCallback((e: MouseEvent) => { onResizeRef.current(e, "n"); }, []);
    const handleResizeW = useCallback((e: MouseEvent) => { onResizeRef.current(e, "w"); }, []);
    const handleResizeE = useCallback((e: MouseEvent) => { onResizeRef.current(e, "e"); }, []);
    const handleResizeS = useCallback((e: MouseEvent) => { onResizeRef.current(e, "s"); }, []);
    const handleResizeSE = useCallback((e: MouseEvent) => { onResizeRef.current(e, "se"); }, []);
    const handleResizeTouchN = useCallback((e: RTouchEvent) => { onResizeTouchRef.current?.(e, "n"); }, []);
    const handleResizeTouchW = useCallback((e: RTouchEvent) => { onResizeTouchRef.current?.(e, "w"); }, []);
    const handleResizeTouchE = useCallback((e: RTouchEvent) => { onResizeTouchRef.current?.(e, "e"); }, []);
    const handleResizeTouchS = useCallback((e: RTouchEvent) => { onResizeTouchRef.current?.(e, "s"); }, []);
    const handleResizeTouchSE = useCallback((e: RTouchEvent) => { onResizeTouchRef.current?.(e, "se"); }, []);

    const { x, y, w, h, color } = group;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={12}
          fill={color}
          fillOpacity={isSelected ? 0.15 : 0.08}
          stroke={color}
          strokeWidth={isSelected ? 2.5 : 1.5}
          strokeDasharray="8,4"
          className="pointer-events-none"
        />

        {isNested ? (
          <>
            {/* Header strip */}
            <rect x={x} y={y} width={w} height={HEADER_H} rx={12} fill="transparent" className="cursor-grab" onMouseDown={handleMove} onTouchStart={handleMoveTouch} />
            {/* Left border */}
            <rect x={x} y={y + HEADER_H} width={FRAME_W} height={Math.max(0, h - HEADER_H)} fill="transparent" className="cursor-grab" onMouseDown={handleMove} onTouchStart={handleMoveTouch} />
            {/* Right border */}
            <rect x={x + w - FRAME_W} y={y + HEADER_H} width={FRAME_W} height={Math.max(0, h - HEADER_H)} fill="transparent" className="cursor-grab" onMouseDown={handleMove} onTouchStart={handleMoveTouch} />
            {/* Bottom border */}
            <rect x={x} y={y + h - FRAME_W} width={w} height={FRAME_W} fill="transparent" className="cursor-grab" onMouseDown={handleMove} onTouchStart={handleMoveTouch} />
          </>
        ) : (
          <rect x={x} y={y} width={w} height={h} rx={12} fill="transparent" className="cursor-grab" onMouseDown={handleMove} onTouchStart={handleMoveTouch} />
        )}

        {/* N handle - visible */}
        <rect
          x={x + w / 2 - HANDLE / 2}
          y={y - HANDLE / 2}
          width={HANDLE}
          height={HANDLE}
          rx={2}
          fill={color}
          fillOpacity={0.5}
          className="pointer-events-none"
        />
        {/* N handle - touch target */}
        <rect
          x={x + TOUCH_HANDLE}
          y={y - TOUCH_HANDLE / 2}
          width={w - TOUCH_HANDLE * 2}
          height={TOUCH_HANDLE}
          fill="transparent"
          className="cursor-n-resize"
          onMouseDown={handleResizeN}
          onTouchStart={handleResizeTouchN}
        />

        {/* W handle - visible */}
        <rect
          x={x - HANDLE / 2}
          y={y + h / 2 - HANDLE / 2}
          width={HANDLE}
          height={HANDLE}
          rx={2}
          fill={color}
          fillOpacity={0.5}
          className="pointer-events-none"
        />
        {/* W handle - touch target */}
        <rect
          x={x - TOUCH_HANDLE / 2}
          y={y + TOUCH_HANDLE}
          width={TOUCH_HANDLE}
          height={h - TOUCH_HANDLE * 2}
          fill="transparent"
          className="cursor-w-resize"
          onMouseDown={handleResizeW}
          onTouchStart={handleResizeTouchW}
        />

        {/* E handle - visible */}
        <rect
          x={x + w - HANDLE / 2}
          y={y + h / 2 - HANDLE / 2}
          width={HANDLE}
          height={HANDLE}
          rx={2}
          fill={color}
          fillOpacity={0.5}
          className="pointer-events-none"
        />
        {/* E handle - touch target */}
        <rect
          x={x + w - TOUCH_HANDLE / 2}
          y={y + TOUCH_HANDLE}
          width={TOUCH_HANDLE}
          height={h - TOUCH_HANDLE * 2}
          fill="transparent"
          className="cursor-e-resize"
          onMouseDown={handleResizeE}
          onTouchStart={handleResizeTouchE}
        />

        {/* S handle - visible */}
        <rect
          x={x + w / 2 - HANDLE / 2}
          y={y + h - HANDLE / 2}
          width={HANDLE}
          height={HANDLE}
          rx={2}
          fill={color}
          fillOpacity={0.5}
          className="pointer-events-none"
        />
        {/* S handle - touch target */}
        <rect
          x={x + TOUCH_HANDLE}
          y={y + h - TOUCH_HANDLE / 2}
          width={w - TOUCH_HANDLE * 2}
          height={TOUCH_HANDLE}
          fill="transparent"
          className="cursor-s-resize"
          onMouseDown={handleResizeS}
          onTouchStart={handleResizeTouchS}
        />

        {/* SE handle - visible */}
        <rect
          x={x + w - HANDLE}
          y={y + h - HANDLE}
          width={HANDLE}
          height={HANDLE}
          rx={2}
          fill={color}
          fillOpacity={0.8}
          className="pointer-events-none"
        />
        {/* SE handle - touch target */}
        <rect
          x={x + w - TOUCH_HANDLE}
          y={y + h - TOUCH_HANDLE}
          width={TOUCH_HANDLE}
          height={TOUCH_HANDLE}
          fill="transparent"
          className="cursor-se-resize"
          onMouseDown={handleResizeSE}
          onTouchStart={handleResizeTouchSE}
        />
      </g>
    );
  },
  (prev, next) => prev.group === next.group && prev.isSelected === next.isSelected && prev.isNested === next.isNested,
);
