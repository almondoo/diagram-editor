import type { DiagramNote } from "diagram-dsl-core";

export function syncNotes(
  parsedNotes: DiagramNote[],
  prevStates: Record<string, DiagramNote>
): Record<string, DiagramNote> {
  const result: Record<string, DiagramNote> = {};
  for (const parsed of parsedNotes) {
    const prev = prevStates[parsed.id];
    if (!prev) {
      // 新規ノート: _needsPosition を引き継ぐ（位置は後でレイアウト）
      result[parsed.id] = { ...parsed };
    } else {
      // 既存ノート: x/y はドラッグ位置を維持、text/color はコードから更新
      result[parsed.id] = { ...prev, text: parsed.text, color: parsed.color };
    }
  }
  return result;
}
