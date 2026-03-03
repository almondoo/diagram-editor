import type { DiagramNode, DiagramEdge, DiagramGroup, LayoutDirection } from "./types";
import { colorForId } from "./colors";

export const GROUP_LABEL_HEIGHT = 26; // グループラベルの高さ
export const GROUP_PADDING = 20;      // グループ内パディング
const LABEL_HEIGHT = GROUP_LABEL_HEIGHT;
const PADDING = GROUP_PADDING;
const NESTED_GROUP_GAP = 24; // ネストグループ間の間隔
const NODE_SEP = 40;     // 同一レイヤー内ノード間隔
const RANK_SEP = 80;     // レイヤー間隔

// === Sugiyama layout algorithm ===

type SEdge = { from: string; to: string; reversed?: boolean };
type SNode = { id: string; w: number; h: number; layer: number; dummy?: boolean };

/** Phase 1: DFS でバックエッジを検出・反転し DAG 化 */
function breakCycles(edges: SEdge[], nodeIds: Set<string>): void {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    if (e.from !== e.to) adj.get(e.from)!.push(e.to);
  }

  // エッジインデックスマップ (from->to → index)
  const edgeIdx = new Map<string, number>();
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i]!;
    if (!e.reversed) edgeIdx.set(`${e.from}->${e.to}`, i);
  }

  // 0=white, 1=gray, 2=black
  const color = new Map<string, number>();
  for (const id of nodeIds) color.set(id, 0);
  const toReverse: number[] = [];

  function dfs(u: string): void {
    color.set(u, 1);
    for (const v of adj.get(u)!) {
      const c = color.get(v)!;
      if (c === 1) {
        const idx = edgeIdx.get(`${u}->${v}`);
        if (idx !== undefined) toReverse.push(idx);
      } else if (c === 0) {
        dfs(v);
      }
    }
    color.set(u, 2);
  }

  for (const id of nodeIds) {
    if (color.get(id) === 0) dfs(id);
  }

  for (const idx of toReverse) {
    const e = edges[idx]!;
    [e.from, e.to] = [e.to, e.from];
    e.reversed = true;
  }
}

/** Phase 2: longest-path レイヤー割り当て (Kahn's algorithm) */
function assignLayers(nodeIds: Set<string>, edges: SEdge[]): Map<string, number> {
  const inDeg = new Map<string, number>();
  const succ = new Map<string, string[]>();
  for (const id of nodeIds) {
    inDeg.set(id, 0);
    succ.set(id, []);
  }
  for (const e of edges) {
    inDeg.set(e.to, inDeg.get(e.to)! + 1);
    succ.get(e.from)!.push(e.to);
  }

  const layer = new Map<string, number>();
  const queue: string[] = [];
  for (const id of nodeIds) {
    if (inDeg.get(id) === 0) {
      queue.push(id);
      layer.set(id, 0);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const u = queue[head++]!;
    const uL = layer.get(u)!;
    for (const v of succ.get(u)!) {
      layer.set(v, Math.max(layer.get(v) ?? 0, uL + 1));
      const d = inDeg.get(v)! - 1;
      inDeg.set(v, d);
      if (d === 0) queue.push(v);
    }
  }

  for (const id of nodeIds) {
    if (!layer.has(id)) layer.set(id, 0);
  }
  return layer;
}

/** Phase 2.5: 長エッジにダミーノード挿入 */
function insertDummyNodes(
  nodeMap: Map<string, SNode>,
  edges: SEdge[],
): SEdge[] {
  const result: SEdge[] = [];
  let idx = 0;
  for (const e of edges) {
    const fromL = nodeMap.get(e.from)?.layer;
    const toL = nodeMap.get(e.to)?.layer;
    if (fromL === undefined || toL === undefined || toL - fromL <= 1) {
      result.push(e);
      continue;
    }
    let prev = e.from;
    for (let l = fromL + 1; l < toL; l++) {
      const did = `__d${idx++}`;
      nodeMap.set(did, { id: did, w: 0, h: 0, layer: l, dummy: true });
      result.push({ from: prev, to: did });
      prev = did;
    }
    result.push({ from: prev, to: e.to });
  }
  return result;
}

/** Phase 3: barycenter heuristic + layer sweep 交差最小化 */
function minimizeCrossings(layers: string[][], edges: SEdge[]): void {
  const down = new Map<string, string[]>();
  const up = new Map<string, string[]>();
  for (const e of edges) {
    let arr = down.get(e.from);
    if (!arr) { arr = []; down.set(e.from, arr); }
    arr.push(e.to);
    arr = up.get(e.to);
    if (!arr) { arr = []; up.set(e.to, arr); }
    arr.push(e.from);
  }

  const pos = new Map<string, number>();
  const updateLayerPos = (layer: string[]) => {
    for (let i = 0; i < layer.length; i++) { pos.set(layer[i]!, i); }
  };
  for (const layer of layers) updateLayerPos(layer);

  const countCross = (upper: string[]): number => {
    let c = 0;
    const uNodes = upper;
    for (let i = 0; i < uNodes.length; i++) {
      const uP = pos.get(uNodes[i]!)!;
      const di = down.get(uNodes[i]!);
      if (!di) continue;
      for (let j = i + 1; j < uNodes.length; j++) {
        const vP = pos.get(uNodes[j]!)!;
        const dj = down.get(uNodes[j]!);
        if (!dj) continue;
        for (const a of di) {
          const aP = pos.get(a)!;
          for (const b of dj) {
            if ((uP - vP) * (aP - pos.get(b)!) < 0) c++;
          }
        }
      }
    }
    return c;
  };

  for (let sweep = 0; sweep < 24; sweep++) {
    let improved = false;
    // Down sweep
    for (let l = 1; l < layers.length; l++) {
      const layer = layers[l]!;
      const bc = new Map<string, number>();
      for (const v of layer) {
        const nbrs = up.get(v);
        bc.set(v, nbrs && nbrs.length > 0
          ? nbrs.reduce((s, u) => s + pos.get(u)!, 0) / nbrs.length
          : pos.get(v)!);
      }
      const prev = layer.slice();
      layer.sort((a, b) => bc.get(a)! - bc.get(b)!);
      if (!improved) {
        for (let i = 0; i < layer.length; i++) { if (layer[i] !== prev[i]) { improved = true; break; } }
      }
      updateLayerPos(layer);
    }
    // Up sweep
    for (let l = layers.length - 2; l >= 0; l--) {
      const layer = layers[l]!;
      const bc = new Map<string, number>();
      for (const v of layer) {
        const nbrs = down.get(v);
        bc.set(v, nbrs && nbrs.length > 0
          ? nbrs.reduce((s, u) => s + pos.get(u)!, 0) / nbrs.length
          : pos.get(v)!);
      }
      const prev = layer.slice();
      layer.sort((a, b) => bc.get(a)! - bc.get(b)!);
      if (!improved) {
        for (let i = 0; i < layer.length; i++) { if (layer[i] !== prev[i]) { improved = true; break; } }
      }
      updateLayerPos(layer);
    }
    // Adjacent swap (single pass per layer pair)
    for (let l = 0; l + 1 < layers.length; l++) {
      const layer = layers[l + 1]!;
      for (let i = 0; i + 1 < layer.length; i++) {
        const before = countCross(layers[l]!);
        [layer[i], layer[i + 1]] = [layer[i + 1]!, layer[i]!];
        pos.set(layer[i]!, i);
        pos.set(layer[i + 1]!, i + 1);
        if (countCross(layers[l]!) >= before) {
          [layer[i], layer[i + 1]] = [layer[i + 1]!, layer[i]!];
          pos.set(layer[i]!, i);
          pos.set(layer[i + 1]!, i + 1);
        } else {
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
}

/** Phase 4: レイヤー内配置 → 中心座標 */
function placeNodes(
  layers: string[][],
  nodeMap: Map<string, SNode>,
  rankdir: "TB" | "LR",
  nodesep: number,
  ranksep: number,
  mx: number,
  my: number,
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (rankdir === "TB") {
    let y = my;
    for (const layer of layers) {
      let maxH = 0;
      let hasReal = false;
      for (const id of layer) {
        const n = nodeMap.get(id)!;
        if (!n.dummy) { hasReal = true; if (n.h > maxH) maxH = n.h; }
      }
      if (!hasReal) { y += ranksep; continue; }
      let x = mx;
      for (const id of layer) {
        const n = nodeMap.get(id)!;
        if (n.dummy) continue;
        result.set(id, { x: x + n.w / 2, y: y + maxH / 2 });
        x += n.w + nodesep;
      }
      y += maxH + ranksep;
    }
  } else {
    let x = mx;
    for (const layer of layers) {
      let maxW = 0;
      let hasReal = false;
      for (const id of layer) {
        const n = nodeMap.get(id)!;
        if (!n.dummy) { hasReal = true; if (n.w > maxW) maxW = n.w; }
      }
      if (!hasReal) { x += ranksep; continue; }
      let y = my;
      for (const id of layer) {
        const n = nodeMap.get(id)!;
        if (n.dummy) continue;
        result.set(id, { x: x + maxW / 2, y: y + n.h / 2 });
        y += n.h + nodesep;
      }
      x += maxW + ranksep;
    }
  }
  return result;
}

/** Sugiyama レイアウト: ノード中心座標を返す */
function sugiyamaLayout(
  nodes: { id: string; w: number; h: number }[],
  edges: { from: string; to: string }[],
  rankdir: "TB" | "LR",
  opts: { nodesep: number; ranksep: number; marginx?: number; marginy?: number },
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();
  const mx = opts.marginx ?? 0;
  const my = opts.marginy ?? 0;
  if (nodes.length === 1) {
    const n = nodes[0]!;
    return new Map([[n.id, { x: mx + n.w / 2, y: my + n.h / 2 }]]);
  }

  const ids = new Set(nodes.map((n) => n.id));
  const sEdges: SEdge[] = edges
    .filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
    .map((e) => ({ from: e.from, to: e.to }));

  breakCycles(sEdges, ids);
  const layerMap = assignLayers(ids, sEdges);

  const nodeMap = new Map<string, SNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, { id: n.id, w: n.w, h: n.h, layer: layerMap.get(n.id)! });
  }

  const expanded = insertDummyNodes(nodeMap, sEdges);

  let maxLayer = 0;
  for (const n of nodeMap.values()) {
    if (n.layer > maxLayer) maxLayer = n.layer;
  }
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const [id, n] of nodeMap) layers[n.layer]!.push(id);

  if (expanded.length > 0) minimizeCrossings(layers, expanded);

  return placeNodes(layers, nodeMap, rankdir, opts.nodesep, opts.ranksep, mx, my);
}

// === Layout helper functions ===

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

/** グループ内ノードをレイアウト（グループ左上を原点としたローカル座標） */
function layoutGroupNodes(
  toLayout: DiagramNode[],
  allGroupNodes: DiagramNode[],
  g: DiagramGroup,
  edges: DiagramEdge[],
  rankdir: "TB" | "LR" = "LR",
): void {
  if (toLayout.length === 0) return;

  const nodeIds = new Set(toLayout.map((n) => n.id));
  const positions = sugiyamaLayout(
    toLayout.map((n) => ({ id: n.id, w: n.w, h: n.h })),
    edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to)),
    rankdir,
    { nodesep: NODE_SEP, ranksep: RANK_SEP },
  );

  const offsetX = g.x + PADDING;
  const offsetY = g.y + LABEL_HEIGHT + PADDING;

  toLayout.forEach((n) => {
    const pos = positions.get(n.id);
    if (!pos) return;
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

/** グループ自体をレイアウトして重なりを解消する */
function layoutGroups(
  groups: DiagramGroup[],
  groupUpdates: Record<string, DiagramGroup>,
  edges: DiagramEdge[],
  allNodes: DiagramNode[],
  rankdir: "TB" | "LR" = "LR",
): Record<string, DiagramGroup> {
  if (groups.length <= 1) return groupUpdates;

  const effectiveGroups = groups.map((g) => groupUpdates[g.id] ?? g);

  // ノードレベルのエッジからグループ間エッジを推定
  const nodeToGroup: Record<string, string> = {};
  allNodes.forEach((n) => {
    if (n.group) nodeToGroup[n.id] = n.group;
  });
  const addedEdges = new Set<string>();
  const groupEdges: { from: string; to: string }[] = [];
  edges.forEach((e) => {
    const fromGroup = nodeToGroup[e.from];
    const toGroup = nodeToGroup[e.to];
    if (fromGroup && toGroup && fromGroup !== toGroup) {
      const key = `${fromGroup}->${toGroup}`;
      if (!addedEdges.has(key)) {
        addedEdges.add(key);
        groupEdges.push({ from: fromGroup, to: toGroup });
      }
    }
  });

  const positions = sugiyamaLayout(
    effectiveGroups.map((g) => ({ id: g.id, w: g.w, h: g.h })),
    groupEdges,
    rankdir,
    { nodesep: GROUP_GAP, ranksep: GROUP_GAP * 1.5, marginx: 40, marginy: 40 },
  );

  const result: Record<string, DiagramGroup> = { ...groupUpdates };
  effectiveGroups.forEach((g) => {
    const pos = positions.get(g.id);
    if (pos) result[g.id] = { ...g, x: pos.x - g.w / 2, y: pos.y - g.h / 2 };
  });
  return result;
}

/** フリーノードをレイアウト（startY の下から開始） */
function layoutFreeNodes(
  toLayout: DiagramNode[],
  allFreeNodes: DiagramNode[],
  edges: DiagramEdge[],
  startY: number,
  rankdir: "TB" | "LR" = "LR",
): void {
  if (toLayout.length === 0) return;

  const nodeIds = new Set(toLayout.map((n) => n.id));
  const positions = sugiyamaLayout(
    toLayout.map((n) => ({ id: n.id, w: n.w, h: n.h })),
    edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to)),
    rankdir,
    { nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 40, marginy: 40 },
  );

  // 結果の最小 Y を求めて startY に合わせるオフセットを計算
  const minY = Math.min(...toLayout.map((n) => {
    const pos = positions.get(n.id)!;
    return pos.y - n.h / 2;
  }));
  const offsetY = startY - minY;

  toLayout.forEach((n) => {
    const pos = positions.get(n.id)!;
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

/** グループの深さを返す（ルート=0）。cache を渡すと結果をキャッシュする */
export function getGroupDepth(gid: string, groupById: Record<string, DiagramGroup>, cache?: Map<string, number>): number {
  if (cache) {
    const cached = cache.get(gid);
    if (cached !== undefined) return cached;
  }
  const g = groupById[gid];
  if (!g?.parentGroup || !groupById[g.parentGroup]) {
    cache?.set(gid, 0);
    return 0;
  }
  const d = getGroupDepth(g.parentGroup, groupById, cache) + 1;
  cache?.set(gid, d);
  return d;
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

  const dx = new Array<number>(allNodes.length).fill(0);
  const dy = new Array<number>(allNodes.length).fill(0);

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

  const depthCache = new Map<string, number>();
  const sortedGroups = [...groups].sort((a, b) => getGroupDepth(b.id, groupById, depthCache) - getGroupDepth(a.id, groupById, depthCache));

  for (const g of sortedGroups) {
    const members = nodes.filter((n) => n.group === g.id);
    const children = (childGroupsMap[g.id] ?? []).map((c) => groupUpdates[c.id] ?? c);
    if (members.length > 0 || children.length > 0) {
      groupUpdates[g.id] = computeGroupFit(members, children, g);
    }
  }

  // トップレベルグループの重なりを解消
  const topLevelGroups = groups.filter(
    (g) => groupUpdates[g.id] !== undefined && !g.parentGroup,
  );
  if (topLevelGroups.length > 1) {
    const repositionedGroups = layoutGroups(topLevelGroups, groupUpdates, edges, nodes, "LR");
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

  // フリーノードをグループ領域外に押し出す
  const freeNodes = nodes.filter((n) => !n.group);
  if (freeNodes.length > 0 && Object.keys(groupUpdates).length > 0) {
    const allGroupRects = Object.values(groupUpdates);
    const groupsBottom = Math.max(...allGroupRects.map((g) => g.y + g.h));
    const groupsLeft = Math.min(...allGroupRects.map((g) => g.x));
    const startY = groupsBottom + 60;

    const overlapping = freeNodes.filter((n) =>
      allGroupRects.some((g) =>
        n.x < g.x + g.w + 20 && n.x + n.w + 20 > g.x &&
        n.y < g.y + g.h + 20 && n.y + n.h + 20 > g.y,
      ),
    );
    if (overlapping.length > 0) {
      let curX = groupsLeft;
      for (const n of overlapping) {
        n.x = curX;
        n.y = startY;
        curX += n.w + NODE_SEP;
      }
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
  const depthCache = new Map<string, number>();
  const sortedGroups = [...groups].sort((a, b) => getGroupDepth(b.id, groupById, depthCache) - getGroupDepth(a.id, groupById, depthCache));

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
    if (toLayout.length > 0) layoutGroupNodes(toLayout, gnodes, g, edges, rankdir);

    const childDefs = childGroupsMap[g.id] ?? [];
    const hasUpdatedChildren = childDefs.some((c) => groupUpdates[c.id] !== undefined);

    // メンバーノードのレイアウト変更も子グループの更新もなければスキップ
    if (toLayout.length === 0 && !hasUpdatedChildren) continue;

    // 処理済み子グループを配置（TB: 縦積み, LR: 横並び）
    if (childDefs.length > 0) {
      let contentBottom = g.y + LABEL_HEIGHT + PADDING;
      if (gnodes.length > 0) {
        contentBottom = Math.max(...gnodes.map((n) => n.y + n.h));
      }

      if (rankdir === "TB") {
        let curY = contentBottom + NESTED_GROUP_GAP;
        const startX = g.x + PADDING;
        for (const childDef of childDefs) {
          const child = groupUpdates[childDef.id] ?? childDef;
          const dx = startX - child.x;
          const dy = curY + LABEL_HEIGHT - child.y;

          if (dx !== 0 || dy !== 0) {
            shiftGroupTree(childDef.id, dx, dy);
            shiftGroupNodes(childDef.id, dx, dy);
          }

          const updatedChild = groupUpdates[childDef.id] ?? childDef;
          curY += updatedChild.h + NESTED_GROUP_GAP;
        }
      } else {
        const startY = contentBottom + NESTED_GROUP_GAP + LABEL_HEIGHT;
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
          curX += updatedChild.w + NESTED_GROUP_GAP;
        }
      }
    }

    // ノード＋子グループでグループ枠を再計算
    const updatedChildren = childDefs.map((c) => groupUpdates[c.id] ?? c);
    if (gnodes.length > 0 || updatedChildren.length > 0) {
      groupUpdates[g.id] = computeGroupFit(gnodes, updatedChildren, g);
    }
  }

  // トップレベルグループのみ再配置（子グループは親に追従）
  const topLevelGroups = groups.filter(
    (g) => groupUpdates[g.id] !== undefined && !g.parentGroup,
  );
  const repositionedGroups = layoutGroups(topLevelGroups, groupUpdates, edges, nodes, rankdir);
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

  // フリーノードをレイアウト（全グループの下から開始）
  const freeToLayout = freeNodes.filter((n) => n._needsPosition);
  if (freeToLayout.length > 0) {
    const updatedGroups = groups.map((g) => groupUpdates[g.id] ?? g);
    const groupsBottom =
      updatedGroups.length > 0 ? Math.max(...updatedGroups.map((g) => g.y + g.h)) : 0;
    const startY = groupsBottom > 0 ? groupsBottom + 80 : 40;
    layoutFreeNodes(freeToLayout, freeNodes, edges, startY, rankdir);
  }

  nodes.forEach((n) => delete n._needsPosition);
  return { nodes, groupUpdates };
}
