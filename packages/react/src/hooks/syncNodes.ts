import type { DiagramNode } from "diagram-dsl-core";

const DEFAULT_NODE: Omit<DiagramNode, "id" | "label"> = {
  shape: "rect",
  color: "#6366f1",
  textColor: "#ffffff",
  x: NaN,
  y: NaN,
  w: 150,
  h: 60,
  icon: "",
  group: "",
  opacity: 1,
  dashed: false,
  _needsPosition: true,
};

/**
 * コード変更時に nodeStates を更新する純粋関数。
 * - 新規ノード: parsedNode の値で初期化（_needsPosition: true）
 * - 既存ノード: コードで明示されたプロパティのみ更新、それ以外（x/y/w/h 等）は維持
 * - 削除されたノード: result に含めない
 */
export function syncNodes(
  parsedNodes: DiagramNode[],
  prevStates: Record<string, DiagramNode>
): Record<string, DiagramNode> {
  const result: Record<string, DiagramNode> = {};

  for (const parsed of parsedNodes) {
    const explicit = parsed._explicitProps ?? new Set<string>();
    const prev = prevStates[parsed.id];

    if (!prev) {
      // 新規ノード: parsedNode の値（デフォルト含む）で初期化
      const { _explicitProps: _, ...nodeData } = parsed;
      result[parsed.id] = {
        ...DEFAULT_NODE,
        ...nodeData,
        _needsPosition: !Number.isFinite(nodeData.x) || !Number.isFinite(nodeData.y),
      };
    } else {
      // 既存ノード: 明示されたプロパティのみ上書き
      const updates: Partial<DiagramNode> = {};
      explicit.forEach((key: string) => {
        (updates as Record<string, unknown>)[key] = (parsed as unknown as Record<string, unknown>)[key];
      });
      // icon 追加/削除時にデフォルトサイズを更新（w/h 未指定の場合）
      const parsedHasIcon = !!parsed.icon;
      const prevHadIcon = !!prev.icon;
      if (parsedHasIcon !== prevHadIcon) {
        if (!explicit.has("w")) updates.w = parsedHasIcon ? 80 : 150;
        if (!explicit.has("h")) updates.h = parsedHasIcon ? 68 : 60;
      }
      // group は明示的・暗黙的（ブロック構文）どちらの変更も常に反映する
      if (parsed.group !== prev.group) {
        updates.group = parsed.group;
        updates._needsPosition = true;
      }
      const { _explicitProps: _, ...prevClean } = prev;
      result[parsed.id] = { ...prevClean, ...updates };
    }
  }

  return result;
}
