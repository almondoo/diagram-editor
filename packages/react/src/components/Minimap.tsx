import type { DiagramNode, ViewBox } from "diagram-dsl-core";

interface MinimapProps {
  nodes: DiagramNode[];
  viewBox: ViewBox;
  canvasW: number;
  canvasH: number;
}

export function Minimap({ nodes, viewBox, canvasW, canvasH }: MinimapProps) {
  const mapW = 160;
  const mapH = 100;
  const allX = nodes.map((n) => n.x).concat([0]);
  const allY = nodes.map((n) => n.y).concat([0]);
  const allX2 = nodes.map((n) => n.x + n.w).concat([canvasW]);
  const allY2 = nodes.map((n) => n.y + n.h).concat([canvasH]);
  const minX = Math.min(...allX) - 20;
  const minY = Math.min(...allY) - 20;
  const maxX = Math.max(...allX2) + 20;
  const maxY = Math.max(...allY2) + 20;
  const rangeW = maxX - minX || 1;
  const rangeH = maxY - minY || 1;
  const scale = Math.min(mapW / rangeW, mapH / rangeH);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        right: 10,
        width: mapW,
        height: mapH,
        background: "rgba(15,18,25,0.9)",
        border: "1px solid #2d3548",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <svg width={mapW} height={mapH}>
        {nodes.map((n) => (
          <rect
            key={n.id}
            x={(n.x - minX) * scale + 2}
            y={(n.y - minY) * scale + 2}
            width={Math.max(n.w * scale, 3)}
            height={Math.max(n.h * scale, 2)}
            fill={n.color}
            rx={1}
            opacity={0.8}
          />
        ))}
        <rect
          x={(viewBox.x - minX) * scale + 2}
          y={(viewBox.y - minY) * scale + 2}
          width={viewBox.w * scale}
          height={viewBox.h * scale}
          fill="none"
          stroke="#818cf8"
          strokeWidth={1}
          opacity={0.5}
        />
      </svg>
    </div>
  );
}
