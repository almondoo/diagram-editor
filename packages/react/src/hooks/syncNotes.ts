import type { DiagramNote } from "diagram-dsl-core";

export function syncNotes(
  parsedNotes: DiagramNote[],
  prevStates: Record<string, DiagramNote>
): Record<string, DiagramNote> {
  const result: Record<string, DiagramNote> = {};
  for (const parsed of parsedNotes) {
    const prev = prevStates[parsed.id];
    if (!prev) {
      result[parsed.id] = { ...parsed };
    } else {
      // x/y はドラッグ位置を維持、text/color はコードから更新
      result[parsed.id] = { ...prev, text: parsed.text, color: parsed.color };
    }
  }
  return result;
}
