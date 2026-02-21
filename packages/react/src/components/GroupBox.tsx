import { useRef, useCallback, memo } from "react";
import type { DiagramGroup } from "diagram-dsl-core";
import type { MouseEvent } from "react";
import type { ResizeHandle } from "../hooks/useGroupDrag.js";

interface GroupBoxProps {
  group: DiagramGroup;
  isSelected?: boolean;
  onMoveMouseDown: (e: MouseEvent) => void;
  onResizeMouseDown: (e: MouseEvent, handle: ResizeHandle) => void;
}

const HANDLE = 8;

export const GroupBox = memo(
  function GroupBox({ group, isSelected, onMoveMouseDown, onResizeMouseDown }: GroupBoxProps) {
    const onMoveRef = useRef(onMoveMouseDown);
    onMoveRef.current = onMoveMouseDown;
    const onResizeRef = useRef(onResizeMouseDown);
    onResizeRef.current = onResizeMouseDown;

    const handleMove = useCallback((e: MouseEvent) => { onMoveRef.current(e); }, []);
    const handleResizeE = useCallback((e: MouseEvent) => { onResizeRef.current(e, "e"); }, []);
    const handleResizeS = useCallback((e: MouseEvent) => { onResizeRef.current(e, "s"); }, []);
    const handleResizeSE = useCallback((e: MouseEvent) => { onResizeRef.current(e, "se"); }, []);

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

        <rect
          x={x}
          y={y}
          width={w}
          height={30}
          rx={12}
          fill="transparent"
          style={{ cursor: "grab" }}
          onMouseDown={handleMove}
        />

        <text
          x={x + 14}
          y={y + 20}
          fill={color}
          fontSize={12}
          fontFamily="'IBM Plex Mono', monospace"
          fontWeight="600"
          opacity={0.8}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {label}
        </text>

        <rect
          x={x + w - HANDLE / 2}
          y={y + h / 2 - HANDLE / 2}
          width={HANDLE}
          height={HANDLE}
          rx={2}
          fill={color}
          fillOpacity={0.5}
          style={{ cursor: "e-resize" }}
          onMouseDown={handleResizeE}
        />

        <rect
          x={x + w / 2 - HANDLE / 2}
          y={y + h - HANDLE / 2}
          width={HANDLE}
          height={HANDLE}
          rx={2}
          fill={color}
          fillOpacity={0.5}
          style={{ cursor: "s-resize" }}
          onMouseDown={handleResizeS}
        />

        <rect
          x={x + w - HANDLE}
          y={y + h - HANDLE}
          width={HANDLE}
          height={HANDLE}
          rx={2}
          fill={color}
          fillOpacity={0.8}
          style={{ cursor: "se-resize" }}
          onMouseDown={handleResizeSE}
        />
      </g>
    );
  },
  (prev, next) => prev.group === next.group && prev.isSelected === next.isSelected,
);
