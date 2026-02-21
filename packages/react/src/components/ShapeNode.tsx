import { useRef, useCallback, memo } from "react";
import type { DiagramNode } from "diagram-dsl-core";
import { getShapePath } from "diagram-dsl-core";

interface ShapeNodeProps {
  node: DiagramNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export const ShapeNode = memo(
  function ShapeNode({ node, isSelected, onMouseDown }: ShapeNodeProps) {
    const onMouseDownRef = useRef(onMouseDown);
    onMouseDownRef.current = onMouseDown;

    // 安定した参照を持つハンドラ（props が変わっても再生成しない）
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      onMouseDownRef.current(e);
    }, []);

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
        <g onMouseDown={handleMouseDown} style={{ cursor: "grab", opacity }}>
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
        <g onMouseDown={handleMouseDown} style={{ cursor: "grab", opacity }}>
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
        <g onMouseDown={handleMouseDown} style={{ cursor: "grab", opacity }}>
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
      <g onMouseDown={handleMouseDown} style={{ cursor: "grab", opacity }}>
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
  },
  // node と isSelected だけ比較。onMouseDown は ref で最新を参照するため除外
  (prev, next) => prev.node === next.node && prev.isSelected === next.isSelected,
);
