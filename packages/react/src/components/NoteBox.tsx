import type { DiagramNote } from "diagram-dsl-core";

interface NoteBoxProps {
  note: DiagramNote;
}

export function NoteBox({ note }: NoteBoxProps) {
  return (
    <g>
      <rect
        x={note.x}
        y={note.y}
        width={Math.max(note.text.length * 7 + 16, 80)}
        height={28}
        rx={4}
        fill={note.color}
        fillOpacity={0.15}
        stroke={note.color}
        strokeWidth={1}
      />
      <text
        x={note.x + 8}
        y={note.y + 17}
        fill={note.color}
        fontSize={11}
        fontFamily="'IBM Plex Mono', monospace"
      >
        {note.text}
      </text>
    </g>
  );
}
