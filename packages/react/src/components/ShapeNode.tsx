import { useRef, useCallback, memo } from "react";
import type { DiagramNode } from "diagram-dsl-core";
import { getShapePath } from "diagram-dsl-core";

/**
 * ノード幅に合わせて label を複数行に折り返す。
 * charWidth は "IBM Plex Sans" の近似値 (fontSize × 0.55)。
 */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charWidth = fontSize * 0.55;
  const maxChars = Math.max(1, Math.floor((maxWidth - 16) / charWidth));
  if (text.length <= maxChars) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // 単語自体が最大幅を超える場合は強制改行
      let remaining = word;
      while (remaining.length > maxChars) {
        lines.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      current = remaining;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface ShapeNodeProps {
  node: DiagramNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeMouseDown?: (e: React.MouseEvent) => void;
}

export const ShapeNode = memo(
  function ShapeNode({ node, isSelected, onMouseDown, onResizeMouseDown }: ShapeNodeProps) {
    const onMouseDownRef = useRef(onMouseDown);
    onMouseDownRef.current = onMouseDown;

    // 安定した参照を持つハンドラ（props が変わっても再生成しない）
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      onMouseDownRef.current(e);
    }, []);

    const { x, y, w, h, shape, color, label, textColor, icon, fontSize, borderColor, borderWidth, opacity, dashed } = node;
    const stroke = borderColor || color;
    const dashArr = dashed ? "6,3" : "none";

    const lines = wrapText(label, w, fontSize);
    const lineHeight = Math.ceil(fontSize * 1.35);
    const textBlockH = lines.length * lineHeight;
    const iconOffset = icon ? lineHeight : 0;
    const startY = y + h / 2 - (textBlockH - lineHeight) / 2 + iconOffset / 2;

    const textEl = (
      <text
        x={x + w / 2}
        y={startY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={fontSize}
        fontFamily="'IBM Plex Sans', 'Noto Sans JP', system-ui, sans-serif"
        fontWeight="500"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {icon && (
          <tspan x={x + w / 2} dy={-iconOffset} fontSize={fontSize + 4}>
            {icon}
          </tspan>
        )}
        {lines.map((line, i) => (
          <tspan key={i} x={x + w / 2} dy={i === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    );

    const resizeHandle = isSelected && onResizeMouseDown ? (
      <rect
        x={x + w - 5}
        y={y + h - 5}
        width={10}
        height={10}
        rx={2}
        fill="#818cf8"
        stroke="#1e1b4b"
        strokeWidth={1}
        style={{ cursor: "se-resize", pointerEvents: "all" }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeMouseDown(e);
        }}
      />
    ) : null;

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
          {resizeHandle}
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
          {resizeHandle}
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
          {resizeHandle}
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
        {resizeHandle}
      </g>
    );
  },
  // node と isSelected だけ比較。onMouseDown/onResizeMouseDown は ref で最新を参照するため除外
  (prev, next) => prev.node === next.node && prev.isSelected === next.isSelected,
);
