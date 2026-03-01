import { memo } from "react";
import type { DiagramNode, DiagramEdge } from "~/lib/core";
import { getEdgePoints, buildEdgePath } from "~/lib/core";

interface EdgeLineProps {
  edge: DiagramEdge;
  fromNode: DiagramNode | undefined;
  toNode: DiagramNode | undefined;
  isPlaying?: boolean;
  onMoveMouseDown?: (e: React.MouseEvent, fromId: string, toId: string) => void;
  onEndpointMouseDown?: (e: React.MouseEvent, fromId: string, toId: string, end: "from" | "to") => void;
  onDoubleClick?: () => void;
}

export const EdgeLine = memo(
  function EdgeLine({ edge, fromNode, toNode, isPlaying, onMoveMouseDown, onEndpointMouseDown, onDoubleClick }: EdgeLineProps) {
    if (!fromNode || !toNode) return null;
    const { from, to } = getEdgePoints(fromNode, toNode);
    const { label, color, style, animate, thickness, arrow, curve, bendX, bendY } = edge;
    const safeColor = color.replace("#", "");

    const { pathD, labelX, labelY } = buildEdgePath(from, to, curve, bendX, bendY);

    const hasEndMarker = arrow === "end" || arrow === "both";
    const hasStartMarker = arrow === "start" || arrow === "both";
    const pathTransition = isPlaying ? { transition: "d 300ms ease-out" } : undefined;

    return (
      <g className="edge-group">
        {/* 透明なヒットエリア(太いパスで掴みやすくする) */}
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={14}
          style={pathTransition}
          className="cursor-move"
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
          markerEnd={hasEndMarker ? `url(#ah-end-${safeColor})` : undefined}
          markerStart={hasStartMarker ? `url(#ah-start-${safeColor})` : undefined}
          style={pathTransition}
          className={animate ? "edge-animate pointer-events-none" : "pointer-events-none"}
        />

        {/* ラベル */}
        {label && (
          <g className="pointer-events-none">
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

        {/* 端点ドラッグハンドル(CSS :hover で表示) */}
        <g className="edge-endpoints" style={{ opacity: 0 }}>
          <circle
            cx={from.x}
            cy={from.y}
            r={5}
            fill="#6366f1"
            stroke="#fff"
            strokeWidth={1.5}
            className="cursor-crosshair"
            onMouseDown={(e) => onEndpointMouseDown?.(e, edge.from, edge.to, "from")}
          />
          <circle
            cx={to.x}
            cy={to.y}
            r={5}
            fill="#6366f1"
            stroke="#fff"
            strokeWidth={1.5}
            className="cursor-crosshair"
            onMouseDown={(e) => onEndpointMouseDown?.(e, edge.from, edge.to, "to")}
          />
        </g>
      </g>
    );
  },
  (prev, next) =>
    prev.edge === next.edge &&
    prev.fromNode?.x === next.fromNode?.x &&
    prev.fromNode?.y === next.fromNode?.y &&
    prev.fromNode?.w === next.fromNode?.w &&
    prev.fromNode?.h === next.fromNode?.h &&
    prev.fromNode?.shape === next.fromNode?.shape &&
    prev.toNode?.x === next.toNode?.x &&
    prev.toNode?.y === next.toNode?.y &&
    prev.toNode?.w === next.toNode?.w &&
    prev.toNode?.h === next.toNode?.h &&
    prev.toNode?.shape === next.toNode?.shape &&
    prev.isPlaying === next.isPlaying &&
    prev.onMoveMouseDown === next.onMoveMouseDown &&
    prev.onEndpointMouseDown === next.onEndpointMouseDown &&
    prev.onDoubleClick === next.onDoubleClick,
);
