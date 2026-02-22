import type { DiagramGroup } from "diagram-dsl-core";

/**
 * コード変更時に groupStates を更新する純粋関数。
 * - 新規グループ: parsed の値で初期化
 * - 既存グループ: ドラッグ/リサイズ後の groupStates を維持
 * - 削除されたグループ: result に含めない
 */
export function syncGroups(
  parsedGroups: DiagramGroup[],
  prevStates: Record<string, DiagramGroup>,
): Record<string, DiagramGroup> {
  const next: Record<string, DiagramGroup> = {};
  for (const g of parsedGroups) {
    const prev = prevStates[g.id];
    next[g.id] = prev
      ? { ...prev, parentGroup: g.parentGroup }
      : { ...g };
  }
  return next;
}
