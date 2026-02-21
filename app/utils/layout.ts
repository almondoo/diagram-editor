import type { DiagramNode, DiagramEdge } from "../types";
import { randomColor } from "./colors";

export function autoLayout(nodes: DiagramNode[], edges: DiagramEdge[]): DiagramNode[] {
  if (nodes.length === 0) return nodes;

  nodes.forEach((n) => {
    if (n.color === "__RANDOM__") {
      n.color = randomColor();
    }
  });

  const needsLayout = nodes.some((n) => n._needsPosition);
  if (!needsLayout) return nodes;

  const adj: Record<string, string[]> = {};
  const inDeg: Record<string, number> = {};
  const nodeSet = new Set(nodes.map((n) => n.id));
  nodes.forEach((n) => {
    adj[n.id] = [];
    inDeg[n.id] = 0;
  });
  edges.forEach((e) => {
    if (nodeSet.has(e.from) && nodeSet.has(e.to)) {
      adj[e.from].push(e.to);
      if (inDeg[e.to] !== undefined) inDeg[e.to]++;
    }
  });

  // Topological layering (Kahn's algorithm)
  const layers: string[][] = [];
  const visited = new Set<string>();
  let queue = Object.keys(inDeg).filter((k) => inDeg[k] === 0);
  if (queue.length === 0) queue = [nodes[0]?.id].filter(Boolean);

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

  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      layers.push([n.id]);
      visited.add(n.id);
    }
  });

  const nodeById: Record<string, DiagramNode> = {};
  nodes.forEach((n) => (nodeById[n.id] = n));

  const gapX = 240;
  const gapY = 100;
  const startX = 80;
  const startY = 80;

  const maxLayerSize = Math.max(...layers.map((l) => l.length));

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

  nodes.forEach((n) => delete n._needsPosition);

  return nodes;
}
