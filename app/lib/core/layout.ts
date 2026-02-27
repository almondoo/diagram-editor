import dagre from "@dagrejs/dagre";
import type { DiagramNode, DiagramEdge, DiagramGroup, LayoutDirection } from "./types";
import { colorForId } from "./colors";

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
  rankdir: "TB" | "LR" = "LR",
): void {
  if (toLayout.length === 0) return;

  const nodeIds = new Set(toLayout.map((n) => n.id));
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir, nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 0, marginy: 0 });
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
  rankdir: "TB" | "LR" = "LR",
): Record<string, DiagramGroup> {
  if (groups.length <= 1) return groupUpdates;

  const effectiveGroups = groups.map((g) => groupUpdates[g.id] ?? g);

  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir,
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
  rankdir: "TB" | "LR" = "LR",
): void {
  if (toLayout.length === 0) return;

  const nodeIds = new Set(toLayout.map((n) => n.id));
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir, nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 40, marginy: 40 });
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

/** Fruchterman-Reingold フォースレイアウト */
function forceLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  groups: DiagramGroup[],
): { nodes: DiagramNode[]; groupUpdates: Record<string, DiagramGroup> } {
  const groupById: Record<string, DiagramGroup> = {};
  groups.forEach((g) => (groupById[g.id] = g));

  const toLayout = nodes.filter((n) => n._needsPosition);
  const fixed = nodes.filter((n) => !n._needsPosition);
  if (toLayout.length === 0) {
    nodes.forEach((n) => delete n._needsPosition);
    return { nodes, groupUpdates: {} };
  }

  const allNodes = [...toLayout, ...fixed];
  const idxMap = new Map<string, number>();
  allNodes.forEach((n, i) => idxMap.set(n.id, i));

  // 初期位置: 円形配置
  const cx = 400, cy = 300;
  const radius = Math.max(80, toLayout.length * 15);
  toLayout.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / toLayout.length;
    n.x = cx + radius * Math.cos(angle) - n.w / 2;
    n.y = cy + radius * Math.sin(angle) - n.h / 2;
  });

  const area = 300 * 300;
  const k = Math.sqrt(area / allNodes.length);
  const ITERATIONS = 300;
  let temperature = Math.max(400, radius * 2);
  const coolingFactor = temperature / (ITERATIONS + 1);

  // グループメンバーセット
  const groupMembers: Record<string, string[]> = {};
  nodes.forEach((n) => {
    if (n.group && groupById[n.group]) {
      (groupMembers[n.group] ??= []).push(n.id);
    }
  });

  const dx: number[] = new Array(allNodes.length).fill(0);
  const dy: number[] = new Array(allNodes.length).fill(0);

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let i = 0; i < allNodes.length; i++) { dx[i] = 0; dy[i] = 0; }

    // 反発力（全ペア）
    for (let i = 0; i < allNodes.length; i++) {
      const ni = allNodes[i]!;
      const ncx = ni.x + ni.w / 2;
      const ncy = ni.y + ni.h / 2;
      for (let j = i + 1; j < allNodes.length; j++) {
        const nj = allNodes[j]!;
        const mcx = nj.x + nj.w / 2;
        const mcy = nj.y + nj.h / 2;
        const ddx = ncx - mcx;
        const ddy = ncy - mcy;
        const dist = Math.max(1, Math.sqrt(ddx * ddx + ddy * ddy));
        const minDist = (ni.w + nj.w) / 2 + 20;
        const effectiveDist = Math.max(1, dist - minDist + 20);
        const force = (k * k) / effectiveDist;
        const fx = (ddx / dist) * force;
        const fy = (ddy / dist) * force;
        dx[i] = dx[i]! + fx;
        dy[i] = dy[i]! + fy;
        dx[j] = dx[j]! - fx;
        dy[j] = dy[j]! - fy;
      }
    }

    // 引力（エッジ）
    for (const edge of edges) {
      const si = idxMap.get(edge.from);
      const ti = idxMap.get(edge.to);
      if (si === undefined || ti === undefined) continue;
      const sn = allNodes[si]!;
      const tn = allNodes[ti]!;
      const ddx = (tn.x + tn.w / 2) - (sn.x + sn.w / 2);
      const ddy = (tn.y + tn.h / 2) - (sn.y + sn.h / 2);
      const dist = Math.max(1, Math.sqrt(ddx * ddx + ddy * ddy));
      const force = (dist * dist) / k;
      const fx = (ddx / dist) * force;
      const fy = (ddy / dist) * force;
      dx[si] = dx[si]! + fx;
      dy[si] = dy[si]! + fy;
      dx[ti] = dx[ti]! - fx;
      dy[ti] = dy[ti]! - fy;
    }

    // グループ内引力
    for (const members of Object.values(groupMembers)) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const si = idxMap.get(members[i]!);
          const ti = idxMap.get(members[j]!);
          if (si === undefined || ti === undefined) continue;
          const sn = allNodes[si]!;
          const tn = allNodes[ti]!;
          const ddx = (tn.x + tn.w / 2) - (sn.x + sn.w / 2);
          const ddy = (tn.y + tn.h / 2) - (sn.y + sn.h / 2);
          const dist = Math.max(1, Math.sqrt(ddx * ddx + ddy * ddy));
          const force = dist * 0.8;
          const fx = (ddx / dist) * force;
          const fy = (ddy / dist) * force;
          dx[si] = dx[si]! + fx;
          dy[si] = dy[si]! + fy;
          dx[ti] = dx[ti]! - fx;
          dy[ti] = dy[ti]! - fy;
        }
      }
    }

    // 中心引力
    for (let i = 0; i < allNodes.length; i++) {
      const n = allNodes[i]!;
      dx[i] = dx[i]! + (cx - (n.x + n.w / 2)) * 0.05;
      dy[i] = dy[i]! + (cy - (n.y + n.h / 2)) * 0.05;
    }

    // 位置更新（toLayout のみ、fixed は動かさない）
    for (let i = 0; i < toLayout.length; i++) {
      const n = toLayout[i]!;
      const dxi = dx[i]!;
      const dyi = dy[i]!;
      const disp = Math.max(1, Math.sqrt(dxi * dxi + dyi * dyi));
      const scale = Math.min(disp, temperature) / disp;
      n.x += dxi * scale;
      n.y += dyi * scale;
    }

    temperature -= coolingFactor;
    if (temperature <= 0) break;
  }

  // グループフィッティング
  const groupUpdates: Record<string, DiagramGroup> = {};
  const childGroupsMap: Record<string, DiagramGroup[]> = {};
  groups.forEach((g) => {
    if (g.parentGroup) (childGroupsMap[g.parentGroup] ??= []).push(g);
  });

  const getDepth = (gid: string): number => getGroupDepth(gid, groupById);
  const sortedGroups = [...groups].sort((a, b) => getDepth(b.id) - getDepth(a.id));

  for (const g of sortedGroups) {
    const members = nodes.filter((n) => n.group === g.id);
    const children = (childGroupsMap[g.id] ?? []).map((c) => groupUpdates[c.id] ?? c);
    if (members.length > 0 || children.length > 0) {
      groupUpdates[g.id] = computeGroupFit(members, children, g);
    }
  }

  // トップレベルグループの重なりを dagre で解消
  const topLevelGroups = groups.filter(
    (g) => groupUpdates[g.id] !== undefined && !g.parentGroup,
  );
  if (topLevelGroups.length > 1) {
    const repositionedGroups = layoutGroupsDagre(topLevelGroups, groupUpdates, edges, nodes, "LR");
    for (const tlg of topLevelGroups) {
      const newG = repositionedGroups[tlg.id];
      if (!newG) continue;
      const oldG = groupUpdates[tlg.id] ?? groupById[tlg.id];
      if (!oldG) continue;
      const dx = newG.x - oldG.x;
      const dy = newG.y - oldG.y;
      if (dx === 0 && dy === 0) continue;

      // グループツリーをシフト
      const shiftTree = (gid: string) => {
        const cg = groupUpdates[gid] ?? groupById[gid];
        if (cg) groupUpdates[gid] = { ...cg, x: cg.x + dx, y: cg.y + dy };
        (childGroupsMap[gid] ?? []).forEach((d) => shiftTree(d.id));
      };
      shiftTree(tlg.id);

      // グループ内ノードをシフト
      const descIds = new Set<string>();
      const collectDesc = (gid: string) => {
        descIds.add(gid);
        (childGroupsMap[gid] ?? []).forEach((d) => collectDesc(d.id));
      };
      collectDesc(tlg.id);
      nodes.forEach((n) => {
        if (n.group && descIds.has(n.group)) {
          n.x += dx;
          n.y += dy;
        }
      });
    }
  }

  nodes.forEach((n) => delete n._needsPosition);
  return { nodes, groupUpdates };
}

export function autoLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  groups: DiagramGroup[] = [],
  direction: LayoutDirection = "auto",
): { nodes: DiagramNode[]; groupUpdates: Record<string, DiagramGroup> } {
  if (nodes.length === 0) return { nodes, groupUpdates: {} };

  // __RANDOM__ カラーを解決
  nodes.forEach((n) => {
    if (n.color === "__RANDOM__") n.color = colorForId(n.id);
  });

  const needsLayout = nodes.some((n) => n._needsPosition);
  if (!needsLayout) return { nodes, groupUpdates: {} };

  if (direction === "auto") {
    return forceLayout(nodes, edges, groups);
  }
  const rankdir = direction; // "TB" | "LR"

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
    if (toLayout.length > 0) layoutGroupNodesDagre(toLayout, gnodes, g, edges, rankdir);

    const childDefs = childGroupsMap[g.id] ?? [];
    const hasUpdatedChildren = childDefs.some((c) => groupUpdates[c.id] !== undefined);

    // メンバーノードのレイアウト変更も子グループの更新もなければスキップ
    if (toLayout.length === 0 && !hasUpdatedChildren) continue;

    // 処理済み子グループを直接ノードの下に配置
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
  const repositionedGroups = layoutGroupsDagre(topLevelGroups, groupUpdates, edges, nodes, rankdir);
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
    layoutFreeNodesDagre(freeToLayout, freeNodes, edges, startY, rankdir);
  }

  nodes.forEach((n) => delete n._needsPosition);
  return { nodes, groupUpdates };
}
