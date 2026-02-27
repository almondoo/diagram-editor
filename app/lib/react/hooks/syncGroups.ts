import type { DiagramGroup } from "~/lib/core";
import { GROUP_PADDING, GROUP_LABEL_HEIGHT } from "~/lib/core";

const GROUP_LABEL_H = GROUP_LABEL_HEIGHT;

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
    if (prev) {
      next[g.id] = {
        ...prev,
        label: g.label,
        color: g.color,
        ...(g.parentGroup !== undefined ? { parentGroup: g.parentGroup } : {}),
      };
    } else if (g.parentGroup) {
      // 新規子グループ: 親の実際の位置に基づいて配置
      const parent = prevStates[g.parentGroup] ?? next[g.parentGroup];
      if (parent) {
        next[g.id] = { ...g, x: parent.x + GROUP_PADDING, y: parent.y + GROUP_LABEL_H + GROUP_PADDING };
      } else {
        next[g.id] = { ...g };
      }
    } else {
      next[g.id] = { ...g };
    }
  }
  return next;
}
