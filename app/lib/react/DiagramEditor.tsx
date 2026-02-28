import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { ShapeNode } from "./components/ShapeNode";
import { EdgeLine } from "./components/EdgeLine";
import { GroupBox } from "./components/GroupBox";
import { NoteBox } from "./components/NoteBox";
import { CodeEditor } from "./components/CodeEditor";
import { Toolbar } from "./components/Toolbar";
import { Minimap } from "./components/Minimap";
import { SyntaxPanel } from "./components/SyntaxPanel";
import { NodeBottomSheet } from "./components/NodeBottomSheet";
import { useNodeDrag } from "./hooks/useNodeDrag";
import { useGroupDrag } from "./hooks/useGroupDrag";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction";
import { useMultiSelect } from "./hooks/useMultiSelect";
import { useEdgeDrag } from "./hooks/useEdgeDrag";
import { useEdgeCreation } from "./hooks/useEdgeCreation";
import { useSplitPane } from "./hooks/useSplitPane";
import { useViewport } from "./hooks/useViewport";
import type { DiagramState } from "./hooks/useDiagramState";
import type { LayoutDirection } from "~/lib/core";
import { getGroupDepth } from "~/lib/core";

interface DiagramEditorProps {
  state: DiagramState;
  className?: string;
  style?: React.CSSProperties;
}

export function DiagramEditor({ state, className, style }: DiagramEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const svgGroupRef = useRef<SVGGElement>(null);
  const gridRef = useRef<SVGPatternElement>(null);
  const gridLargeRef = useRef<SVGPatternElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSyntax, setShowSyntax] = useState(false);
  const [noteDragInfo, setNoteDragInfo] = useState<{
    noteId: string;
    isMulti: boolean;
  } | null>(null);
  // ノートドラッグ用ref（同期更新で位置ずれ防止）
  const noteStartRef = useRef<{ cursorX: number; cursorY: number; noteX: number; noteY: number } | null>(null);
  const noteLastCursorRef = useRef({ x: 0, y: 0 });

  // ダブルクリック → コードエディタフォーカス
  const [focusLine, setFocusLine] = useState<number | null>(null);
  // focusLine を消費後にクリアして、同じ行への再フォーカスを可能にする
  useEffect(() => {
    if (focusLine !== null) {
      requestAnimationFrame(() => setFocusLine(null));
    }
  }, [focusLine]);

  // レスポンシブ
  const { isMobile } = useViewport();
  // ボトムシート
  const [bottomSheetNodeId, setBottomSheetNodeId] = useState<string | null>(null);

  // エッジ追加モード
  const [edgeFromId, setEdgeFromId] = useState<string | null>(null);

  const {
    code, setCode, parsed, nodeById, groupById, noteStates,
    setNodeLayout, setNodeSize, setGroupLayout, setGroupSize, setNoteLayout, multiMoveLayout,
    addNode, addNote, addGroup, addEdge, updateNodeProp, updateEdgeProp, deleteEdge, deleteNode, deleteGroup, deleteNote, reconnectEdge, updateEdgeBend, exportSVG, formatCode, resetLayout,
    colorPreset, setColorPreset,
    undo, redo, canUndo, canRedo, pushSnapshot,
    isAnimating, layoutDirection,
    fitViewRequested, clearFitViewRequest,
  } = state;

  // FLIP アニメーション用の状態管理
  const [animOffsets, setAnimOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const prevPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // 自動配置後の fitView 予約フラグ
  const pendingFitViewRef = useRef(false);

  // resetLayout をラップして位置スナップショットを取る
  const handleResetLayout = useCallback((dir?: LayoutDirection) => {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of parsed.nodes) positions[n.id] = { x: n.x, y: n.y };
    for (const g of parsed.groups) positions[g.id] = { x: g.x, y: g.y };
    for (const n of parsed.notes) positions[n.id] = { x: n.x, y: n.y };
    prevPositionsRef.current = positions;
    pendingFitViewRef.current = true;
    resetLayout(dir);
  }, [parsed, resetLayout]);

  // レイアウト完了後のオフセット計算
  useEffect(() => {
    if (!isAnimating) return;
    const prev = prevPositionsRef.current;
    if (Object.keys(prev).length === 0) return;

    const offsets: Record<string, { dx: number; dy: number }> = {};
    for (const n of parsed.nodes) {
      const p = prev[n.id];
      if (p && (p.x !== n.x || p.y !== n.y)) {
        offsets[n.id] = { dx: p.x - n.x, dy: p.y - n.y };
      }
    }
    for (const g of parsed.groups) {
      const p = prev[g.id];
      if (p && (p.x !== g.x || p.y !== g.y)) {
        offsets[g.id] = { dx: p.x - g.x, dy: p.y - g.y };
      }
    }
    for (const n of parsed.notes) {
      const p = prev[n.id];
      if (p && (p.x !== n.x || p.y !== n.y)) {
        offsets[n.id] = { dx: p.x - n.x, dy: p.y - n.y };
      }
    }

    if (Object.keys(offsets).length === 0) return;

    setAnimOffsets(offsets);

    // 次フレームでオフセットクリア → CSS transition が発火
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimOffsets({});
      });
    });
  }, [isAnimating, parsed]);

  // animating かつ offsets が空 = Play フェーズ（アニメーション中）
  const isPlaying = isAnimating && Object.keys(animOffsets).length === 0;

  const findCodeLine = useCallback((type: "node" | "edge" | "note", id: string, fromId?: string) => {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const codeLines = code.split("\n");
    for (let i = 0; i < codeLines.length; i++) {
      const trimmed = codeLines[i]!.trim();
      if (type === "edge" && fromId) {
        if (trimmed.match(new RegExp(`^edge\\s+${esc(fromId)}\\s+\\S+\\s+${esc(id)}`))) {
          return i + 1;
        }
      } else if (trimmed.match(new RegExp(`^${type}\\s+${esc(id)}\\s`))) {
        return i + 1;
      }
    }
    return null;
  }, [code]);

  const { zoom, panRef, isPanning, isSpaceHeld, handleCanvasMouseDown, zoomIn, zoomOut, fitView } =
    useCanvasInteraction(svgRef, svgGroupRef, gridRef, gridLargeRef);

  // アニメーション完了後に fitView を実行
  const prevIsAnimatingRef = useRef(false);
  useEffect(() => {
    if (prevIsAnimatingRef.current && !isAnimating && pendingFitViewRef.current) {
      pendingFitViewRef.current = false;
      fitView(parsed.nodes, parsed.groups);
    }
    prevIsAnimatingRef.current = isAnimating;
  }, [isAnimating, parsed.nodes, parsed.groups, fitView]);

  // loadTemplate / loadSaved / 初回マウント時の自動 fitView
  useEffect(() => {
    if (!fitViewRequested) return;
    const id = requestAnimationFrame(() => {
      clearFitViewRequest();
      fitView(parsed.nodes, parsed.groups);
    });
    return () => cancelAnimationFrame(id);
  }, [fitViewRequested, clearFitViewRequest, fitView, parsed.nodes, parsed.groups]);

  const {
    selectedIds,
    setSelectedIds,
    selectionRect,
    startSelectionRect,
    updateSelectionRect,
    endSelectionRect,
    clearSelection,
    selectSingle,
    isSelected,
  } = useMultiSelect();

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const onMultiMove = useCallback((dx: number, dy: number) => {
    multiMoveLayout(selectedIdsRef.current, dx, dy);
  }, [multiMoveLayout]);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // ノートドラッグ（マウス）
  const handleNoteMouseDown = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const note = noteStates[noteId] ?? parsed.notes.find((n) => n.id === noteId);
    if (!note) return;
    const isMulti = selectedIds.size > 1 && selectedIds.has(noteId);
    noteStartRef.current = { cursorX: e.clientX, cursorY: e.clientY, noteX: note.x, noteY: note.y };
    noteLastCursorRef.current = { x: e.clientX, y: e.clientY };
    setNoteDragInfo({ noteId, isMulti });
  }, [selectedIds, noteStates, parsed.notes]);

  // ノートドラッグ（タッチ）
  const handleNoteTouchStart = useCallback((e: React.TouchEvent, noteId: string) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0]!;
    const note = noteStates[noteId] ?? parsed.notes.find((n) => n.id === noteId);
    if (!note) return;
    const isMulti = selectedIds.size > 1 && selectedIds.has(noteId);
    noteStartRef.current = { cursorX: touch.clientX, cursorY: touch.clientY, noteX: note.x, noteY: note.y };
    noteLastCursorRef.current = { x: touch.clientX, y: touch.clientY };
    setNoteDragInfo({ noteId, isMulti });
  }, [selectedIds, noteStates, parsed.notes]);

  useEffect(() => {
    if (!noteDragInfo) return;
    let rafId = 0;
    let noteDragged = false;

    const applyMove = (clientX: number, clientY: number) => {
      const start = noteStartRef.current;
      if (!start) return;
      const z = zoomRef.current;

      if (noteDragInfo.isMulti) {
        // 複数選択: incremental delta（同期ref）
        const dx = (clientX - noteLastCursorRef.current.x) / z;
        const dy = (clientY - noteLastCursorRef.current.y) / z;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
        if (!noteDragged) { pushSnapshot(); noteDragged = true; }
        onMultiMove(dx, dy);
      } else {
        // 単体ノート: 初期位置 + 総デルタ（絶対値）
        const totalDx = (clientX - start.cursorX) / z;
        const totalDy = (clientY - start.cursorY) / z;
        if (Math.abs(totalDx) < 2 && Math.abs(totalDy) < 2) return;
        if (!noteDragged) { pushSnapshot(); noteDragged = true; }
        setNoteLayout(noteDragInfo.noteId, Math.round(start.noteX + totalDx), Math.round(start.noteY + totalDy));
      }
      noteLastCursorRef.current = { x: clientX, y: clientY };
    };

    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => applyMove(e.clientX, e.clientY));
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => applyMove(e.touches[0]!.clientX, e.touches[0]!.clientY));
    };
    const handleUp = () => setNoteDragInfo(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    window.addEventListener("touchcancel", handleUp);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [noteDragInfo, setNoteLayout, onMultiMove, pushSnapshot]);

  const parsedRef = useRef(parsed);
  parsedRef.current = parsed;

  useEffect(() => {
    if (!selectionRect) return;
    const handleMove = (e: MouseEvent) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - panRef.current.x) / zoom;
      const canvasY = (e.clientY - rect.top - panRef.current.y) / zoom;
      updateSelectionRect(canvasX, canvasY);
    };
    const handleUp = () => {
      const p = parsedRef.current;
      endSelectionRect(p.nodes, p.groups, p.notes);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [selectionRect, zoom, updateSelectionRect, endSelectionRect]); // eslint-disable-line react-hooks/exhaustive-deps

  const { handleNodeMouseDown, handleNodeResizeMouseDown, handleNodeTouchStart } =
    useNodeDrag(nodeById, zoom, selectedIds, setNodeLayout, setNodeSize, onMultiMove, pushSnapshot);

  const { handleGroupMoveMouseDown, handleGroupMoveTouchStart, handleGroupResizeMouseDown, handleGroupResizeTouchStart } =
    useGroupDrag(groupById, zoom, selectedIds, setGroupLayout, setGroupSize, onMultiMove, pushSnapshot);

  const { edgeDragInfo, handleEdgeMoveMouseDown, handleEdgeEndpointMouseDown } =
    useEdgeDrag(nodeById, parsed.edges, zoom, updateEdgeBend, reconnectEdge, svgRef, panRef, pushSnapshot);

  const { edgeCreationDragInfo, handleConnectionPointMouseDown } =
    useEdgeCreation(nodeById, zoom, addEdge, svgRef, panRef);

  const { splitPos, isResizing, setIsResizing } = useSplitPane(containerRef);

  // ボトムシート用: 選択ノードに接続されたエッジ一覧
  const connectedEdges = useMemo(() => {
    if (!bottomSheetNodeId) return [];
    return parsed.edges
      .filter((e) => e.from === bottomSheetNodeId || e.to === bottomSheetNodeId)
      .map((e) => {
        const isOutgoing = e.from === bottomSheetNodeId;
        const targetId = isOutgoing ? e.to : e.from;
        const targetNode = nodeById[targetId];
        return {
          edge: e,
          direction: isOutgoing ? "outgoing" as const : "incoming" as const,
          targetId,
          targetLabel: targetNode?.label ?? targetId,
        };
      });
  }, [bottomSheetNodeId, parsed.edges, nodeById]);

  // ノードタップ処理: エッジモードならエッジ追加、通常ならボトムシート表示
  const handleNodeTap = useCallback((nodeId: string) => {
    if (edgeFromId) {
      if (edgeFromId !== nodeId) {
        addEdge(edgeFromId, nodeId);
      }
      setEdgeFromId(null);
    } else if (isMobile) {
      setBottomSheetNodeId(nodeId);
    }
  }, [edgeFromId, isMobile, addEdge]);

  // ノード追加: 選択中のグループがあればその中にネスト作成
  const handleAddNode = useCallback((shape: string) => {
    const selectedGroup = [...selectedIds].find((id) => groupById[id]);
    addNode(shape, selectedGroup);
  }, [selectedIds, groupById, addNode]);

  // グループ追加: 選択中のグループがあればその中にネスト作成
  const handleAddGroup = useCallback(() => {
    const selectedGroup = [...selectedIds].find((id) => groupById[id]);
    addGroup(selectedGroup);
  }, [selectedIds, groupById, addGroup]);

  const nestedGroupIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of parsed.groups) {
      if (g.parentGroup) {
        ids.add(g.id);
        ids.add(g.parentGroup);
      }
    }
    return ids;
  }, [parsed.groups]);

  // エッジカラー別マーカーを一括定義するためのユニーク色リスト
  const edgeMarkerColors = useMemo(() => {
    const colors = new Set<string>();
    for (const e of parsed.edges) colors.add(e.color);
    return [...colors];
  }, [parsed.edges]);

  const canvasW = 1200;
  const canvasH = 800;

  const sortedGroups = useMemo(
    () => [...parsed.groups].sort((a, b) => getGroupDepth(a.id, groupById) - getGroupDepth(b.id, groupById)),
    [parsed.groups, groupById],
  );

  // SVGキャンバス描画（モバイル・デスクトップ共通）
  const renderCanvas = () => (
    <div
      className="flex-1 relative overflow-hidden bg-bg-base touch-none"
      onMouseDown={(e) => {
        const target = e.target as SVGElement;
        if (target === svgRef.current || target.getAttribute("data-bg")) {
          clearSelection();
          handleCanvasMouseDown(e, () => {});
          if (!isSpaceHeld) {
            const svgEl = svgRef.current;
            if (!svgEl) return;
            const rect = svgEl.getBoundingClientRect();
            const canvasX = (e.clientX - rect.left - panRef.current.x) / zoom;
            const canvasY = (e.clientY - rect.top - panRef.current.y) / zoom;
            startSelectionRect(canvasX, canvasY);
          }
        }
      }}
    >
      {/* エッジ追加モードのバナー */}
      {edgeFromId && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-primary/90 text-white text-center px-3 py-2 text-[13px] font-semibold flex items-center justify-center gap-3">
          <span>接続先のノードをタップ</span>
          <button
            onClick={() => setEdgeFromId(null)}
            className="bg-white/20 border-none text-white px-3 py-1 rounded-[4px] cursor-pointer text-xs"
          >
            キャンセル
          </button>
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ cursor: selectionRect ? "crosshair" : isPanning ? "grabbing" : isSpaceHeld ? "grab" : "default" }}
      >
        <defs>
          <pattern
            id="grid"
            ref={gridRef}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}
          >
            <circle cx="12" cy="12" r="0.5" fill="#334155" />
          </pattern>
          <pattern
            id="gridLarge"
            ref={gridLargeRef}
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}
          >
            <rect width="120" height="120" fill="url(#grid)" />
            <line x1="0" y1="0" x2="120" y2="0" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="0" y2="120" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
          {/* エッジカラー別矢印マーカー */}
          {edgeMarkerColors.flatMap((color) => {
            const s = color.replace("#", "");
            return [
              <marker key={`end-${s}`} id={`ah-end-${s}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={color} />
              </marker>,
              <marker key={`start-${s}`} id={`ah-start-${s}`} markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto">
                <polygon points="10 0, 0 3.5, 10 7" fill={color} />
              </marker>,
            ];
          })}
        </defs>
        <rect width="100%" height="100%" fill="url(#gridLarge)" data-bg="true" />

        <g ref={svgGroupRef} transform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}>
          {sortedGroups.map((g) => {
              const offset = animOffsets[g.id];
              return (
                <g
                  key={`anim-${g.id}`}
                  transform={offset ? `translate(${offset.dx}, ${offset.dy})` : undefined}
                  style={isPlaying ? { transition: "transform 300ms ease-out" } : undefined}
                >
                  <GroupBox
                    key={g.id}
                    group={g}
                    isSelected={isSelected(g.id)}
                    isNested={nestedGroupIds.has(g.id)}
                    onMoveMouseDown={(e) => {
                      if (!isSelected(g.id)) selectSingle(g.id);
                      handleGroupMoveMouseDown(e, g.id);
                    }}
                    onMoveTouchStart={(e) => {
                      if (!isSelected(g.id)) selectSingle(g.id);
                      handleGroupMoveTouchStart(e, g.id);
                    }}
                    onResizeMouseDown={(e, handle) => handleGroupResizeMouseDown(e, g.id, handle)}
                    onResizeTouchStart={(e, handle) => handleGroupResizeTouchStart(e, g.id, handle)}
                  />
                </g>
              );
            })}
          {parsed.notes.map((n) => {
            const offset = animOffsets[n.id];
            return (
              <g
                key={`anim-${n.id}`}
                transform={offset ? `translate(${offset.dx}, ${offset.dy})` : undefined}
                style={isPlaying ? { transition: "transform 300ms ease-out" } : undefined}
              >
                <NoteBox
                  key={n.id}
                  note={n}
                  isSelected={isSelected(n.id)}
                  onMouseDown={(e) => {
                    if (!isSelected(n.id)) selectSingle(n.id);
                    handleNoteMouseDown(e, n.id);
                  }}
                  onTouchStart={(e) => {
                    if (!isSelected(n.id)) selectSingle(n.id);
                    handleNoteTouchStart(e, n.id);
                  }}
                  onDoubleClick={() => {
                    const line = findCodeLine("note", n.id);
                    if (line) setFocusLine(line);
                  }}
                />
              </g>
            );
          })}
          {parsed.edges.map((edge, i) => {
            // FLIP Phase 1: offset-adjusted positions for smooth edge animation
            let fromNode = nodeById[edge.from];
            let toNode = nodeById[edge.to];
            const hasOffsets = Object.keys(animOffsets).length > 0;
            if (hasOffsets) {
              const fromOff = animOffsets[edge.from];
              const toOff = animOffsets[edge.to];
              if (fromNode && fromOff) fromNode = { ...fromNode, x: fromNode.x + fromOff.dx, y: fromNode.y + fromOff.dy };
              if (toNode && toOff) toNode = { ...toNode, x: toNode.x + toOff.dx, y: toNode.y + toOff.dy };
            }
            return (
              <EdgeLine
                key={`${edge.from}-${edge.to}-${i}`}
                edge={edge}
                fromNode={fromNode}
                toNode={toNode}
                isPlaying={isPlaying}
                onMoveMouseDown={handleEdgeMoveMouseDown}
                onEndpointMouseDown={handleEdgeEndpointMouseDown}
                onDoubleClick={() => {
                  const line = findCodeLine("edge", edge.to, edge.from);
                  if (line) setFocusLine(line);
                }}
              />
            );
          })}
          {/* 接続付け替え中の仮エッジ線 */}
          {edgeDragInfo?.type === "reconnect" && (() => {
            const anchorNode = nodeById[edgeDragInfo.anchorId];
            if (!anchorNode) return null;
            const ac = { x: anchorNode.x + anchorNode.w / 2, y: anchorNode.y + anchorNode.h / 2 };
            const cursor = { x: edgeDragInfo.cursorX, y: edgeDragInfo.cursorY };
            const from = edgeDragInfo.end === "from" ? cursor : ac;
            const to = edgeDragInfo.end === "from" ? ac : cursor;
            return (
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="6,3"
                className="pointer-events-none"
              />
            );
          })()}
          {edgeCreationDragInfo && (() => {
            const fromNode = nodeById[edgeCreationDragInfo.fromNodeId];
            if (!fromNode) return null;
            const fromCenter = { x: fromNode.x + fromNode.w / 2, y: fromNode.y + fromNode.h / 2 };
            return (
              <line
                x1={fromCenter.x} y1={fromCenter.y}
                x2={edgeCreationDragInfo.cursorX} y2={edgeCreationDragInfo.cursorY}
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="6,3"
                className="pointer-events-none"
              />
            );
          })()}
          {parsed.nodes.map((node) => {
            const offset = animOffsets[node.id];
            return (
              <g
                key={`anim-${node.id}`}
                transform={offset ? `translate(${offset.dx}, ${offset.dy})` : undefined}
                style={isPlaying ? { transition: "transform 300ms ease-out" } : undefined}
              >
                <ShapeNode
                  key={node.id}
                  node={node}
                  isSelected={isSelected(node.id)}
                  isEdgeSource={edgeFromId === node.id}
                  onMouseDown={(e) => {
                    if (!isSelected(node.id)) selectSingle(node.id);
                    handleNodeMouseDown(e, node.id);
                  }}
                  onTouchStart={(e) => {
                    if (!isSelected(node.id)) selectSingle(node.id);
                    handleNodeTouchStart(e, node.id);
                  }}
                  onTap={() => handleNodeTap(node.id)}
                  onResizeMouseDown={(e, handle) => handleNodeResizeMouseDown(e, node.id, handle)}
                  onDoubleClick={() => {
                    const line = findCodeLine("node", node.id);
                    if (line) setFocusLine(line);
                  }}
                  onConnectionPointMouseDown={handleConnectionPointMouseDown}
                  edgeCreationActive={edgeCreationDragInfo !== null && edgeCreationDragInfo.fromNodeId !== node.id}
                />
              </g>
            );
          })}
          {/* グループラベルをノードの上に再描画（ノードに隠れないようにする） */}
          {parsed.groups.map((g) => {
            const offset = animOffsets[g.id];
            return (
              <g
                key={`anim-label-${g.id}`}
                transform={offset ? `translate(${offset.dx}, ${offset.dy})` : undefined}
                style={isPlaying ? { transition: "transform 300ms ease-out" } : undefined}
              >
                <text
                  key={`label-${g.id}`}
                  x={g.x + 14}
                  y={g.y + 20}
                  fill={g.color}
                  fontSize={12}
                  fontFamily="'IBM Plex Mono', monospace"
                  fontWeight="600"
                  opacity={0.8}
                  stroke="#0a0c12"
                  strokeWidth={4}
                  paintOrder="stroke"
                  className="pointer-events-none select-none"
                >
                  {g.label}
                </text>
              </g>
            );
          })}
        </g>
        {selectionRect && (
          <g transform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}>
            <rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.w}
              height={selectionRect.h}
              fill="#6366f1"
              fillOpacity={0.08}
              stroke="#6366f1"
              strokeWidth={1 / zoom}
              strokeDasharray={`${4 / zoom},${2 / zoom}`}
              className="pointer-events-none"
            />
          </g>
        )}
      </svg>

      {!isMobile && (
        <Minimap
          nodes={parsed.nodes}
          viewBox={{ x: -panRef.current.x / zoom, y: -panRef.current.y / zoom, w: canvasW / zoom, h: canvasH / zoom }}
          canvasW={canvasW}
          canvasH={canvasH}
        />
      )}

      <div className="absolute bottom-2.5 left-2.5 bg-[rgba(15,18,25,0.85)] border border-border rounded-[5px] px-2.5 py-[3px] text-[10px] text-text-faint font-mono">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );

  // キーボードショートカット
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const isInput = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement || (el instanceof HTMLElement && el.isContentEditable);
      if (isInput) return;

      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd+Z / Ctrl+Z → Undo
      if (isMeta && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }

      // Cmd+Shift+Z / Ctrl+Shift+Z → Redo
      if (isMeta && e.shiftKey && e.key === "z") {
        e.preventDefault();
        redo();
        return;
      }

      // Cmd+A / Ctrl+A → 全選択
      if (isMeta && e.key === "a") {
        e.preventDefault();
        const allIds = new Set([
          ...parsed.nodes.map((n) => n.id),
          ...parsed.groups.map((g) => g.id),
          ...parsed.notes.map((n) => n.id),
        ]);
        setSelectedIds(allIds);
        return;
      }

      // Escape → 選択解除
      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      // Delete / Backspace → 選択要素を削除
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        e.preventDefault();
        for (const id of selectedIds) {
          if (nodeById[id]) {
            deleteNode(id);
          } else if (groupById[id]) {
            deleteGroup(id);
          } else if (noteStates[id]) {
            deleteNote(id);
          }
        }
        clearSelection();
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo, parsed, selectedIds, nodeById, groupById, noteStates, deleteNode, deleteGroup, deleteNote, clearSelection, setSelectedIds]);

  const existingIds = useMemo(
    () => [
      ...parsed.nodes.map((n) => n.id),
      ...parsed.groups.map((g) => g.id),
      ...parsed.notes.map((n) => n.id),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- IDはcodeのみから決定される
    [code],
  );

  // コードパネル描画
  const renderCodePanel = () => (
    <div className="flex-1 flex flex-col relative">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-bg-raised border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-primary font-mono font-semibold">
            {"</>"}
          </span>
          <span className="text-xs text-text-muted font-medium">コードエディタ</span>
        </div>
        <div className="flex items-center gap-2">
          {parsed.errors.length > 0 && (
            <span className="text-[11px] text-error font-mono">
              ⚠ {parsed.errors.length}エラー
            </span>
          )}
          <span className="text-[11px] text-text-dimmed font-mono">
            {parsed.nodes.length}ノード · {parsed.edges.length}エッジ
          </span>
          <button
            onClick={() => setShowSyntax(!showSyntax)}
            className="px-2.5 py-[3px] rounded-[5px] cursor-pointer text-[11px] font-medium"
            style={{
              background: showSyntax ? "#312e81" : "#131720",
              border: `1px solid ${showSyntax ? "#4338ca" : "#2d3548"}`,
              color: showSyntax ? "#c7d2fe" : "#94a3b8",
            }}
          >
            構文ヘルプ
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <CodeEditor code={code} onChange={setCode} errors={parsed.errors} onFormat={formatCode} existingIds={existingIds} focusLine={focusLine} />
      </div>

      {parsed.errors.length > 0 && (
        <div className="px-3.5 py-1.5 bg-error-surface border-t border-error-bg max-h-20 overflow-auto">
          {parsed.errors.map((err, i) => (
            <div
              key={i}
              className="text-[11px] text-error-light font-mono py-0.5"
            >
              行{err.line}: {err.message}
            </div>
          ))}
        </div>
      )}

      {showSyntax && <SyntaxPanel onClose={() => setShowSyntax(false)} />}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-bg-deepest font-sans overflow-hidden text-text-primary ${className ?? ""}`}
      style={style}
    >
      {isMobile ? (
        /* ─── モバイルレイアウト: キャンバスのみ（コードエディタ非表示） ─── */
        <>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Toolbar
              onAddNode={handleAddNode}
              onAddNote={addNote}
              onAddGroup={handleAddGroup}
              onExportSVG={exportSVG}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onFitView={() => fitView(parsed.nodes, parsed.groups)}
              onResetLayout={handleResetLayout}
              layoutDirection={layoutDirection}
              colorPreset={colorPreset}
              onSetColorPreset={setColorPreset}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              isMobile={isMobile}
            />
            {renderCanvas()}
          </div>

          {/* ノード編集ボトムシート */}
          <NodeBottomSheet
            node={bottomSheetNodeId ? nodeById[bottomSheetNodeId] ?? null : null}
            edges={connectedEdges}
            open={bottomSheetNodeId !== null}
            onClose={() => setBottomSheetNodeId(null)}
            onUpdateProp={updateNodeProp}
            onUpdateEdgeProp={updateEdgeProp}
            onDeleteEdge={deleteEdge}
            onDelete={deleteNode}
            onStartEdge={(fromId) => setEdgeFromId(fromId)}
          />
        </>
      ) : (
        /* ─── デスクトップレイアウト: 左右分割 ─── */
        <div className="flex flex-1 overflow-hidden relative">
          {/* Code Panel */}
          <div
            className="flex flex-col border-r border-border-subtle shrink-0 relative"
            style={{ width: `${splitPos}%` }}
          >
            {renderCodePanel()}
          </div>

          {/* Split handle */}
          <div
            onMouseDown={() => setIsResizing(true)}
            className="w-[5px] cursor-col-resize z-10 transition-[background] duration-200 relative -ml-[3px] -mr-[2px] hover:bg-border"
            style={{ background: isResizing ? "#4338ca" : undefined }}
          />

          {/* Canvas Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Toolbar
              onAddNode={handleAddNode}
              onAddNote={addNote}
              onAddGroup={handleAddGroup}
              onExportSVG={exportSVG}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onFitView={() => fitView(parsed.nodes, parsed.groups)}
              onResetLayout={handleResetLayout}
              layoutDirection={layoutDirection}
              colorPreset={colorPreset}
              onSetColorPreset={setColorPreset}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
            />
            {renderCanvas()}
          </div>
        </div>
      )}
    </div>
  );
}
