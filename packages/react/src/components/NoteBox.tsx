import { useRef, useCallback, memo } from "react";
import type { DiagramNote } from "diagram-dsl-core";
import type { MouseEvent, TouchEvent as RTouchEvent } from "react";

interface NoteBoxProps {
  note: DiagramNote;
  isSelected?: boolean;
  onMouseDown?: (e: MouseEvent) => void;
  onTouchStart?: (e: RTouchEvent) => void;
  onDoubleClick?: () => void;
}

export const NoteBox = memo(
  function NoteBox({ note, isSelected, onMouseDown, onTouchStart, onDoubleClick }: NoteBoxProps) {
    const onMouseDownRef = useRef(onMouseDown);
    onMouseDownRef.current = onMouseDown;
    const onTouchStartRef = useRef(onTouchStart);
    onTouchStartRef.current = onTouchStart;
    const onDoubleClickRef = useRef(onDoubleClick);
    onDoubleClickRef.current = onDoubleClick;

    const handleMouseDown = useCallback((e: MouseEvent) => {
      onMouseDownRef.current?.(e);
    }, []);

    const handleTouchStart = useCallback((e: RTouchEvent) => {
      onTouchStartRef.current?.(e);
    }, []);

    const handleDoubleClick = useCallback(() => {
      onDoubleClickRef.current?.();
    }, []);

    const w = Math.max(note.text.length * 7 + 16, 80);
    return (
      <g
        style={{ cursor: onMouseDown ? "grab" : "default" }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
      >
        <rect
          x={note.x}
          y={note.y}
          width={w}
          height={28}
          rx={4}
          fill={note.color}
          fillOpacity={isSelected ? 0.35 : 0.15}
          stroke={note.color}
          strokeWidth={isSelected ? 2 : 1}
        />
        <text
          x={note.x + 8}
          y={note.y + 17}
          fill={note.color}
          fontSize={11}
          fontFamily="'IBM Plex Mono', monospace"
          className="pointer-events-none select-none"
        >
          {note.text}
        </text>
      </g>
    );
  },
  (prev, next) => prev.note === next.note && prev.isSelected === next.isSelected,
);
