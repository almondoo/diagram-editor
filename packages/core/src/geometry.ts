import type { DiagramNode } from "./types.js";

export function buildEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  curve: string,
  bendX: number = 0,
  bendY: number = 0,
): { pathD: string; labelX: number; labelY: number } {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const perpX = -dy * 0.08;
  const perpY = dx * 0.08;

  const hasBend = bendX !== 0 || bendY !== 0;

  if (curve === "straight" && !hasBend) {
    return {
      pathD: `M${from.x},${from.y} L${to.x},${to.y}`,
      labelX: midX,
      labelY: midY,
    };
  }

  const cpX = midX + (hasBend ? bendX : perpX);
  const cpY = midY + (hasBend ? bendY : perpY);

  return {
    pathD: `M${from.x},${from.y} Q${cpX},${cpY} ${to.x},${to.y}`,
    labelX: (midX + cpX) / 2,
    labelY: (midY + cpY) / 2,
  };
}

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
