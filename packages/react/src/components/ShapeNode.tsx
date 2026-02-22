import { useRef, useCallback, memo } from "react";
import type { DiagramNode } from "diagram-dsl-core";
import { getShapePath } from "diagram-dsl-core";

/**
 * ノード幅に合わせて label を複数行に折り返す。
 * charWidth は "IBM Plex Sans" の近似値 (fontSize × 0.55)。
 */
function wrapText(text: string, maxWidth: number): string[] {
  const charWidth = 13 * 0.55;
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
  onTouchStart?: (e: React.TouchEvent) => void;
  onTap?: () => void;
  onDoubleClick?: () => void;
}

export const ShapeNode = memo(
  function ShapeNode({ node, isSelected, onMouseDown, onResizeMouseDown, onTouchStart, onTap, onDoubleClick }: ShapeNodeProps) {
    const onMouseDownRef = useRef(onMouseDown);
    onMouseDownRef.current = onMouseDown;
    const onTouchStartRef = useRef(onTouchStart);
    onTouchStartRef.current = onTouchStart;
    const onTapRef = useRef(onTap);
    onTapRef.current = onTap;
    const onDoubleClickRef = useRef(onDoubleClick);
    onDoubleClickRef.current = onDoubleClick;

    // タッチでタップ検出用
    const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);

    // 安定した参照を持つハンドラ（props が変わっても再生成しない）
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      onMouseDownRef.current(e);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartPos.current = {
          x: e.touches[0]!.clientX,
          y: e.touches[0]!.clientY,
          time: Date.now(),
        };
      }
      onTouchStartRef.current?.(e);
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      if (!touchStartPos.current) return;
      const elapsed = Date.now() - touchStartPos.current.time;
      if (elapsed < 300 && e.changedTouches.length === 1) {
        const dx = Math.abs(e.changedTouches[0]!.clientX - touchStartPos.current.x);
        const dy = Math.abs(e.changedTouches[0]!.clientY - touchStartPos.current.y);
        if (dx < 10 && dy < 10) {
          onTapRef.current?.();
        }
      }
      touchStartPos.current = null;
    }, []);

    const { x, y, w, h, shape, color, label, textColor, icon, opacity, dashed } = node;
    const dashArr = dashed ? "6,3" : "none";

    const fontSize = 13;
    const lineHeight = Math.ceil(fontSize * 1.35);

    let textEl: React.ReactElement;
    if (icon) {
      // アイコン + ラベルを縦に並べる（折り返しなし）
      const iconFS = Math.round(fontSize * 2.5);
      const iconLineH = Math.ceil(iconFS * 1.2);
      const gap = 2;
      const totalH = iconLineH + gap + lineHeight;
      const iconCenterY = y + h / 2 - totalH / 2 + iconLineH / 2;
      const labelDy = iconLineH / 2 + gap + lineHeight / 2;
      textEl = (
        <text
          x={x + w / 2}
          y={iconCenterY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={textColor}
          fontSize={fontSize}
          fontFamily="'IBM Plex Sans', 'Noto Sans JP', system-ui, sans-serif"
          fontWeight="500"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <tspan x={x + w / 2} fontSize={iconFS}>
            {icon}
          </tspan>
          <tspan x={x + w / 2} dy={labelDy}>
            {label}
          </tspan>
        </text>
      );
    } else {
      // アイコンなし: ノード幅に合わせて折り返し表示
      const lines = wrapText(label, w);
      const textBlockH = lines.length * lineHeight;
      const startY = y + h / 2 - (textBlockH - lineHeight) / 2;
      textEl = (
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
          {lines.map((line, i) => (
            <tspan key={i} x={x + w / 2} dy={i === 0 ? 0 : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      );
    }

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

    const handleDoubleClick = useCallback(() => {
      onDoubleClickRef.current?.();
    }, []);

    const gProps = {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onDoubleClick: handleDoubleClick,
      style: { cursor: "grab" as const, opacity },
    };

    // アイコンあり: シェイプを描画せずアイコン+ラベルのみ
    if (icon) {
      return (
        <g {...gProps}>
          {selOutline}
          <rect x={x} y={y} width={w} height={h} fill="transparent" stroke="none" />
          {textEl}
          {resizeHandle}
        </g>
      );
    }

    const path = getShapePath(shape, x, y, w, h);

    if (shape === "ellipse" || shape === "circle") {
      return (
        <g {...gProps}>
          {selOutline}
          <ellipse
            cx={x + w / 2}
            cy={y + h / 2}
            rx={w / 2}
            ry={h / 2}
            fill={color}
            stroke={color}
            strokeWidth={2}
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
        <g {...gProps}>
          {selOutline}
          <path
            d={`M${x},${y + ry} L${x},${y + h - ry} A${w / 2},${ry} 0 0,0 ${x + w},${y + h - ry} L${x + w},${y + ry}`}
            fill={color}
            stroke={color}
            strokeWidth={2}
            strokeDasharray={dashArr}
          />
          <ellipse
            cx={x + w / 2}
            cy={y + ry}
            rx={w / 2}
            ry={ry}
            fill={color}
            stroke={color}
            strokeWidth={2}
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
        <g {...gProps}>
          {selOutline}
          <path
            d={path}
            fill={color}
            stroke={color}
            strokeWidth={2}
            strokeDasharray={dashArr}
          />
          {textEl}
          {resizeHandle}
        </g>
      );
    }

    return (
      <g {...gProps}>
        {selOutline}
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={8}
          fill={color}
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dashArr}
        />
        {textEl}
        {resizeHandle}
      </g>
    );
  },
  // node と isSelected だけ比較。ハンドラは ref で最新を参照するため除外
  (prev, next) => prev.node === next.node && prev.isSelected === next.isSelected,
);
