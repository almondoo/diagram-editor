import type { DiagramNode, DiagramEdge } from "../types";

export function getNodeCenter(n: DiagramNode): { x: number; y: number } {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

export function getEdgePoints(
  fromNode: DiagramNode,
  toNode: DiagramNode
): { from: { x: number; y: number }; to: { x: number; y: number } } {
  const fc = getNodeCenter(fromNode);
  const tc = getNodeCenter(toNode);
  const dx = tc.x - fc.x;
  const dy = tc.y - fc.y;
  const angle = Math.atan2(dy, dx);

  const fw = fromNode.w / 2;
  const fh = fromNode.h / 2;
  const tw = toNode.w / 2;
  const th = toNode.h / 2;

  function borderPoint(cx: number, cy: number, hw: number, hh: number, ang: number) {
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const t = Math.min(
      Math.abs(cos) > 0.001 ? Math.abs(hw / cos) : 9999,
      Math.abs(sin) > 0.001 ? Math.abs(hh / sin) : 9999
    );
    return { x: cx + cos * t, y: cy + sin * t };
  }

  const from = borderPoint(fc.x, fc.y, fw, fh, angle);
  const to = borderPoint(tc.x, tc.y, tw, th, angle + Math.PI);
  return { from, to };
}

interface EdgeLineProps {
  edge: DiagramEdge;
  fromNode: DiagramNode | undefined;
  toNode: DiagramNode | undefined;
}

export function EdgeLine({ edge, fromNode, toNode }: EdgeLineProps) {
  if (!fromNode || !toNode) return null;
  const { from, to } = getEdgePoints(fromNode, toNode);
  const { label, color, style, animate, thickness, arrow, curve } = edge;
  const id = `edge-${edge.from}-${edge.to}-${Math.random().toString(36).slice(2, 6)}`;

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const perpX = -dy * 0.08;
  const perpY = dx * 0.08;

  const pathD =
    curve === "straight"
      ? `M${from.x},${from.y} L${to.x},${to.y}`
      : `M${from.x},${from.y} Q${midX + perpX},${midY + perpY} ${to.x},${to.y}`;

  return (
    <g>
      <defs>
        {(arrow === "end" || arrow === "both" || !arrow) && (
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
        {arrow === "both" && (
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
        markerEnd={arrow !== "none" ? `url(#ah-${id})` : undefined}
        markerStart={arrow === "both" ? `url(#ah-start-${id})` : undefined}
        className={animate ? "edge-animate" : ""}
      />
      {label && (
        <g>
          <rect
            x={midX + perpX / 2 - label.length * 4 - 4}
            y={midY + perpY / 2 - 10}
            width={label.length * 8 + 8}
            height={20}
            rx={4}
            fill="#0f172a"
            fillOpacity={0.85}
          />
          <text
            x={midX + perpX / 2}
            y={midY + perpY / 2 + 1}
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
}
