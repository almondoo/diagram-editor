import dagre from "@dagrejs/dagre";
import type { DiagramNode, DiagramEdge, DiagramGroup } from "./types.js";
import { colorForId } from "./colors.js";

export const GROUP_LABEL_HEIGHT = 26; // グループラベルの高さ
export const GROUP_PADDING = 12;      // グループ内パディング
const LABEL_HEIGHT = GROUP_LABEL_HEIGHT;
const PADDING = GROUP_PADDING;
const NODE_SEP = 40;     // dagre: 同一レイヤー内ノード間隔
const RANK_SEP = 80;     // dagre: レイヤー間隔

/** 障害物リストとの衝突を解消するまでノードを右にずらす */
function resolveOverlap(
  node: DiagramNode,
  obstacles: DiagramNode[],
  gap: number = 30,
): void {
  for (let attempt = 0; attempt < 50; attempt++) {
    const collider = obstacles.find(
      (o) =>
        node.x < o.x + o.w + gap &&
        node.x + node.w + gap > o.x &&
        node.y < o.y + o.h + gap &&
        node.y + node.h + gap > o.y,
    );
    if (!collider) return;
    node.x = collider.x + collider.w + gap;
  }
}

/** グループ内ノードを dagre でレイアウト（グループ左上を原点としたローカル座標） */
function layoutGroupNodesDagre(
  toLayout: DiagramNode[],
  allGroupNodes: DiagramNode[],
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

  // 既配置のグループ内ノードとの衝突を解消
  const placed = allGroupNodes.filter((n) => !toLayout.includes(n));
  const obstacles: DiagramNode[] = [...placed];
  for (const n of toLayout) {
    resolveOverlap(n, obstacles);
    obstacles.push(n);
  }
}

/** グループを全メンバーノード＋子グループを包含するサイズに計算する */
function computeGroupFit(allMembers: DiagramNode[], childGroups: DiagramGroup[], g: DiagramGroup): DiagramGroup {
  if (allMembers.length === 0 && childGroups.length === 0) return g;
  const rects = [
    ...allMembers.map((n) => ({ x: n.x, y: n.y, r: n.x + n.w, b: n.y + n.h })),
    ...childGroups.map((c) => ({ x: c.x, y: c.y, r: c.x + c.w, b: c.y + c.h })),
  ];
  const minX = Math.min(...rects.map((r) => r.x)) - PADDING;
  const minY = Math.min(...rects.map((r) => r.y)) - LABEL_HEIGHT - PADDING;
  const maxX = Math.max(...rects.map((r) => r.r)) + PADDING;
  const maxY = Math.max(...rects.map((r) => r.b)) + PADDING;
  return { ...g, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

const GROUP_GAP = 60; // グループ間の余白

/** グループ自体を dagre でレイアウトして重なりを解消する */
function layoutGroupsDagre(
  groups: DiagramGroup[],
  groupUpdates: Record<string, DiagramGroup>,
  edges: DiagramEdge[],
  allNodes: DiagramNode[],
): Record<string, DiagramGroup> {
  if (groups.length <= 1) return groupUpdates;

  const effectiveGroups = groups.map((g) => groupUpdates[g.id] ?? g);

  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: "LR",
    nodesep: GROUP_GAP,
    ranksep: GROUP_GAP * 1.5,
    marginx: 40,
    marginy: 40,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  // グループを dagre ノードとして追加
  effectiveGroups.forEach((g) => {
    graph.setNode(g.id, { width: g.w, height: g.h });
  });

  // ノードレベルのエッジからグループ間エッジを推定
  const nodeToGroup: Record<string, string> = {};
  allNodes.forEach((n) => {
    if (n.group) nodeToGroup[n.id] = n.group;
  });
  const addedEdges = new Set<string>();
  edges.forEach((e) => {
    const fromGroup = nodeToGroup[e.from];
    const toGroup = nodeToGroup[e.to];
    if (fromGroup && toGroup && fromGroup !== toGroup) {
      const key = `${fromGroup}->${toGroup}`;
      if (!addedEdges.has(key)) {
        graph.setEdge(fromGroup, toGroup);
        addedEdges.add(key);
      }
    }
  });

  dagre.layout(graph);

  const result: Record<string, DiagramGroup> = { ...groupUpdates };
  effectiveGroups.forEach((g) => {
    const pos = graph.node(g.id);
    result[g.id] = { ...g, x: pos.x - g.w / 2, y: pos.y - g.h / 2 };
  });
  return result;
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

  // 既配置のフリーノードとの衝突を解消
  const placed = allFreeNodes.filter((n) => !toLayout.includes(n));
  const obstacles: DiagramNode[] = [...placed];
  for (const n of toLayout) {
    resolveOverlap(n, obstacles);
    obstacles.push(n);
  }
}

/** グループの深さを返す（ルート=0） */
export function getGroupDepth(gid: string, groupById: Record<string, DiagramGroup>): number {
  const g = groupById[gid];
  if (!g?.parentGroup || !groupById[g.parentGroup]) return 0;
  return getGroupDepth(g.parentGroup, groupById) + 1;
}

export function autoLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  groups: DiagramGroup[] = [],
): { nodes: DiagramNode[]; groupUpdates: Record<string, DiagramGroup> } {
  if (nodes.length === 0) return { nodes, groupUpdates: {} };

  // __RANDOM__ カラーを解決
  nodes.forEach((n) => {
    if (n.color === "__RANDOM__") n.color = colorForId(n.id);
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

  // 子グループマップを構築
  const childGroupsMap: Record<string, DiagramGroup[]> = {};
  groups.forEach((g) => {
    if (g.parentGroup) {
      (childGroupsMap[g.parentGroup] ??= []).push(g);
    }
  });

  // グループをボトムアップ順にソート（リーフが先）
  const getDepth = (gid: string): number => getGroupDepth(gid, groupById);
  const sortedGroups = [...groups].sort((a, b) => getDepth(b.id) - getDepth(a.id));

  // グループ内ノードをレイアウト → 子グループ配置 → グループ自動フィット（ボトムアップ）
  const groupUpdates: Record<string, DiagramGroup> = {};

  // グループツリーとその所属ノードを (dx, dy) だけ移動する共通ヘルパー
  const shiftGroupTree = (gid: string, dx: number, dy: number) => {
    const cg = groupUpdates[gid] ?? groupById[gid];
    if (cg) groupUpdates[gid] = { ...cg, x: cg.x + dx, y: cg.y + dy };
    (childGroupsMap[gid] ?? []).forEach((d) => shiftGroupTree(d.id, dx, dy));
  };
  const collectDescendantIds = (gid: string, out: Set<string>) => {
    out.add(gid);
    (childGroupsMap[gid] ?? []).forEach((d) => collectDescendantIds(d.id, out));
  };
  const shiftGroupNodes = (gid: string, dx: number, dy: number) => {
    const ids = new Set<string>();
    collectDescendantIds(gid, ids);
    nodes.forEach((n) => {
      if (ids.has(n.group)) { n.x += dx; n.y += dy; }
    });
  };

  for (const g of sortedGroups) {
    const gnodes = groupedNodesMap[g.id] ?? [];
    const toLayout = gnodes.filter((n) => n._needsPosition);
    if (toLayout.length > 0) layoutGroupNodesDagre(toLayout, gnodes, g, edges);

    // 処理済み子グループを直接ノードの下に配置
    const childDefs = childGroupsMap[g.id] ?? [];
    if (childDefs.length > 0) {
      let contentBottom = g.y + LABEL_HEIGHT + PADDING;
      if (gnodes.length > 0) {
        contentBottom = Math.max(...gnodes.map((n) => n.y + n.h));
      }
      const startY = contentBottom + PADDING + LABEL_HEIGHT;
      let curX = g.x + PADDING;

      for (const childDef of childDefs) {
        const child = groupUpdates[childDef.id] ?? childDef;
        const dx = curX - child.x;
        const dy = startY - child.y;

        if (dx !== 0 || dy !== 0) {
          shiftGroupTree(childDef.id, dx, dy);
          shiftGroupNodes(childDef.id, dx, dy);
        }

        const updatedChild = groupUpdates[childDef.id] ?? childDef;
        curX += updatedChild.w + PADDING;
      }
    }

    // ノード＋子グループでグループ枠を再計算
    const updatedChildren = childDefs.map((c) => groupUpdates[c.id] ?? c);
    if (gnodes.length > 0 || updatedChildren.length > 0) {
      groupUpdates[g.id] = computeGroupFit(gnodes, updatedChildren, g);
    }
  }

  // トップレベルグループのみ dagre で再配置（子グループは親に追従）
  const topLevelGroups = groups.filter(
    (g) => groupUpdates[g.id] !== undefined && !g.parentGroup,
  );
  const repositionedGroups = layoutGroupsDagre(topLevelGroups, groupUpdates, edges, nodes);
  // トップレベルグループの位置変化をグループ・ノードに適用
  for (const tlg of topLevelGroups) {
    const newG = repositionedGroups[tlg.id];
    if (!newG) continue;
    const oldG = groupUpdates[tlg.id] ?? groupById[tlg.id];
    if (!oldG) continue;
    const dx = newG.x - oldG.x;
    const dy = newG.y - oldG.y;
    if (dx === 0 && dy === 0) continue;
    shiftGroupTree(tlg.id, dx, dy);
    shiftGroupNodes(tlg.id, dx, dy);
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
