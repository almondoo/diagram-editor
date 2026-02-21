import { useState, useMemo, useEffect, useRef } from "react";
import {
  parseDSL,
  autoLayout,
  formatDSLCode,
  generateExportSVG,
  randomColor,
  TEMPLATES,
} from "diagram-dsl-core";
import type { ParseResult, DiagramNode } from "diagram-dsl-core";
import { syncNodes } from "./syncNodes.js";

export function useDiagramState(initialCode?: string) {
  const [code, setCode] = useState(initialCode ?? TEMPLATES.architecture);
  const [nodeStates, setNodeStates] = useState<Record<string, DiagramNode>>({});

  // コードをパース（構造情報のみ: edges, groups, notes + 明示プロパティを持つ nodes）
  const parsedRaw = useMemo(() => parseDSL(code), [code]);

  // コード変更時に nodeStates を同期
  useEffect(() => {
    setNodeStates((prev) => syncNodes(parsedRaw.nodes, prev));
  }, [parsedRaw]);

  // レンダリング用 displayNodes: nodeStates の値に autoLayout を適用
  const displayNodes = useMemo(() => {
    const nodes = parsedRaw.nodes
      .filter((n) => nodeStates[n.id] !== undefined)
      .map((n) => ({ ...nodeStates[n.id] }));
    return autoLayout(nodes, parsedRaw.edges);
  }, [parsedRaw, nodeStates]);

  // autoLayout が割り当てた位置を nodeStates に保存（_needsPosition のノードのみ）
  const prevDisplayNodesRef = useRef<DiagramNode[]>([]);
  useEffect(() => {
    const updates: Record<string, DiagramNode> = {};
    for (const node of displayNodes) {
      if (nodeStates[node.id]?._needsPosition) {
        updates[node.id] = { ...node, _needsPosition: false };
      }
    }
    if (Object.keys(updates).length > 0) {
      setNodeStates((prev) => ({ ...prev, ...updates }));
    }
    prevDisplayNodesRef.current = displayNodes;
  }, [displayNodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // 最終的な parsed（consumers はこれを使う）
  const parsed: ParseResult = useMemo(
    () => ({ ...parsedRaw, nodes: displayNodes }),
    [parsedRaw, displayNodes]
  );

  const nodeById = useMemo(() => {
    const map: Record<string, DiagramNode> = {};
    displayNodes.forEach((n) => (map[n.id] = n));
    return map;
  }, [displayNodes]);

  // ドラッグ用: nodeStates の x/y を更新（コード変更なし）
  const setNodeLayout = (nodeId: string, x: number, y: number) => {
    setNodeStates((prev) => {
      const node = prev[nodeId];
      if (!node) return prev;
      return { ...prev, [nodeId]: { ...node, x, y } };
    });
  };

  // ノード追加: コードには shape のみ、位置は nodeStates に追加（autoLayout 任せ）
  const addNode = (shape: string) => {
    const id = `n${Date.now().toString(36)}`;
    const col = randomColor();
    const newLine = `\nnode ${id} "新規ノード" { shape=${shape} color=${col} }`;
    setCode((c) => c + newLine);
    // nodeStates の初期化は syncNodes の effect で行われる
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

  // テンプレート読み込み: テンプレートの x/y/w/h をシード値として nodeStates に設定し
  // フォーマット済みコード（x/y/w/h なし）をセット
  const loadTemplate = (templateCode: string) => {
    const tempParsed = parseDSL(templateCode);
    const initialStates: Record<string, DiagramNode> = {};
    for (const node of tempParsed.nodes) {
      const { _explicitProps: _, ...nodeData } = node;
      initialStates[node.id] = {
        ...nodeData,
        _needsPosition: !Number.isFinite(nodeData.x) || !Number.isFinite(nodeData.y),
      };
    }
    setNodeStates(initialStates);
    setCode(formatDSLCode(templateCode));
  };

  // 保存済みダイアグラムを読み込む
  const loadSaved = (savedCode: string, savedNodeStates: Record<string, DiagramNode>) => {
    setNodeStates(savedNodeStates);
    setCode(savedCode);
  };

  return {
    code,
    setCode,
    parsed,
    nodeById,
    nodeStates,
    setNodeLayout,
    addNode,
    exportSVG,
    formatCode,
    loadTemplate,
    loadSaved,
  };
}
