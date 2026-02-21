import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  parseDSL,
  autoLayout,
  formatDSLCode,
  generateExportSVG,
  randomColor,
  TEMPLATES,
} from "diagram-dsl-core";
import type { ParseResult, DiagramNode, DiagramGroup } from "diagram-dsl-core";
import { syncNodes } from "./syncNodes.js";
import { syncGroups } from "./syncGroups.js";

// グループ内ノードの境界クランプ用定数（layout.ts と合わせる）
const GROUP_PADDING = 12;
const GROUP_LABEL_H = 26;

export function useDiagramState(initialCode?: string) {
  const [code, setCode] = useState(initialCode ?? TEMPLATES.architecture);
  const [nodeStates, setNodeStates] = useState<Record<string, DiagramNode>>({});
  const [groupStates, setGroupStates] = useState<Record<string, DiagramGroup>>({});

  // グループ状態の ref（setNodeLayout の stable callback から読むため）
  const groupStatesRef = useRef(groupStates);
  groupStatesRef.current = groupStates;

  // ノード状態の ref（setNodeLayout の stable callback から読むため）
  const nodeStatesRef = useRef(nodeStates);
  nodeStatesRef.current = nodeStates;

  // コードをパース
  const parsedRaw = useMemo(() => parseDSL(code), [code]);

  // コード変更時に nodeStates を同期
  useEffect(() => {
    setNodeStates((prev) => syncNodes(parsedRaw.nodes, prev));
  }, [parsedRaw]);

  // コード変更時に groupStates を同期
  useEffect(() => {
    setGroupStates((prev) => syncGroups(parsedRaw.groups, prev));
  }, [parsedRaw]);

  // displayGroups: groupStates の値を優先（ドラッグ/リサイズを反映）
  const displayGroups = useMemo<DiagramGroup[]>(() => {
    return parsedRaw.groups.map((g) => groupStates[g.id] ?? g);
  }, [parsedRaw.groups, groupStates]);

  // displayNodes: nodeStates に autoLayout を適用（displayGroups を渡す）
  const layoutResult = useMemo(() => {
    const nodes = parsedRaw.nodes
      .filter((n) => nodeStates[n.id] !== undefined)
      .map((n) => ({ ...nodeStates[n.id] as DiagramNode }));
    return autoLayout(nodes, parsedRaw.edges, displayGroups);
  }, [parsedRaw, nodeStates, displayGroups]);

  const displayNodes = layoutResult.nodes;

  // autoLayout が割り当てた位置を nodeStates に保存（_needsPosition のノードのみ）
  const prevDisplayNodesRef = useRef<DiagramNode[]>([]);
  useEffect(() => {
    // _needsPosition をクリア
    const nodeUpdates: Record<string, DiagramNode> = {};
    for (const node of displayNodes) {
      if (nodeStates[node.id]?._needsPosition) {
        nodeUpdates[node.id] = { ...node, _needsPosition: false };
      }
    }
    if (Object.keys(nodeUpdates).length > 0) {
      setNodeStates((prev) => ({ ...prev, ...nodeUpdates }));
    }

    // グループ自動フィットを反映
    const { groupUpdates } = layoutResult;
    if (Object.keys(groupUpdates).length > 0) {
      setGroupStates((prev) => ({ ...prev, ...groupUpdates }));
    }

    prevDisplayNodesRef.current = displayNodes;
  }, [displayNodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // 最終的な parsed（consumers はこれを使う）
  const parsed: ParseResult = useMemo(
    () => ({ ...parsedRaw, nodes: displayNodes, groups: displayGroups }),
    [parsedRaw, displayNodes, displayGroups],
  );

  const nodeById = useMemo(() => {
    const map: Record<string, DiagramNode> = {};
    displayNodes.forEach((n) => (map[n.id] = n));
    return map;
  }, [displayNodes]);

  const groupById = useMemo(() => {
    const map: Record<string, DiagramGroup> = {};
    displayGroups.forEach((g) => (map[g.id] = g));
    return map;
  }, [displayGroups]);

  // ドラッグ用: nodeStates の x/y を更新（グループを自動拡張）
  const setNodeLayout = useCallback((nodeId: string, x: number, y: number) => {
    const node = nodeStatesRef.current[nodeId];
    if (!node) return;

    if (!node.group) {
      setNodeStates((prev) => {
        const n = prev[nodeId];
        if (!n) return prev;
        return { ...prev, [nodeId]: { ...n, x, y } };
      });
      return;
    }

    const group = groupStatesRef.current[node.group];
    if (!group) {
      setNodeStates((prev) => {
        const n = prev[nodeId];
        if (!n) return prev;
        return { ...prev, [nodeId]: { ...n, x, y } };
      });
      return;
    }

    // グループ拡張計算
    let newGroupX = group.x;
    let newGroupY = group.y;
    let newGroupW = group.w;
    let newGroupH = group.h;

    // 左方向: ノードがグループ左端より左に出ようとしている
    const leftEdge = group.x + GROUP_PADDING;
    if (x < leftEdge) {
      const expand = leftEdge - x;
      newGroupX = group.x - expand;
      newGroupW = group.w + expand;
    }

    // 右方向: ノードがグループ右端より右に出ようとしている
    const rightEdge = newGroupX + newGroupW - node.w - GROUP_PADDING;
    if (x > rightEdge) {
      newGroupW = newGroupW + (x - rightEdge);
    }

    // 上方向: ノードがグループ上端より上に出ようとしている
    const topEdge = group.y + GROUP_LABEL_H + GROUP_PADDING;
    if (y < topEdge) {
      const expand = topEdge - y;
      newGroupY = group.y - expand;
      newGroupH = group.h + expand;
    }

    // 下方向: ノードがグループ下端より下に出ようとしている
    const bottomEdge = newGroupY + newGroupH - node.h - GROUP_PADDING;
    if (y > bottomEdge) {
      newGroupH = newGroupH + (y - bottomEdge);
    }

    // グループが変更されていたら更新
    if (
      newGroupX !== group.x ||
      newGroupY !== group.y ||
      newGroupW !== group.w ||
      newGroupH !== group.h
    ) {
      setGroupStates((prev) => ({
        ...prev,
        [node.group]: {
          ...group,
          x: newGroupX,
          y: newGroupY,
          w: newGroupW,
          h: newGroupH,
        },
      }));
    }

    setNodeStates((prev) => {
      const n = prev[nodeId];
      if (!n) return prev;
      return { ...prev, [nodeId]: { ...n, x, y } };
    });
  }, []);

  // グループ移動: グループとその内包ノードを一括移動
  const setGroupLayout = useCallback((groupId: string, dx: number, dy: number) => {
    setGroupStates((prev) => {
      const g = prev[groupId];
      if (!g) return prev;
      return { ...prev, [groupId]: { ...g, x: g.x + dx, y: g.y + dy } };
    });
    setNodeStates((prev) => {
      let changed = false;
      const updates: Record<string, DiagramNode> = {};
      for (const [id, node] of Object.entries(prev)) {
        if (node.group === groupId) {
          updates[id] = { ...node, x: node.x + dx, y: node.y + dy };
          changed = true;
        }
      }
      return changed ? { ...prev, ...updates } : prev;
    });
  }, []);

  // グループリサイズ: グループの w/h を更新
  const setGroupSize = useCallback((groupId: string, newW: number, newH: number) => {
    setGroupStates((prev) => {
      const g = prev[groupId];
      if (!g) return prev;
      return { ...prev, [groupId]: { ...g, w: newW, h: newH } };
    });
  }, []);

  // ノード追加
  const addNode = (shape: string) => {
    const id = `n${Date.now().toString(36)}`;
    const col = randomColor();
    const newLine = `\nnode ${id} "新規ノード" { shape=${shape} color=${col} }`;
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

  // 全ノードの位置をリセットして autoLayout を再実行
  const resetLayout = () => {
    setNodeStates((prev) => {
      const updated: Record<string, DiagramNode> = {};
      for (const [id, node] of Object.entries(prev)) {
        updated[id] = { ...node, _needsPosition: true };
      }
      return updated;
    });
  };

  // テンプレート読み込み
  const loadTemplate = (templateCode: string) => {
    const tempParsed = parseDSL(templateCode);

    // nodeStates 初期化
    const initialNodeStates: Record<string, DiagramNode> = {};
    for (const node of tempParsed.nodes) {
      const { _explicitProps: _, ...nodeData } = node;
      initialNodeStates[node.id] = {
        ...nodeData,
        _needsPosition: !Number.isFinite(nodeData.x) || !Number.isFinite(nodeData.y),
      };
    }

    // groupStates 初期化
    const initialGroupStates: Record<string, DiagramGroup> = {};
    for (const g of tempParsed.groups) {
      initialGroupStates[g.id] = { ...g };
    }

    setNodeStates(initialNodeStates);
    setGroupStates(initialGroupStates);
    setCode(formatDSLCode(templateCode));
  };

  // 保存済みダイアグラムを読み込む
  const loadSaved = (savedCode: string, savedNodeStates: Record<string, DiagramNode>) => {
    setNodeStates(savedNodeStates);
    setGroupStates({}); // syncGroups effect が走って parsedRaw から初期化される
    setCode(savedCode);
  };

  return {
    code,
    setCode,
    parsed,
    nodeById,
    groupById,
    nodeStates,
    setNodeLayout,
    setGroupLayout,
    setGroupSize,
    addNode,
    exportSVG,
    formatCode,
    resetLayout,
    loadTemplate,
    loadSaved,
  };
}
