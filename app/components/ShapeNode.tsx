import type { DiagramNode } from "../types";

export function getShapePath(
  shape: string,
  x: number,
  y: number,
  w: number,
  h: number
): string | null {
  switch (shape) {
    case "stadium":
      return `M${x + h / 2},${y} L${x + w - h / 2},${y} A${h / 2},${h / 2} 0 0,1 ${x + w - h / 2},${y + h} L${x + h / 2},${y + h} A${h / 2},${h / 2} 0 0,1 ${x + h / 2},${y}`;
    case "diamond": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return `M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z`;
    }
    case "ellipse":
    case "circle":
      return null;
    case "cylinder":
      return null;
    case "parallelogram": {
      const off = w * 0.15;
      return `M${x + off},${y} L${x + w},${y} L${x + w - off},${y + h} L${x},${y + h} Z`;
    }
    case "hexagon": {
      const off = w * 0.12;
      return `M${x + off},${y} L${x + w - off},${y} L${x + w},${y + h / 2} L${x + w - off},${y + h} L${x + off},${y + h} L${x},${y + h / 2} Z`;
    }
    case "trapezoid": {
      const off = w * 0.15;
      return `M${x + off},${y} L${x + w - off},${y} L${x + w},${y + h} L${x},${y + h} Z`;
    }
    default:
      return null;
  }
}

interface ShapeNodeProps {
  node: DiagramNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ShapeNode({ node, isSelected, onMouseDown }: ShapeNodeProps) {
  const { x, y, w, h, shape, color, label, textColor, icon, fontSize, borderColor, borderWidth, opacity, dashed } = node;
  const stroke = borderColor || color;
  const dashArr = dashed ? "6,3" : "none";

  const textEl = (
    <text
      x={x + w / 2}
      y={y + h / 2 + (icon ? 4 : 1)}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={textColor}
      fontSize={fontSize}
      fontFamily="'IBM Plex Sans', 'Noto Sans JP', system-ui, sans-serif"
      fontWeight="500"
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      {icon && (
        <tspan x={x + w / 2} dy="-8" fontSize={fontSize + 4}>
          {icon}
        </tspan>
      )}
      <tspan x={x + w / 2} dy={icon ? fontSize + 4 : 0}>
        {label.length > 18 ? label.slice(0, 17) + "…" : label}
      </tspan>
    </text>
  );

  const selOutline = isSelected ? (
    <rect
      x={x - 4}
      y={y - 4}
      width={w + 8}
      height={h + 8}
      rx={8}
      fill="none"
      stroke="#818cf8"
      strokeWidth={2}
      strokeDasharray="5,3"
      className="sel-outline"
    />
  ) : null;

  const path = getShapePath(shape, x, y, w, h);

  if (shape === "ellipse" || shape === "circle") {
    return (
      <g onMouseDown={onMouseDown} style={{ cursor: "grab", opacity }}>
        {selOutline}
        <ellipse
          cx={x + w / 2}
          cy={y + h / 2}
          rx={w / 2}
          ry={h / 2}
          fill={color}
          stroke={stroke}
          strokeWidth={borderWidth}
          strokeDasharray={dashArr}
        />
        {textEl}
      </g>
    );
  }

  if (shape === "cylinder") {
    const ry = 10;
    return (
      <g onMouseDown={onMouseDown} style={{ cursor: "grab", opacity }}>
        {selOutline}
        <path
          d={`M${x},${y + ry} L${x},${y + h - ry} A${w / 2},${ry} 0 0,0 ${x + w},${y + h - ry} L${x + w},${y + ry}`}
          fill={color}
          stroke={stroke}
          strokeWidth={borderWidth}
          strokeDasharray={dashArr}
        />
        <ellipse
          cx={x + w / 2}
          cy={y + ry}
          rx={w / 2}
          ry={ry}
          fill={color}
          stroke={stroke}
          strokeWidth={borderWidth}
          strokeDasharray={dashArr}
        />
        <ellipse
          cx={x + w / 2}
          cy={y + ry}
          rx={w / 2}
          ry={ry}
          fill="rgba(255,255,255,0.1)"
          stroke="none"
        />
        {textEl}
      </g>
    );
  }

  if (path) {
    return (
      <g onMouseDown={onMouseDown} style={{ cursor: "grab", opacity }}>
        {selOutline}
        <path
          d={path}
          fill={color}
          stroke={stroke}
          strokeWidth={borderWidth}
          strokeDasharray={dashArr}
        />
        {textEl}
      </g>
    );
  }

  return (
    <g onMouseDown={onMouseDown} style={{ cursor: "grab", opacity }}>
      {selOutline}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={color}
        stroke={stroke}
        strokeWidth={borderWidth}
        strokeDasharray={dashArr}
      />
      {textEl}
    </g>
  );
}
