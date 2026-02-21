import type { DiagramGroup } from "../types";

interface GroupBoxProps {
  group: DiagramGroup;
}

export function GroupBox({ group }: GroupBoxProps) {
  return (
    <g>
      <rect
        x={group.x}
        y={group.y}
        width={group.w}
        height={group.h}
        rx={12}
        fill={group.color}
        fillOpacity={0.1}
        stroke={group.color}
        strokeWidth={1.5}
        strokeDasharray="8,4"
      />
      <text
        x={group.x + 14}
        y={group.y + 20}
        fill={group.color}
        fontSize={12}
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight="600"
        opacity={0.8}
      >
        {group.label}
      </text>
    </g>
  );
}
