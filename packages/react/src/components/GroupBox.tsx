import type { DiagramGroup } from "diagram-dsl-core";
import type { MouseEvent } from "react";
import type { ResizeHandle } from "../hooks/useGroupDrag.js";

interface GroupBoxProps {
  group: DiagramGroup;
  isSelected?: boolean;
  onMoveMouseDown: (e: MouseEvent) => void;
  onResizeMouseDown: (e: MouseEvent, handle: ResizeHandle) => void;
}

const HANDLE = 8; // リサイズハンドルのサイズ

export function GroupBox({ group, isSelected, onMoveMouseDown, onResizeMouseDown }: GroupBoxProps) {
  const { x, y, w, h, color, label } = group;

  return (
    <g>
      {/* グループ枠 */}
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

      {/* ドラッグエリア（ヘッダー部分） */}
      <rect
        x={x}
        y={y}
        width={w}
        height={30}
        rx={12}
        fill="transparent"
        style={{ cursor: "grab" }}
        onMouseDown={onMoveMouseDown}
      />

      {/* グループラベル */}
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

      {/* リサイズハンドル: 右辺中央 (E) */}
      <rect
        x={x + w - HANDLE / 2}
        y={y + h / 2 - HANDLE / 2}
        width={HANDLE}
        height={HANDLE}
        rx={2}
        fill={color}
        fillOpacity={0.5}
        style={{ cursor: "e-resize" }}
        onMouseDown={(e) => onResizeMouseDown(e, "e")}
      />

      {/* リサイズハンドル: 下辺中央 (S) */}
      <rect
        x={x + w / 2 - HANDLE / 2}
        y={y + h - HANDLE / 2}
        width={HANDLE}
        height={HANDLE}
        rx={2}
        fill={color}
        fillOpacity={0.5}
        style={{ cursor: "s-resize" }}
        onMouseDown={(e) => onResizeMouseDown(e, "s")}
      />

      {/* リサイズハンドル: 右下角 (SE) */}
      <rect
        x={x + w - HANDLE}
        y={y + h - HANDLE}
        width={HANDLE}
        height={HANDLE}
        rx={2}
        fill={color}
        fillOpacity={0.8}
        style={{ cursor: "se-resize" }}
        onMouseDown={(e) => onResizeMouseDown(e, "se")}
      />
    </g>
  );
}
