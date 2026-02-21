import type { DiagramNote } from "diagram-dsl-core";
import type { MouseEvent } from "react";

interface NoteBoxProps {
  note: DiagramNote;
  isSelected?: boolean;
  onMouseDown?: (e: MouseEvent) => void;
}

export function NoteBox({ note, isSelected, onMouseDown }: NoteBoxProps) {
  const w = Math.max(note.text.length * 7 + 16, 80);
  return (
    <g style={{ cursor: onMouseDown ? "grab" : "default" }} onMouseDown={onMouseDown}>
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
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {note.text}
      </text>
    </g>
  );
}
