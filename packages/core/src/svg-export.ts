import type { ParseResult } from "./types.js";
import { getEdgePoints, getShapePath, buildEdgePath } from "./geometry.js";

export function escapeXml(str: string | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateExportSVG(parsed: ParseResult): string | null {
  const { nodes, edges, groups, notes } = parsed;
  if (nodes.length === 0 && groups.length === 0 && notes.length === 0) return null;

  // 全要素のバウンディングボックスを集約
  const rects = [
    ...nodes.map((n) => ({ l: n.x - 10, t: n.y - 10, r: n.x + n.w + 10, b: n.y + n.h + 10 })),
    ...groups.map((g) => ({ l: g.x - 10, t: g.y - 10, r: g.x + g.w + 10, b: g.y + g.h + 10 })),
    ...notes.map((n) => ({ l: n.x - 10, t: n.y - 10, r: n.x + n.text.length * 7 + 30, b: n.y + 40 })),
  ];

  let minX = 0, minY = 0, maxX = 400, maxY = 300;
  if (rects.length > 0) {
    minX = Math.min(...rects.map((r) => r.l));
    minY = Math.min(...rects.map((r) => r.t));
    maxX = Math.max(...rects.map((r) => r.r));
    maxY = Math.max(...rects.map((r) => r.b));
  }

  const padding = 40;
  const svgW = maxX - minX + padding * 2;
  const svgH = maxY - minY + padding * 2;
  const ox = -minX + padding;
  const oy = -minY + padding;

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">\n`;
  svgContent += `<rect width="${svgW}" height="${svgH}" fill="#0a0c12"/>\n`;
  svgContent += `<g transform="translate(${ox},${oy})">\n`;

  edges.forEach((edge, i) => {
    const mid = `ah-export-${i}`;
    const midStart = `ah-start-export-${i}`;
    if (edge.arrow === "end" || edge.arrow === "both") {
      svgContent += `<defs><marker id="${mid}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${escapeXml(edge.color)}"/></marker></defs>\n`;
    }
    if (edge.arrow === "start" || edge.arrow === "both") {
      svgContent += `<defs><marker id="${midStart}" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="${escapeXml(edge.color)}"/></marker></defs>\n`;
    }
  });

  groups.forEach((g) => {
    svgContent += `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12" fill="${escapeXml(g.color)}" fill-opacity="0.1" stroke="${escapeXml(g.color)}" stroke-width="1.5" stroke-dasharray="8,4"/>\n`;
    svgContent += `<text x="${g.x + 14}" y="${g.y + 20}" fill="${escapeXml(g.color)}" font-size="12" font-family="system-ui, sans-serif" font-weight="600" opacity="0.8">${escapeXml(g.label)}</text>\n`;
  });

  notes.forEach((n) => {
    const nw = Math.max(n.text.length * 7 + 16, 80);
    svgContent += `<rect x="${n.x}" y="${n.y}" width="${nw}" height="28" rx="4" fill="${escapeXml(n.color)}" fill-opacity="0.15" stroke="${escapeXml(n.color)}" stroke-width="1"/>\n`;
    svgContent += `<text x="${n.x + 8}" y="${n.y + 17}" fill="${escapeXml(n.color)}" font-size="11" font-family="monospace">${escapeXml(n.text)}</text>\n`;
  });

  const nodeById: Record<string, (typeof nodes)[0]> = {};
  nodes.forEach((n) => (nodeById[n.id] = n));

  edges.forEach((edge, i) => {
    const fromNode = nodeById[edge.from];
    const toNode = nodeById[edge.to];
    if (!fromNode || !toNode) return;

    const { from, to } = getEdgePoints(fromNode, toNode);
    const { pathD, labelX, labelY } = buildEdgePath(from, to, edge.curve, edge._routePoints);

    const mid = `ah-export-${i}`;
    const midStart = `ah-start-export-${i}`;
    const dashArr = edge.style === "dashed" ? ' stroke-dasharray="8,4"' : "";
    const markerEnd = edge.arrow === "end" || edge.arrow === "both" ? ` marker-end="url(#${mid})"` : "";
    const markerStart = edge.arrow === "start" || edge.arrow === "both" ? ` marker-start="url(#${midStart})"` : "";
    svgContent += `<path d="${pathD}" fill="none" stroke="${escapeXml(edge.color)}" stroke-width="${edge.thickness}"${dashArr}${markerEnd}${markerStart}/>\n`;

    if (edge.label) {
      const lw = edge.label.length * 8 + 8;
      svgContent += `<rect x="${labelX - lw / 2}" y="${labelY - 10}" width="${lw}" height="20" rx="4" fill="#0f172a" fill-opacity="0.85"/>\n`;
      svgContent += `<text x="${labelX}" y="${labelY + 1}" text-anchor="middle" dominant-baseline="middle" fill="#e2e8f0" font-size="11" font-family="monospace" font-weight="500">${escapeXml(edge.label)}</text>\n`;
    }
  });

  nodes.forEach((node) => {
    const { x, y, w, h, shape, color, label, textColor, icon, fontSize, borderColor, borderWidth, dashed } = node;
    const stroke = borderColor || color;
    const dashArr = dashed ? ' stroke-dasharray="6,3"' : "";

    if (shape === "ellipse" || shape === "circle") {
      svgContent += `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${escapeXml(color)}" stroke="${escapeXml(stroke)}" stroke-width="${borderWidth}"${dashArr}/>\n`;
    } else if (shape === "cylinder") {
      const ry = 10;
      svgContent += `<path d="M${x},${y + ry} L${x},${y + h - ry} A${w / 2},${ry} 0 0,0 ${x + w},${y + h - ry} L${x + w},${y + ry}" fill="${escapeXml(color)}" stroke="${escapeXml(stroke)}" stroke-width="${borderWidth}"${dashArr}/>\n`;
      svgContent += `<ellipse cx="${x + w / 2}" cy="${y + ry}" rx="${w / 2}" ry="${ry}" fill="${escapeXml(color)}" stroke="${escapeXml(stroke)}" stroke-width="${borderWidth}"${dashArr}/>\n`;
    } else {
      const path = getShapePath(shape, x, y, w, h);
      if (path) {
        svgContent += `<path d="${path}" fill="${escapeXml(color)}" stroke="${escapeXml(stroke)}" stroke-width="${borderWidth}"${dashArr}/>\n`;
      } else {
        svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${escapeXml(color)}" stroke="${escapeXml(stroke)}" stroke-width="${borderWidth}"${dashArr}/>\n`;
      }
    }

    const ty = y + h / 2;
    if (icon) {
      svgContent += `<text x="${x + w / 2}" y="${ty - 4}" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(textColor)}" font-size="${fontSize + 4}" font-family="system-ui, sans-serif">${escapeXml(icon)}</text>\n`;
      svgContent += `<text x="${x + w / 2}" y="${ty + fontSize}" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(textColor)}" font-size="${fontSize}" font-family="system-ui, sans-serif" font-weight="500">${escapeXml(label.length > 18 ? label.slice(0, 17) + "…" : label)}</text>\n`;
    } else {
      svgContent += `<text x="${x + w / 2}" y="${ty + 1}" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(textColor)}" font-size="${fontSize}" font-family="system-ui, sans-serif" font-weight="500">${escapeXml(label.length > 18 ? label.slice(0, 17) + "…" : label)}</text>\n`;
    }
  });

  svgContent += `</g>\n</svg>`;
  return svgContent;
}
