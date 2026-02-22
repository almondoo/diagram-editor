import type { DiagramNode } from "./types.js";

export const VIBRANT_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#2563eb",
];

export function randomColor(): string {
  return VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)]!;
}

export function randomPosition(
  existingNodes: Pick<DiagramNode, "x" | "y" | "w" | "h">[],
  w = 150,
  h = 60
): { x: number; y: number } {
  const occupied = existingNodes.map((n) => ({
    x: n.x, y: n.y, w: n.w || 150, h: n.h || 60,
  }));
  for (let attempt = 0; attempt < 80; attempt++) {
    const x = 60 + Math.random() * 600;
    const y = 60 + Math.random() * 400;
    const overlaps = occupied.some(
      (o) => x < o.x + o.w + 30 && x + w + 30 > o.x && y < o.y + o.h + 30 && y + h + 30 > o.y
    );
    if (!overlaps) return { x: Math.round(x), y: Math.round(y) };
  }
  return { x: Math.round(60 + Math.random() * 600), y: Math.round(60 + Math.random() * 400) };
}
