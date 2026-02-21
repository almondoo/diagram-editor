import dagre from "@dagrejs/dagre";
import type { DiagramNode, DiagramEdge, DiagramGroup } from "./types.js";
import { randomColor } from "./colors.js";

const LABEL_HEIGHT = 26; // グループラベルの高さ
const PADDING = 12;      // グループ内パディング
const NODE_SEP = 40;     // dagre: 同一レイヤー内ノード間隔
const RANK_SEP = 80;     // dagre: レイヤー間隔

/** グループ内ノードを dagre でレイアウト（グループ左上を原点としたローカル座標） */
function layoutGroupNodesDagre(
  toLayout: DiagramNode[],
  g: DiagramGroup,
  edges: DiagramEdge[],
): void {
  if (toLayout.length === 0) return;

  const nodeIds = new Set(toLayout.map((n) => n.id));
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 0, marginy: 0 });
  graph.setDefaultEdgeLabel(() => ({}));

  toLayout.forEach((n) => graph.setNode(n.id, { width: n.w, height: n.h }));
  edges.forEach((e) => {
    if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
      graph.setEdge(e.from, e.to);
    }
  });

  dagre.layout(graph);

  // dagre の中心座標をグループ左上 + padding に変換
  const offsetX = g.x + PADDING;
  const offsetY = g.y + LABEL_HEIGHT + PADDING;

  toLayout.forEach((n) => {
    const pos = graph.node(n.id);
    n.x = offsetX + pos.x - n.w / 2;
    n.y = offsetY + pos.y - n.h / 2;
  });
}

/** グループを全メンバーノードを包含するサイズに計算する */
function computeGroupFit(allMembers: DiagramNode[], g: DiagramGroup): DiagramGroup {
  if (allMembers.length === 0) return g;
  const minX = Math.min(...allMembers.map((n) => n.x)) - PADDING;
  const minY = Math.min(...allMembers.map((n) => n.y)) - LABEL_HEIGHT - PADDING;
  const maxX = Math.max(...allMembers.map((n) => n.x + n.w)) + PADDING;
  const maxY = Math.max(...allMembers.map((n) => n.y + n.h)) + PADDING;
  return { ...g, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** フリーノードを dagre でレイアウト（startY の下から開始） */
function layoutFreeNodesDagre(
  toLayout: DiagramNode[],
  allFreeNodes: DiagramNode[],
  edges: DiagramEdge[],
  startY: number,
): void {
  if (toLayout.length === 0) return;

  const nodeIds = new Set(toLayout.map((n) => n.id));
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 40, marginy: 40 });
  graph.setDefaultEdgeLabel(() => ({}));

  toLayout.forEach((n) => graph.setNode(n.id, { width: n.w, height: n.h }));

  // nodeIds 内の両端点を持つエッジのみ追加
  edges.forEach((e) => {
    if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
      graph.setEdge(e.from, e.to);
    }
  });

  dagre.layout(graph);

  // dagre 結果の最小 Y を求めて startY に合わせるオフセットを計算
  const dagreMinY = Math.min(...toLayout.map((n) => {
    const pos = graph.node(n.id);
    return pos.y - n.h / 2;
  }));
  const offsetY = startY - dagreMinY;

  toLayout.forEach((n) => {
    const pos = graph.node(n.id);
    n.x = pos.x - n.w / 2;
    n.y = pos.y - n.h / 2 + offsetY;
  });
}

export function autoLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  groups: DiagramGroup[] = [],
): { nodes: DiagramNode[]; groupUpdates: Record<string, DiagramGroup> } {
  if (nodes.length === 0) return { nodes, groupUpdates: {} };

  // __RANDOM__ カラーを解決
  nodes.forEach((n) => {
    if (n.color === "__RANDOM__") n.color = randomColor();
  });

  const needsLayout = nodes.some((n) => n._needsPosition);
  if (!needsLayout) return { nodes, groupUpdates: {} };

  const groupById: Record<string, DiagramGroup> = {};
  groups.forEach((g) => (groupById[g.id] = g));

  // グループ内ノードとフリーノードを分離
  const groupedNodesMap: Record<string, DiagramNode[]> = {};
  const freeNodes: DiagramNode[] = [];

  nodes.forEach((n) => {
    if (n.group && groupById[n.group]) {
      (groupedNodesMap[n.group] ??= []).push(n);
    } else {
      freeNodes.push(n);
    }
  });

  // グループ内ノードを dagre でレイアウト → グループ自動フィット
  const groupUpdates: Record<string, DiagramGroup> = {};
  for (const [groupId, gnodes] of Object.entries(groupedNodesMap)) {
    const g = groupById[groupId];
    if (!g) continue;
    const toLayout = gnodes.filter((n) => n._needsPosition);
    if (toLayout.length > 0) layoutGroupNodesDagre(toLayout, g, edges);
    // 全メンバー（既配置ノードを含む）でグループ枠を再計算
    groupUpdates[groupId] = computeGroupFit(gnodes, g);
  }

  // フリーノードを dagre でレイアウト（全グループの下から開始）
  const freeToLayout = freeNodes.filter((n) => n._needsPosition);
  if (freeToLayout.length > 0) {
    const updatedGroups = groups.map((g) => groupUpdates[g.id] ?? g);
    const groupsBottom =
      updatedGroups.length > 0 ? Math.max(...updatedGroups.map((g) => g.y + g.h)) : 0;
    const startY = groupsBottom > 0 ? groupsBottom + 80 : 40;
    layoutFreeNodesDagre(freeToLayout, freeNodes, edges, startY);
  }

  nodes.forEach((n) => delete n._needsPosition);
  return { nodes, groupUpdates };
}
