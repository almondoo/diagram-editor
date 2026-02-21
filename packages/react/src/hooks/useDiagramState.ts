import { useState, useMemo } from "react";
import {
  parseDSL,
  autoLayout,
  formatDSLCode,
  generateExportSVG,
  randomColor,
  randomPosition,
  TEMPLATES,
} from "diagram-dsl-core";
import type { ParseResult, DiagramNode } from "diagram-dsl-core";

export function useDiagramState(initialCode?: string) {
  const [code, setCode] = useState(initialCode ?? TEMPLATES.architecture);

  const parsed: ParseResult = useMemo(() => {
    const p = parseDSL(code);
    p.nodes = autoLayout(p.nodes, p.edges);
    return p;
  }, [code]);

  const nodeById = useMemo(() => {
    const map: Record<string, DiagramNode> = {};
    parsed.nodes.forEach((n) => (map[n.id] = n));
    return map;
  }, [parsed.nodes]);

  const addNode = (shape: string) => {
    const id = `n${Date.now().toString(36)}`;
    const col = randomColor();
    const pos = randomPosition(parsed.nodes);
    const newLine = `\nnode ${id} "新規ノード" { shape=${shape} color=${col} x=${pos.x} y=${pos.y} }`;
    setCode((c) => c + newLine);
  };

  const exportSVG = () => {
    const svgData = generateExportSVG(parsed);
    if (!svgData) return;
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCode = () => setCode((c) => formatDSLCode(c));

  return { code, setCode, parsed, nodeById, addNode, exportSVG, formatCode };
}
