import type { DiagramNode } from "./types.js";

/** 線分と矩形の交差判定 */
function segmentIntersectsRect(
  x1: number, y1: number,
  x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number,
  pad: number,
): boolean {
  const left = rx - pad, right = rx + rw + pad;
  const top = ry - pad, bottom = ry + rh + pad;
  // 完全に外側
  if (Math.max(x1, x2) < left || Math.min(x1, x2) > right) return false;
  if (Math.max(y1, y2) < top || Math.min(y1, y2) > bottom) return false;
  // 両端が矩形の外側かチェック（内側なら交差とみなす）
  function outside(x: number, y: number) {
    return x < left || x > right || y < top || y > bottom;
  }
  if (!outside(x1, y1) || !outside(x2, y2)) return true;
  // Cohen-Sutherland の簡略版: 線分が矩形を貫通するか
  const dx = x2 - x1, dy = y2 - y1;
  const tests = [
    (left - x1) / dx,
    (right - x1) / dx,
    (top - y1) / dy,
    (bottom - y1) / dy,
  ].filter((t) => isFinite(t) && t >= 0 && t <= 1);
  for (const t of tests) {
    const ix = x1 + dx * t;
    const iy = y1 + dy * t;
    if (ix >= left && ix <= right && iy >= top && iy <= bottom) return true;
  }
  return false;
}

/**
 * エッジがノードを通過する場合の迂回ウェイポイントを計算する。
 * 通過しない場合は null を返す（デフォルトの曲線を使用）。
 */
export function computeEdgeRoute(
  from: { x: number; y: number },
  to: { x: number; y: number },
  obstacles: DiagramNode[],
  padding: number = 20,
): Array<{ x: number; y: number }> | null {
  // 直線パスと各障害物の交差チェック
  const blocking = obstacles.filter((o) =>
    segmentIntersectsRect(from.x, from.y, to.x, to.y, o.x, o.y, o.w, o.h, padding),
  );
  if (blocking.length === 0) return null;

  // 最初の障害物を上下に迂回するウェイポイントを計算
  const blocker = blocking[0];
  const topY = blocker.y - padding;
  const bottomY = blocker.y + blocker.h + padding;
  const midX = blocker.x + blocker.w / 2;

  const viaTop = [
    { x: midX, y: topY },
    to,
  ];
  const viaBottom = [
    { x: midX, y: bottomY },
    to,
  ];

  // 上回りと下回りの経路長を比較して短い方を選択
  function pathLen(waypoints: Array<{ x: number; y: number }>) {
    let len = 0;
    let prev = from;
    for (const p of waypoints) {
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      len += Math.sqrt(dx * dx + dy * dy);
      prev = p;
    }
    return len;
  }

  const waypoints = pathLen(viaTop) <= pathLen(viaBottom) ? viaTop : viaBottom;
  return waypoints;
}

/**
 * Catmull-Romスプラインをキュービックベジエに変換してスムーズなパスを生成する。
 * 各点を通過しつつ、折れ曲がりを滑らかにする。
 */
function catmullRomPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  const d: string[] = [`M${points[0].x},${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }
  return d.join(" ");
}

/**
 * エッジのSVGパスとラベル位置を計算する共通関数。
 */
export function buildEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  curve: string,
  routePoints?: Array<{ x: number; y: number }>,
): { pathD: string; labelX: number; labelY: number } {
  if (routePoints && routePoints.length > 0) {
    // Catmull-Romスプラインでウェイポイントを滑らかに通過する曲線パス
    const pts = [from, ...routePoints];
    const pathD = catmullRomPath(pts);
    // ラベルは全体の中点（セグメント数が奇数なら中間セグメントの中点）
    const midIdx = Math.floor(pts.length / 2);
    const p1 = pts[midIdx - 1] ?? from;
    const p2 = pts[midIdx];
    const labelX = (p1.x + p2.x) / 2;
    const labelY = (p1.y + p2.y) / 2;
    return { pathD, labelX, labelY };
  }

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const perpX = -dy * 0.08;
  const perpY = dx * 0.08;

  if (curve === "straight") {
    return {
      pathD: `M${from.x},${from.y} L${to.x},${to.y}`,
      labelX: midX,
      labelY: midY,
    };
  }

  return {
    pathD: `M${from.x},${from.y} Q${midX + perpX},${midY + perpY} ${to.x},${to.y}`,
    labelX: midX + perpX / 2,
    labelY: midY + perpY / 2,
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
