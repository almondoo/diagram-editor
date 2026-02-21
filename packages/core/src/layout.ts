import type { DiagramNode, DiagramEdge, DiagramGroup } from "./types.js";
import { randomColor } from "./colors.js";

const LABEL_HEIGHT = 26;
const PADDING = 12;
const H_GAP = 14;
const V_GAP = 10;

/** グループ内ノードをグリッド配置（グループのバウンディングボックス内に収める） */
function layoutGroupNodes(toLayout: DiagramNode[], g: DiagramGroup): void {
  const maxNodeW = Math.max(...toLayout.map((n) => n.w));
  const maxNodeH = Math.max(...toLayout.map((n) => n.h));
  const usableW = g.w - PADDING * 2;

  // グループ幅に収まる列数を決定
  const cols = Math.max(1, Math.floor((usableW + H_GAP) / (maxNodeW + H_GAP)));
  const rows = Math.ceil(toLayout.length / cols);

  const totalW = cols * maxNodeW + (cols - 1) * H_GAP;
  const totalH = rows * maxNodeH + (rows - 1) * V_GAP;

  // グループ内でグリッドを中央揃え
  const innerTop = g.y + LABEL_HEIGHT + PADDING;
  const innerH = g.h - LABEL_HEIGHT - PADDING;
  const startX = g.x + (g.w - totalW) / 2;
  const startY = innerTop + Math.max(0, (innerH - totalH) / 2);

  toLayout.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    node.x = startX + col * (maxNodeW + H_GAP);
    node.y = startY + row * (maxNodeH + V_GAP);
  });
}

/** Kahn's algorithm によるトポロジカルソートでレイヤー分け */
function topoLayers(nodes: DiagramNode[], edges: DiagramEdge[]): string[][] {
  const ids = new Set(nodes.map((n) => n.id));
  const adj: Record<string, string[]> = {};
  const inDeg: Record<string, number> = {};

  nodes.forEach((n) => {
    adj[n.id] = [];
    inDeg[n.id] = 0;
  });
  edges.forEach((e) => {
    if (ids.has(e.from) && ids.has(e.to)) {
      adj[e.from].push(e.to);
      if (inDeg[e.to] !== undefined) inDeg[e.to]++;
    }
  });

  const layers: string[][] = [];
  const visited = new Set<string>();
  let queue = Object.keys(inDeg).filter((k) => inDeg[k] === 0);
  if (queue.length === 0 && nodes.length > 0) queue = [nodes[0].id];

  while (queue.length > 0) {
    layers.push([...queue]);
    queue.forEach((id) => visited.add(id));
    const next: string[] = [];
    queue.forEach((id) => {
      (adj[id] || []).forEach((child) => {
        if (inDeg[child] !== undefined) inDeg[child]--;
        if (inDeg[child] <= 0 && !visited.has(child)) {
          next.push(child);
          visited.add(child);
        }
      });
    });
    queue = next;
  }

  // サイクルなどで未訪問のノードを末尾に追加
  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      layers.push([n.id]);
      visited.add(n.id);
    }
  });

  return layers;
}

export function autoLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  groups: DiagramGroup[] = [],
): DiagramNode[] {
  if (nodes.length === 0) return nodes;

  // __RANDOM__ カラーを解決
  nodes.forEach((n) => {
    if (n.color === "__RANDOM__") n.color = randomColor();
  });

  const needsLayout = nodes.some((n) => n._needsPosition);
  if (!needsLayout) return nodes;

  const nodeById: Record<string, DiagramNode> = {};
  nodes.forEach((n) => (nodeById[n.id] = n));

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

  // グループ内ノードをグループのバウンディングボックス内に配置
  for (const [groupId, gnodes] of Object.entries(groupedNodesMap)) {
    const g = groupById[groupId];
    if (!g) continue;
    const toLayout = gnodes.filter((n) => n._needsPosition);
    if (toLayout.length > 0) layoutGroupNodes(toLayout, g);
  }

  // フリーノードをトポロジカルソートでレイヤー配置
  // グループ全体のバウンディングボックスを避けた位置から開始
  if (freeNodes.some((n) => n._needsPosition)) {
    const layers = topoLayers(freeNodes, edges);

    let startX = 80;
    let startY = 80;

    if (groups.length > 0) {
      // 全グループの下端に余白を加えた位置から開始
      const groupsBottom = Math.max(...groups.map((g) => g.y + g.h));
      startY = groupsBottom + 80;
    }

    const gapX = 240;
    const gapY = 100;
    const maxLayerSize = Math.max(...layers.map((l) => l.length), 1);

    layers.forEach((layer, li) => {
      const totalHeight = layer.length * gapY;
      const offsetY = startY + (maxLayerSize * gapY - totalHeight) / 2;
      layer.forEach((id, ni) => {
        const node = nodeById[id];
        if (node && node._needsPosition) {
          node.x = startX + li * gapX;
          node.y = offsetY + ni * gapY;
        }
      });
    });
  }

  nodes.forEach((n) => delete n._needsPosition);
  return nodes;
}
