import type { DiagramNode } from "./types";

export const VIBRANT_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#2563eb",
];

export type ColorPreset = "default" | "pastel" | "monochrome" | "ocean" | "neon";

export const COLOR_PRESETS: Record<ColorPreset, { label: string; colors: string[] }> = {
  default: { label: "Default", colors: VIBRANT_COLORS },
  pastel: { label: "Pastel", colors: ["#a5b4fc", "#c4b5fd", "#d8b4fe", "#f0abfc", "#f9a8d4", "#fda4af", "#fca5a5", "#fdba74", "#fcd34d", "#bef264", "#86efac", "#6ee7b7", "#5eead4", "#67e8f9", "#7dd3fc", "#93c5fd"] },
  monochrome: { label: "Monochrome", colors: ["#f8fafc", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#1e293b"] },
  ocean: { label: "Ocean", colors: ["#0ea5e9", "#06b6d4", "#14b8a6", "#0d9488", "#0891b2", "#0284c7", "#2563eb", "#4f46e5", "#7c3aed", "#38bdf8", "#22d3ee", "#2dd4bf"] },
  neon: { label: "Neon", colors: ["#f43f5e", "#ec4899", "#d946ef", "#a855f7", "#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#84cc16", "#eab308", "#f97316", "#ef4444", "#f59e0b"] },
};

export function randomColor(preset: ColorPreset = "default"): string {
  const colors = COLOR_PRESETS[preset].colors;
  return colors[Math.floor(Math.random() * colors.length)]!;
}

export function colorForId(id: string, preset: ColorPreset = "default"): string {
  const colors = COLOR_PRESETS[preset].colors;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length]!;
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
