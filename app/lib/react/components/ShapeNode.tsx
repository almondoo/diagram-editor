import { useRef, useCallback, memo } from "react";
import type { DiagramNode } from "~/lib/core";
import { getShapePath } from "~/lib/core";
import type { NodeResizeHandle } from "../hooks/useNodeDrag";

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
  isEdgeSource?: boolean;
  isCursorHighlighted?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeMouseDown?: (e: React.MouseEvent, handle: NodeResizeHandle) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTap?: () => void;
  onDoubleClick?: () => void;
  onConnectionPointMouseDown?: (e: React.MouseEvent, nodeId: string) => void;
  edgeCreationActive?: boolean;
}

export const ShapeNode = memo(
  function ShapeNode({ node, isSelected, isEdgeSource, isCursorHighlighted, onMouseDown, onResizeMouseDown, onTouchStart, onTap, onDoubleClick, onConnectionPointMouseDown, edgeCreationActive }: ShapeNodeProps) {
    const onMouseDownRef = useRef(onMouseDown);
    onMouseDownRef.current = onMouseDown;
    const onTouchStartRef = useRef(onTouchStart);
    onTouchStartRef.current = onTouchStart;
    const onTapRef = useRef(onTap);
    onTapRef.current = onTap;
    const onDoubleClickRef = useRef(onDoubleClick);
    onDoubleClickRef.current = onDoubleClick;
    const onConnectionPointMouseDownRef = useRef(onConnectionPointMouseDown);
    onConnectionPointMouseDownRef.current = onConnectionPointMouseDown;

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
      // SVG ファイルアイコン + ラベル
      const iconSize = 36;
      const gap = 4;
      const totalH = iconSize + gap + lineHeight;
      const iconY = y + h / 2 - totalH / 2;
      const labelCenterY = iconY + iconSize + gap + lineHeight / 2;
      const iconDir = icon.split(".")[0];
      textEl = (
        <>
          <image
            href={`/icons/${iconDir}/${icon}.svg`}
            x={x + w / 2 - iconSize / 2}
            y={iconY}
            width={iconSize}
            height={iconSize}
            className="pointer-events-none"
          />
          <text
            x={x + w / 2}
            y={labelCenterY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={textColor}
            fontSize={fontSize}
            fontFamily="'IBM Plex Sans', 'Noto Sans JP', system-ui, sans-serif"
            fontWeight="500"
            className="pointer-events-none select-none"
          >
            {label}
          </text>
        </>
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
          className="pointer-events-none select-none"
        >
          {lines.map((line, i) => (
            <tspan key={i} x={x + w / 2} dy={i === 0 ? 0 : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      );
    }

    const HS = 6; // handle visible size
    const HT = 20; // handle touch target size
    const resizeHandles = isSelected && onResizeMouseDown ? (
      <g>
        {/* N (top edge) */}
        <rect x={x + w / 2 - HS / 2} y={y - HS / 2} width={HS} height={HS} rx={1} fill="#818cf8" className="pointer-events-none" />
        <rect x={x + HT} y={y - HT / 2} width={w - HT * 2} height={HT} fill="transparent" className="cursor-n-resize"
          onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, "n"); }} />
        {/* S (bottom edge) */}
        <rect x={x + w / 2 - HS / 2} y={y + h - HS / 2} width={HS} height={HS} rx={1} fill="#818cf8" className="pointer-events-none" />
        <rect x={x + HT} y={y + h - HT / 2} width={w - HT * 2} height={HT} fill="transparent" className="cursor-s-resize"
          onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, "s"); }} />
        {/* W (left edge) */}
        <rect x={x - HS / 2} y={y + h / 2 - HS / 2} width={HS} height={HS} rx={1} fill="#818cf8" className="pointer-events-none" />
        <rect x={x - HT / 2} y={y + HT} width={HT} height={h - HT * 2} fill="transparent" className="cursor-w-resize"
          onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, "w"); }} />
        {/* E (right edge) */}
        <rect x={x + w - HS / 2} y={y + h / 2 - HS / 2} width={HS} height={HS} rx={1} fill="#818cf8" className="pointer-events-none" />
        <rect x={x + w - HT / 2} y={y + HT} width={HT} height={h - HT * 2} fill="transparent" className="cursor-e-resize"
          onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, "e"); }} />
        {/* SE (bottom-right corner) */}
        <rect x={x + w - HS} y={y + h - HS} width={HS} height={HS} rx={1} fill="#818cf8" className="pointer-events-none" />
        <rect x={x + w - HT} y={y + h - HT} width={HT} height={HT} fill="transparent" className="cursor-se-resize"
          onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, "se"); }} />
      </g>
    ) : null;

    const connectionPoints = onConnectionPointMouseDown ? (
      <g className="connection-points" style={{ opacity: 0 }}>
        {[
          { cx: x + w / 2, cy: y },
          { cx: x + w / 2, cy: y + h },
          { cx: x, cy: y + h / 2 },
          { cx: x + w, cy: y + h / 2 },
        ].map((pt, i) => (
          <circle
            key={i}
            cx={pt.cx}
            cy={pt.cy}
            r={6}
            fill="#6366f1"
            stroke="#fff"
            strokeWidth={2}
            className="cursor-crosshair [pointer-events:all]"
            onMouseDown={(e) => {
              e.stopPropagation();
              onConnectionPointMouseDownRef.current?.(e, node.id);
            }}
          />
        ))}
      </g>
    ) : null;

    const dropTarget = edgeCreationActive ? (
      <rect
        x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={8}
        fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="5,3" opacity={0.5}
        className="pointer-events-none"
      />
    ) : null;

    const highlighted = isSelected || isEdgeSource;
    const selOutline = highlighted ? (
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

    const cursorOutline = isCursorHighlighted && !isSelected ? (
      <rect
        x={x - 3} y={y - 3}
        width={w + 6} height={h + 6}
        rx={6} fill="none"
        stroke="#6366f1" strokeOpacity={0.4} strokeWidth={1.5}
        strokeDasharray="4,3"
        className="pointer-events-none"
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
      style: { opacity },
      className: "cursor-grab",
    };

    // アイコンあり: シェイプを描画せずアイコン+ラベルのみ
    if (icon) {
      return (
        <g {...gProps}>
          {cursorOutline}
          {selOutline}
          <rect x={x} y={y} width={w} height={h} fill="transparent" stroke="none" />
          {textEl}
          {resizeHandles}
          {connectionPoints}
          {dropTarget}
        </g>
      );
    }

    const path = getShapePath(shape, x, y, w, h);

    if (shape === "ellipse" || shape === "circle") {
      return (
        <g {...gProps}>
          {cursorOutline}
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
          {resizeHandles}
          {connectionPoints}
          {dropTarget}
        </g>
      );
    }

    if (shape === "cylinder") {
      const ry = 10;
      return (
        <g {...gProps}>
          {cursorOutline}
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
          {resizeHandles}
          {connectionPoints}
          {dropTarget}
        </g>
      );
    }

    if (path) {
      return (
        <g {...gProps}>
          {cursorOutline}
          {selOutline}
          <path
            d={path}
            fill={color}
            stroke={color}
            strokeWidth={2}
            strokeDasharray={dashArr}
          />
          {textEl}
          {resizeHandles}
          {connectionPoints}
          {dropTarget}
        </g>
      );
    }

    return (
      <g {...gProps}>
        {cursorOutline}
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
        {resizeHandles}
        {connectionPoints}
        {dropTarget}
      </g>
    );
  },
  // node と isSelected/isEdgeSource だけ比較。ハンドラは ref で最新を参照するため除外
  (prev, next) => prev.node === next.node && prev.isSelected === next.isSelected && prev.isEdgeSource === next.isEdgeSource && prev.isCursorHighlighted === next.isCursorHighlighted && prev.edgeCreationActive === next.edgeCreationActive,
);
