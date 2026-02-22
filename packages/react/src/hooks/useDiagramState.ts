import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  parseDSL,
  autoLayout,
  formatDSLCode,
  generateExportSVG,
  randomColor,
} from "diagram-dsl-core";
import type { ParseResult, DiagramNode, DiagramGroup, DiagramNote } from "diagram-dsl-core";
import { syncNodes } from "./syncNodes.js";
import { syncGroups } from "./syncGroups.js";
import { syncNotes } from "./syncNotes.js";

// グループ内ノードの境界クランプ用定数（layout.ts と合わせる）
const GROUP_PADDING = 12;
const GROUP_LABEL_H = 26;

/** 親グループが子グループ・メンバーノードを必ず包含するように補正する */
function enforceGroupContainment(
  groups: DiagramGroup[],
  nodes: DiagramNode[],
): DiagramGroup[] {
  if (groups.length === 0) return groups;

  const result = new Map(groups.map((g) => [g.id, { ...g }]));

  const childGroupMap: Record<string, string[]> = {};
  const memberNodeMap: Record<string, DiagramNode[]> = {};

  for (const g of groups) {
    if (g.parentGroup && result.has(g.parentGroup)) {
      (childGroupMap[g.parentGroup] ??= []).push(g.id);
    }
  }
  for (const n of nodes) {
    if (n.group && result.has(n.group)) {
      (memberNodeMap[n.group] ??= []).push(n);
    }
  }

  // ボトムアップ（深い子から先に処理）
  const getDepth = (gid: string): number => {
    const g = result.get(gid);
    if (!g?.parentGroup || !result.has(g.parentGroup)) return 0;
    return getDepth(g.parentGroup) + 1;
  };
  const sorted = [...groups].sort((a, b) => getDepth(b.id) - getDepth(a.id));

  // Step 1: 子グループが親の外にある場合、親の内部に再配置
  for (const { id: gid } of sorted) {
    const g = result.get(gid)!;
    if (!g.parentGroup) continue;
    const parent = result.get(g.parentGroup);
    if (!parent) continue;

    const insideParent =
      g.x >= parent.x && g.y >= parent.y &&
      g.x + g.w <= parent.x + parent.w && g.y + g.h <= parent.y + parent.h;

    if (!insideParent) {
      const siblings = memberNodeMap[g.parentGroup] ?? [];
      const contentBottom = siblings.length > 0
        ? Math.max(...siblings.map((n) => n.y + n.h))
        : parent.y;
      const targetY = contentBottom + GROUP_LABEL_H + GROUP_PADDING;
      result.set(g.id, { ...g, x: parent.x + GROUP_PADDING, y: targetY });
    }
  }

  // Step 2: 親グループが子グループ・ノードを包含するように拡張
  for (const { id: gid } of sorted) {
    const g = result.get(gid)!;
    const members = memberNodeMap[g.id] ?? [];
    const childIds = childGroupMap[g.id] ?? [];
    const children = childIds.map((id) => result.get(id)!).filter(Boolean);

    if (members.length === 0 && children.length === 0) continue;

    // メンバー・子グループの包含矩形を一括計算
    let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
    for (const n of members) {
      minL = Math.min(minL, n.x);
      minT = Math.min(minT, n.y);
      maxR = Math.max(maxR, n.x + n.w);
      maxB = Math.max(maxB, n.y + n.h);
    }
    for (const c of children) {
      minL = Math.min(minL, c.x);
      minT = Math.min(minT, c.y);
      maxR = Math.max(maxR, c.x + c.w);
      maxB = Math.max(maxB, c.y + c.h);
    }

    const needLeft = minL - GROUP_PADDING;
    const needTop = minT - GROUP_LABEL_H - GROUP_PADDING;
    const needRight = maxR + GROUP_PADDING;
    const needBottom = maxB + GROUP_PADDING;

    const newX = Math.min(g.x, needLeft);
    const newY = Math.min(g.y, needTop);
    const newRight = Math.max(g.x + g.w, needRight);
    const newBottom = Math.max(g.y + g.h, needBottom);

    if (newX !== g.x || newY !== g.y || newRight - newX !== g.w || newBottom - newY !== g.h) {
      result.set(g.id, { ...g, x: newX, y: newY, w: newRight - newX, h: newBottom - newY });
    }
  }

  return groups.map((g) => result.get(g.id)!);
}

/** 指定グループIDとその全子孫グループIDを再帰的に収集する */
function collectDescendantGroups(
  id: string,
  groupStates: Record<string, DiagramGroup>,
): string[] {
  const children = Object.values(groupStates).filter((g) => g.parentGroup === id);
  return [id, ...children.flatMap((c) => collectDescendantGroups(c.id, groupStates))];
}

export interface DiagramState {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  parsed: ParseResult;
  nodeById: Record<string, DiagramNode>;
  groupById: Record<string, DiagramGroup>;
  nodeStates: Record<string, DiagramNode>;
  groupStates: Record<string, DiagramGroup>;
  noteStates: Record<string, DiagramNote>;
  bendStates: Record<string, { bendX: number; bendY: number }>;
  setNodeLayout: (nodeId: string, x: number, y: number) => void;
  setNodeSize: (nodeId: string, w: number, h: number) => void;
  setGroupLayout: (groupId: string, dx: number, dy: number) => void;
  setGroupSize: (groupId: string, newW: number, newH: number) => void;
  setNoteLayout: (noteId: string, x: number, y: number) => void;
  multiMoveLayout: (selectedIds: Set<string>, dx: number, dy: number) => void;
  addNode: (shape: string) => void;
  addNote: () => void;
  addGroup: (parentGroupId?: string) => void;
  addEdge: (fromId: string, toId: string) => void;
  updateNodeProp: (nodeId: string, key: string, value: string) => void;
  updateEdgeProp: (fromId: string, toId: string, key: string, value: string) => void;
  deleteEdge: (fromId: string, toId: string) => void;
  deleteNode: (nodeId: string) => void;
  reconnectEdge: (originalFrom: string, originalTo: string, newFrom: string, newTo: string) => void;
  updateEdgeBend: (fromId: string, toId: string, bendX: number, bendY: number) => void;
  exportSVG: () => void;
  formatCode: () => void;
  resetLayout: () => void;
  loadTemplate: (templateCode: string) => void;
  loadSaved: (code: string, nodeStates: Record<string, DiagramNode>, groupStates: Record<string, DiagramGroup>, noteStates?: Record<string, DiagramNote>, bendStates?: Record<string, { bendX: number; bendY: number }>) => void;
}

export function useDiagramState(initialCode: string = ""): DiagramState {
  const [code, setCode] = useState(initialCode);
  const [nodeStates, setNodeStates] = useState<Record<string, DiagramNode>>({});
  const [groupStates, setGroupStates] = useState<Record<string, DiagramGroup>>({});
  const [noteStates, setNoteStates] = useState<Record<string, DiagramNote>>({});
  const [bendStates, setBendStates] = useState<Record<string, { bendX: number; bendY: number }>>({});

  // グループ状態の ref（setNodeLayout の stable callback から読むため）
  const groupStatesRef = useRef(groupStates);
  groupStatesRef.current = groupStates;

  // ノード状態の ref（setNodeLayout の stable callback から読むため）
  const nodeStatesRef = useRef(nodeStates);
  nodeStatesRef.current = nodeStates;

  const noteStatesRef = useRef(noteStates);
  noteStatesRef.current = noteStates;

  // コードをパース
  const parsedRaw = useMemo(() => parseDSL(code), [code]);

  // コード変更時に各ステートを一括同期（1回の useEffect で3つを更新 → React 18 自動バッチで 1 レンダリング）
  useEffect(() => {
    setNodeStates((prev) => syncNodes(parsedRaw.nodes, prev));
    setGroupStates((prev) => syncGroups(parsedRaw.groups, prev));
    setNoteStates((prev) => syncNotes(parsedRaw.notes, prev));
  }, [parsedRaw]);

  // displayGroups: 位置/サイズは groupStates、label/color は parsedRaw を優先
  const displayGroups = useMemo<DiagramGroup[]>(() => {
    return parsedRaw.groups.map((g) => {
      const state = groupStates[g.id];
      if (!state) return g;
      return { ...state, label: g.label, color: g.color, parentGroup: g.parentGroup };
    });
  }, [parsedRaw.groups, groupStates]);

  // displayNotes: noteStates の値を優先（ドラッグを反映）
  const displayNotes = useMemo<DiagramNote[]>(() => {
    return parsedRaw.notes.map((n) => noteStates[n.id] ?? n);
  }, [parsedRaw.notes, noteStates]);

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

  // _needsPosition なノートを自動配置（全コンテンツの下に並べる）
  useEffect(() => {
    const toPlace = displayNotes.filter((n) => n._needsPosition);
    if (toPlace.length === 0) return;

    const allGroups = Object.values(groupStatesRef.current);
    let contentBottom = 40;
    for (const n of displayNodes) contentBottom = Math.max(contentBottom, n.y + n.h);
    for (const g of allGroups) contentBottom = Math.max(contentBottom, g.y + g.h);

    const noteUpdates: Record<string, DiagramNote> = {};
    toPlace.forEach((n, i) => {
      noteUpdates[n.id] = { ...n, x: 60 + i * 190, y: contentBottom + 40, _needsPosition: false };
    });
    setNoteStates((prev) => ({ ...prev, ...noteUpdates }));
  }, [displayNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // displayEdges: bendStates のベンド値を優先（ドラッグベンドを反映）
  const displayEdges = useMemo(() => {
    return parsedRaw.edges.map((edge) => {
      const bend = bendStates[`${edge.from}->${edge.to}`];
      return bend ? { ...edge, bendX: bend.bendX, bendY: bend.bendY } : edge;
    });
  }, [parsedRaw.edges, bendStates]);

  // 親グループが子グループ・ノードを必ず包含するように補正
  const adjustedGroups = useMemo(
    () => enforceGroupContainment(displayGroups, displayNodes),
    [displayGroups, displayNodes],
  );

  // 最終的な parsed（consumers はこれを使う）
  const parsed: ParseResult = useMemo(
    () => ({ ...parsedRaw, nodes: displayNodes, edges: displayEdges, groups: adjustedGroups, notes: displayNotes }),
    [parsedRaw, displayNodes, displayEdges, adjustedGroups, displayNotes],
  );

  const nodeById = useMemo(
    () => Object.fromEntries(displayNodes.map((n) => [n.id, n])),
    [displayNodes],
  );

  const groupById = useMemo(
    () => Object.fromEntries(adjustedGroups.map((g) => [g.id, g])),
    [adjustedGroups],
  );

  // ドラッグ用: nodeStates の x/y を更新（グループを自動拡張）
  const setNodeLayout = useCallback((nodeId: string, x: number, y: number) => {
    const node = nodeStatesRef.current[nodeId];
    if (!node) return;

    const group = node.group ? groupStatesRef.current[node.group] : undefined;

    // グループに属さない、またはグループが見つからない場合は位置のみ更新
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

  // グループ移動: グループとその内包ノードを一括移動（子孫グループも再帰的に移動）
  const setGroupLayout = useCallback((groupId: string, dx: number, dy: number) => {
    const groupsToMove = new Set(collectDescendantGroups(groupId, groupStatesRef.current));

    setGroupStates((prev) => {
      const updates: Record<string, DiagramGroup> = {};
      for (const gid of groupsToMove) {
        const g = prev[gid];
        if (g) updates[gid] = { ...g, x: g.x + dx, y: g.y + dy };
      }
      return { ...prev, ...updates };
    });
    setNodeStates((prev) => {
      const updates: Record<string, DiagramNode> = {};
      for (const [id, node] of Object.entries(prev)) {
        if (groupsToMove.has(node.group)) {
          updates[id] = { ...node, x: node.x + dx, y: node.y + dy };
        }
      }
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
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

  // ノードサイズ更新
  const setNodeSize = useCallback((nodeId: string, w: number, h: number) => {
    setNodeStates((prev) => {
      const n = prev[nodeId];
      if (!n) return prev;
      return { ...prev, [nodeId]: { ...n, w: Math.max(60, w), h: Math.max(30, h) } };
    });
  }, []);

  // ノートの位置更新
  const setNoteLayout = useCallback((noteId: string, x: number, y: number) => {
    setNoteStates((prev) => {
      const n = prev[noteId];
      if (!n) return prev;
      return { ...prev, [noteId]: { ...n, x, y } };
    });
  }, []);

  // 複数要素の一括移動
  const multiMoveLayout = useCallback((selectedIds: Set<string>, dx: number, dy: number) => {
    // トップレベルの選択グループのみ展開（親グループが選択済みの場合はスキップ）
    const groupsToMove = new Set<string>();
    for (const id of selectedIds) {
      const group = groupStatesRef.current[id];
      if (group) {
        const parentSelected = group.parentGroup && selectedIds.has(group.parentGroup);
        if (!parentSelected) {
          for (const gid of collectDescendantGroups(id, groupStatesRef.current)) {
            groupsToMove.add(gid);
          }
        }
      }
    }

    // グループ移動
    if (groupsToMove.size > 0) {
      setGroupStates((prev) => {
        const updates: Record<string, DiagramGroup> = {};
        for (const gid of groupsToMove) {
          const g = prev[gid];
          if (g) updates[gid] = { ...g, x: g.x + dx, y: g.y + dy };
        }
        return { ...prev, ...updates };
      });
    }

    // ノード移動: 選択済み（移動グループ外）または移動グループ内のノード
    setNodeStates((prev) => {
      const updates: Record<string, DiagramNode> = {};
      for (const [id, node] of Object.entries(prev)) {
        const inMovedGroup = groupsToMove.has(node.group);
        const isSelected = selectedIds.has(id);
        if (isSelected || inMovedGroup) {
          updates[id] = { ...node, x: node.x + dx, y: node.y + dy };
        }
      }
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });

    // ノート移動
    setNoteStates((prev) => {
      const updates: Record<string, DiagramNote> = {};
      for (const id of selectedIds) {
        const note = prev[id];
        if (note) updates[id] = { ...note, x: note.x + dx, y: note.y + dy };
      }
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, []);

  // ノード追加
  const addNode = (shape: string) => {
    const id = `n${Date.now().toString(36)}`;
    const col = randomColor();
    const newLine = `\nnode ${id} "新規ノード" { shape=${shape} color=${col} }`;
    setCode((c) => c + newLine);
  };

  // ノート追加（ノード追加と同様にコードに追記するだけ、位置は自動レイアウトで決定）
  const addNote = () => {
    const id = `note${Date.now().toString(36)}`;
    setCode((c) => `${c  }\nnote ${id} "メモ" { color=#fbbf24 }`);
  };

  // グループ追加（parentGroupId があれば親グループ内にネスト）
  const addGroup = (parentGroupId?: string) => {
    const id = `g${Date.now().toString(36)}`;
    const col = randomColor();

    if (!parentGroupId) {
      setCode((c) => `${c}\ngroup ${id} "新規グループ" { color=${col} x=0 y=0 w=300 h=200 }`);
      return;
    }

    setCode((c) => {
      const lines = c.split("\n");
      const groupPattern = new RegExp(`^(\\s*)group\\s+${parentGroupId}\\s+`);

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i]!.match(groupPattern);
        if (!match) continue;

        const indent = match[1] ?? "";
        const childIndent = `${indent}  `;
        const childLine = `${childIndent}group ${id} "新規グループ" { color=${col} w=200 h=150 }`;
        const line = lines[i]!;

        // 単一行グループ: { ... } を複数行に展開
        if (line.includes("{") && line.includes("}")) {
          const closeBrace = line.lastIndexOf("}");
          lines[i] = line.slice(0, closeBrace).trimEnd();
          lines.splice(i + 1, 0, childLine, `${indent}}`);
          break;
        }

        // 複数行ブロック: 閉じ } の直前に挿入
        if (line.includes("{")) {
          let depth = 1;
          let j = i + 1;
          while (j < lines.length && depth > 0) {
            const opens = (lines[j]!.match(/\{/g) ?? []).length;
            const closes = (lines[j]!.match(/\}/g) ?? []).length;
            depth += opens - closes;
            if (depth === 0) {
              lines.splice(j, 0, childLine);
              break;
            }
            j++;
          }
          break;
        }

        // ブロックなし: { } で囲んで子を追加
        lines[i] = `${line} {`;
        lines.splice(i + 1, 0, childLine, `${indent}}`);
        break;
      }
      return lines.join("\n");
    });
  };

  // エッジ追加
  const addEdge = useCallback((fromId: string, toId: string) => {
    setCode((c) => `${c  }\nedge ${fromId} -> ${toId}`);
  }, []);

  // ノードのプロパティをDSLコード内で更新
  const updateNodeProp = useCallback((nodeId: string, key: string, value: string) => {
    setCode((c) => {
      const lines = c.split("\n");
      const updated = lines.map((line) => {
        const trimmed = line.trimStart();
        // node <id> にマッチ
        if (!trimmed.startsWith(`node ${nodeId} `) && !trimmed.startsWith(`node ${nodeId}"`)) return line;
        const indent = line.slice(0, line.length - trimmed.length);

        if (key === "label") {
          // ラベル更新: node id "old" → node id "new"
          return indent + trimmed.replace(/^(node\s+\S+\s+)"[^"]*"/, `$1"${value}"`);
        }

        // プロパティ更新 (color, shape, etc.)
        const braceIdx = trimmed.indexOf("{");
        if (braceIdx === -1) {
          // プロパティブロックがないので追加
          return `${indent}${trimmed} { ${key}=${value} }`;
        }

        const header = trimmed.slice(0, braceIdx);
        const propsBlock = trimmed.slice(braceIdx);
        const propRegex = new RegExp(`(${key})\\s*=\\s*(?:"[^"]*"|\\S+)`);

        if (propRegex.test(propsBlock)) {
          // 既存プロパティを置換
          const newBlock = propsBlock.replace(propRegex, `${key}=${value}`);
          return indent + header + newBlock;
        } else {
          // プロパティを追加（{ の直後に挿入）
          const newBlock = propsBlock.replace("{", `{ ${key}=${value}`);
          return indent + header + newBlock;
        }
      });
      return updated.join("\n");
    });
  }, []);

  // エッジのプロパティをDSLコード内で更新
  const updateEdgeProp = useCallback((fromId: string, toId: string, key: string, value: string) => {
    setCode((c) => {
      const lines = c.split("\n");
      const edgePattern = new RegExp(`^edge\\s+${fromId}\\s*->\\s*${toId}(\\s|$)`);
      const updated = lines.map((line) => {
        const trimmed = line.trimStart();
        if (!edgePattern.test(trimmed)) return line;
        const indent = line.slice(0, line.length - trimmed.length);

        if (key === "label") {
          // ラベル付きの {} ブロックがあるか確認
          const braceIdx = trimmed.indexOf("{");
          if (braceIdx === -1) {
            // {} なし → 追加
            return `${indent}${trimmed} { label="${value}" }`;
          }
          const header = trimmed.slice(0, braceIdx);
          const propsBlock = trimmed.slice(braceIdx);
          const labelRegex = /label\s*=\s*("[^"]*"|\S+)/;
          if (labelRegex.test(propsBlock)) {
            return indent + header + propsBlock.replace(labelRegex, `label="${value}"`);
          } else {
            return indent + header + propsBlock.replace("{", `{ label="${value}"`);
          }
        }

        // その他のプロパティ
        const braceIdx = trimmed.indexOf("{");
        if (braceIdx === -1) {
          return `${indent}${trimmed} { ${key}=${value} }`;
        }
        const header = trimmed.slice(0, braceIdx);
        const propsBlock = trimmed.slice(braceIdx);
        const propRegex = new RegExp(`(${key})\\s*=\\s*(?:"[^"]*"|\\S+)`);
        if (propRegex.test(propsBlock)) {
          return indent + header + propsBlock.replace(propRegex, `${key}=${value}`);
        } else {
          return indent + header + propsBlock.replace("{", `{ ${key}=${value}`);
        }
      });
      return updated.join("\n");
    });
  }, []);

  // エッジをDSLコードから削除
  const deleteEdge = useCallback((fromId: string, toId: string) => {
    setCode((c) => {
      const lines = c.split("\n");
      const edgePattern = new RegExp(`^edge\\s+${fromId}\\s*->\\s*${toId}(\\s|$)`);
      return lines.filter((line) => !edgePattern.test(line.trim())).join("\n");
    });
  }, []);

  // ノードをDSLコードから削除（関連エッジとスタイルも削除）
  const deleteNode = useCallback((nodeId: string) => {
    setCode((c) => {
      const lines = c.split("\n");
      const filtered = lines.filter((line) => {
        const trimmed = line.trim();
        // ノード行を除外
        if (trimmed.startsWith(`node ${nodeId} `) || trimmed.startsWith(`node ${nodeId}"`)) return false;
        // 関連エッジを除外
        if (trimmed.match(new RegExp(`^edge\\s+${nodeId}\\s*->`))) return false;
        if (trimmed.match(new RegExp(`^edge\\s+\\S+\\s*->\\s*${nodeId}(\\s|$)`))) return false;
        // 関連スタイルを除外
        if (trimmed.startsWith(`style ${nodeId} `) || trimmed.startsWith(`style ${nodeId}{`)) return false;
        return true;
      });
      return filtered.join("\n");
    });
    // ノードステートからも削除
    setNodeStates((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
  }, []);

  // エッジの接続先を付け替え（DSLコード内の edge 行を書き換え）
  const reconnectEdge = useCallback((originalFrom: string, originalTo: string, newFrom: string, newTo: string) => {
    setCode((c) => {
      const lines = c.split("\n");
      const edgePattern = new RegExp(
        `^(\\s*edge\\s+)${originalFrom}(\\s*(?:<-->|<->|<--|-->|<-|->|--)\\s*)${originalTo}(\\s|$)(.*)`
      );
      const updated = lines.map((line) => {
        const match = line.match(edgePattern);
        if (!match) return line;
        return `${match[1]}${newFrom}${match[2]}${newTo}${match[3]}${match[4] ?? ""}`;
      });
      return updated.join("\n");
    });
  }, []);

  // エッジのベンド値を更新（コードには書き戻さず bendStates で管理）
  const updateEdgeBend = useCallback((fromId: string, toId: string, bendX: number, bendY: number) => {
    setBendStates((prev) => ({
      ...prev,
      [`${fromId}->${toId}`]: { bendX: Math.round(bendX), bendY: Math.round(bendY) },
    }));
  }, []);

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
    setBendStates({});
    setCode(formatDSLCode(templateCode));
  };

  // 保存済みダイアグラムを読み込む
  const loadSaved = (
    savedCode: string,
    savedNodeStates: Record<string, DiagramNode>,
    savedGroupStates: Record<string, DiagramGroup>,
    savedNoteStates?: Record<string, DiagramNote>,
    savedBendStates?: Record<string, { bendX: number; bendY: number }>
  ) => {
    setNodeStates(savedNodeStates);
    setGroupStates(savedGroupStates);
    setNoteStates(savedNoteStates ?? {});
    setBendStates(savedBendStates ?? {});
    setCode(savedCode);
  };

  return {
    code,
    setCode,
    parsed,
    nodeById,
    groupById,
    nodeStates,
    groupStates,
    noteStates,
    bendStates,
    setNodeLayout,
    setNodeSize,
    setGroupLayout,
    setGroupSize,
    setNoteLayout,
    multiMoveLayout,
    addNode,
    addNote,
    addGroup,
    addEdge,
    updateNodeProp,
    updateEdgeProp,
    deleteEdge,
    deleteNode,
    reconnectEdge,
    updateEdgeBend,
    exportSVG,
    formatCode,
    resetLayout,
    loadTemplate,
    loadSaved,
  };
}
