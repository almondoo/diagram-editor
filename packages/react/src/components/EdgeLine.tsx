import { memo } from "react";
import type { DiagramNode, DiagramEdge } from "diagram-dsl-core";
import { getEdgePoints, buildEdgePath } from "diagram-dsl-core";

interface EdgeLineProps {
  edge: DiagramEdge;
  fromNode: DiagramNode | undefined;
  toNode: DiagramNode | undefined;
}

export const EdgeLine = memo(
  function EdgeLine({ edge, fromNode, toNode }: EdgeLineProps) {
    if (!fromNode || !toNode) return null;
    const { from, to } = getEdgePoints(fromNode, toNode);
    const { label, color, style, animate, thickness, arrow, curve, _routePoints } = edge;
    const id = `edge-${edge.from}-${edge.to}`;

    const { pathD, labelX, labelY } = buildEdgePath(from, to, curve, _routePoints);

    const hasEndMarker = arrow === "end" || arrow === "both";
    const hasStartMarker = arrow === "start" || arrow === "both";

    return (
      <g>
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
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={style === "dashed" ? "8,4" : "none"}
          markerEnd={hasEndMarker ? `url(#ah-${id})` : undefined}
          markerStart={hasStartMarker ? `url(#ah-start-${id})` : undefined}
          className={animate ? "edge-animate" : ""}
        />
        {label && (
          <g>
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
      </g>
    );
  },
  (prev, next) =>
    prev.edge === next.edge &&
    prev.fromNode === next.fromNode &&
    prev.toNode === next.toNode,
);
