import { memo, useState } from "react";
import type { DiagramNode, DiagramEdge } from "diagram-dsl-core";
import { getEdgePoints, buildEdgePath } from "diagram-dsl-core";

interface EdgeLineProps {
  edge: DiagramEdge;
  fromNode: DiagramNode | undefined;
  toNode: DiagramNode | undefined;
  onMoveMouseDown?: (e: React.MouseEvent, fromId: string, toId: string) => void;
  onEndpointMouseDown?: (e: React.MouseEvent, fromId: string, toId: string, end: "from" | "to") => void;
  onDoubleClick?: () => void;
}

export const EdgeLine = memo(
  function EdgeLine({ edge, fromNode, toNode, onMoveMouseDown, onEndpointMouseDown, onDoubleClick }: EdgeLineProps) {
    const [hovered, setHovered] = useState(false);
    if (!fromNode || !toNode) return null;
    const { from, to } = getEdgePoints(fromNode, toNode);
    const { label, color, style, animate, thickness, arrow, curve, bendX, bendY } = edge;
    const id = `edge-${edge.from}-${edge.to}`;

    const { pathD, labelX, labelY } = buildEdgePath(from, to, curve, bendX, bendY);

    const hasEndMarker = arrow === "end" || arrow === "both";
    const hasStartMarker = arrow === "start" || arrow === "both";

    return (
      <g
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <defs>
          {hasEndMarker && (
            <marker
              id={`ah-${id}`}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={color} />
            </marker>
          )}
          {hasStartMarker && (
            <marker
              id={`ah-start-${id}`}
              markerWidth="10"
              markerHeight="7"
              refX="1"
              refY="3.5"
              orient="auto"
            >
              <polygon points="10 0, 0 3.5, 10 7" fill={color} />
            </marker>
          )}
        </defs>

        {/* 透明なヒットエリア(太いパスで掴みやすくする) */}
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={14}
          style={{ cursor: "move" }}
          onMouseDown={(e) => onMoveMouseDown?.(e, edge.from, edge.to)}
          onDoubleClick={onDoubleClick}
        />

        {/* 実際のエッジ線 */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={style === "dashed" ? "8,4" : "none"}
          markerEnd={hasEndMarker ? `url(#ah-${id})` : undefined}
          markerStart={hasStartMarker ? `url(#ah-start-${id})` : undefined}
          className={animate ? "edge-animate" : ""}
          style={{ pointerEvents: "none" }}
        />

        {/* ラベル */}
        {label && (
          <g style={{ pointerEvents: "none" }}>
            <rect
              x={labelX - label.length * 4 - 4}
              y={labelY - 10}
              width={label.length * 8 + 8}
              height={20}
              rx={4}
              fill="#0f172a"
              fillOpacity={0.85}
            />
            <text
              x={labelX}
              y={labelY + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#e2e8f0"
              fontSize={11}
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight="500"
            >
              {label}
            </text>
          </g>
        )}

        {/* 端点ドラッグハンドル(ホバー時のみ表示) */}
        {hovered && (
          <>
            <circle
              cx={from.x}
              cy={from.y}
              r={5}
              fill="#6366f1"
              stroke="#fff"
              strokeWidth={1.5}
              style={{ cursor: "crosshair" }}
              onMouseDown={(e) => onEndpointMouseDown?.(e, edge.from, edge.to, "from")}
            />
            <circle
              cx={to.x}
              cy={to.y}
              r={5}
              fill="#6366f1"
              stroke="#fff"
              strokeWidth={1.5}
              style={{ cursor: "crosshair" }}
              onMouseDown={(e) => onEndpointMouseDown?.(e, edge.from, edge.to, "to")}
            />
          </>
        )}
      </g>
    );
  },
  (prev, next) =>
    prev.edge === next.edge &&
    prev.fromNode === next.fromNode &&
    prev.toNode === next.toNode &&
    prev.onMoveMouseDown === next.onMoveMouseDown &&
    prev.onEndpointMouseDown === next.onEndpointMouseDown &&
    prev.onDoubleClick === next.onDoubleClick,
);
