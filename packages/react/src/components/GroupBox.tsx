import { useRef, useCallback, memo } from "react";
import type { DiagramGroup } from "diagram-dsl-core";
import type { MouseEvent, TouchEvent as RTouchEvent } from "react";
import type { ResizeHandle } from "../hooks/useGroupDrag.js";

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
    const handleResizeE = useCallback((e: MouseEvent) => { onResizeRef.current(e, "e"); }, []);
    const handleResizeS = useCallback((e: MouseEvent) => { onResizeRef.current(e, "s"); }, []);
    const handleResizeSE = useCallback((e: MouseEvent) => { onResizeRef.current(e, "se"); }, []);
    const handleResizeTouchE = useCallback((e: RTouchEvent) => { onResizeTouchRef.current?.(e, "e"); }, []);
    const handleResizeTouchS = useCallback((e: RTouchEvent) => { onResizeTouchRef.current?.(e, "s"); }, []);
    const handleResizeTouchSE = useCallback((e: RTouchEvent) => { onResizeTouchRef.current?.(e, "se"); }, []);

    const { x, y, w, h, color, label } = group;

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
          style={{ pointerEvents: "none" }}
        />

        {isNested ? (
          <>
            {/* Header strip */}
            <rect x={x} y={y} width={w} height={HEADER_H} rx={12} fill="transparent" style={{ cursor: "grab" }} onMouseDown={handleMove} onTouchStart={handleMoveTouch} />
            {/* Left border */}
            <rect x={x} y={y + HEADER_H} width={FRAME_W} height={Math.max(0, h - HEADER_H)} fill="transparent" style={{ cursor: "grab" }} onMouseDown={handleMove} onTouchStart={handleMoveTouch} />
            {/* Right border */}
            <rect x={x + w - FRAME_W} y={y + HEADER_H} width={FRAME_W} height={Math.max(0, h - HEADER_H)} fill="transparent" style={{ cursor: "grab" }} onMouseDown={handleMove} onTouchStart={handleMoveTouch} />
            {/* Bottom border */}
            <rect x={x} y={y + h - FRAME_W} width={w} height={FRAME_W} fill="transparent" style={{ cursor: "grab" }} onMouseDown={handleMove} onTouchStart={handleMoveTouch} />
          </>
        ) : (
          <rect x={x} y={y} width={w} height={h} rx={12} fill="transparent" style={{ cursor: "grab" }} onMouseDown={handleMove} onTouchStart={handleMoveTouch} />
        )}

        <text
          x={x + 14}
          y={y + 20}
          fill={color}
          fontSize={12}
          fontFamily="'IBM Plex Mono', monospace"
          fontWeight="600"
          opacity={0.8}
          stroke="#0a0c12"
          strokeWidth={4}
          paintOrder="stroke"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {label}
        </text>

        {/* E handle - visible */}
        <rect
          x={x + w - HANDLE / 2}
          y={y + h / 2 - HANDLE / 2}
          width={HANDLE}
          height={HANDLE}
          rx={2}
          fill={color}
          fillOpacity={0.5}
          style={{ cursor: "e-resize", pointerEvents: "none" }}
        />
        {/* E handle - touch target */}
        <rect
          x={x + w - TOUCH_HANDLE / 2}
          y={y + h / 2 - TOUCH_HANDLE / 2}
          width={TOUCH_HANDLE}
          height={TOUCH_HANDLE}
          fill="transparent"
          style={{ cursor: "e-resize" }}
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
          style={{ cursor: "s-resize", pointerEvents: "none" }}
        />
        {/* S handle - touch target */}
        <rect
          x={x + w / 2 - TOUCH_HANDLE / 2}
          y={y + h - TOUCH_HANDLE / 2}
          width={TOUCH_HANDLE}
          height={TOUCH_HANDLE}
          fill="transparent"
          style={{ cursor: "s-resize" }}
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
          style={{ cursor: "se-resize", pointerEvents: "none" }}
        />
        {/* SE handle - touch target */}
        <rect
          x={x + w - TOUCH_HANDLE}
          y={y + h - TOUCH_HANDLE}
          width={TOUCH_HANDLE}
          height={TOUCH_HANDLE}
          fill="transparent"
          style={{ cursor: "se-resize" }}
          onMouseDown={handleResizeSE}
          onTouchStart={handleResizeTouchSE}
        />
      </g>
    );
  },
  (prev, next) => prev.group === next.group && prev.isSelected === next.isSelected && prev.isNested === next.isNested,
);
