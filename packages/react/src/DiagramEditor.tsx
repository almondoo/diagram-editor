import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { ShapeNode } from "./components/ShapeNode.js";
import { EdgeLine } from "./components/EdgeLine.js";
import { GroupBox } from "./components/GroupBox.js";
import { NoteBox } from "./components/NoteBox.js";
import { CodeEditor } from "./components/CodeEditor.js";
import { Toolbar } from "./components/Toolbar.js";
import { Minimap } from "./components/Minimap.js";
import { SyntaxPanel } from "./components/SyntaxPanel.js";
import { NodeBottomSheet } from "./components/NodeBottomSheet.js";
import { useNodeDrag } from "./hooks/useNodeDrag.js";
import { useGroupDrag } from "./hooks/useGroupDrag.js";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction.js";
import { useMultiSelect } from "./hooks/useMultiSelect.js";
import { useEdgeDrag } from "./hooks/useEdgeDrag.js";
import { useEdgeCreation } from "./hooks/useEdgeCreation.js";
import { useSplitPane } from "./hooks/useSplitPane.js";
import { useViewport } from "./hooks/useViewport.js";
import type { DiagramState } from "./hooks/useDiagramState.js";
import { getGroupDepth } from "diagram-dsl-core";

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
    startX: number;
    startY: number;
    isMulti: boolean;
  } | null>(null);

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
  } = state;

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

  // ノートドラッグ（マウス）
  const handleNoteMouseDown = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const isMulti = selectedIds.size > 1 && selectedIds.has(noteId);
    setNoteDragInfo({ noteId, startX: e.clientX, startY: e.clientY, isMulti });
  }, [selectedIds]);

  // ノートドラッグ（タッチ）
  const handleNoteTouchStart = useCallback((e: React.TouchEvent, noteId: string) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0]!;
    const isMulti = selectedIds.size > 1 && selectedIds.has(noteId);
    setNoteDragInfo({ noteId, startX: touch.clientX, startY: touch.clientY, isMulti });
  }, [selectedIds]);

  useEffect(() => {
    if (!noteDragInfo) return;
    let rafId = 0;
    let noteDragged = false;

    const applyMove = (clientX: number, clientY: number) => {
      const dx = (clientX - noteDragInfo.startX) / zoom;
      const dy = (clientY - noteDragInfo.startY) / zoom;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      if (!noteDragged) { pushSnapshot(); noteDragged = true; }
      if (noteDragInfo.isMulti) {
        onMultiMove(dx, dy);
      } else {
        const note = noteStates[noteDragInfo.noteId] ?? parsed.notes.find((n) => n.id === noteDragInfo.noteId);
        if (!note) return;
        setNoteLayout(noteDragInfo.noteId, Math.round(note.x + dx), Math.round(note.y + dy));
      }
      setNoteDragInfo((d) => d ? { ...d, startX: clientX, startY: clientY } : null);
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
  }, [noteDragInfo, zoom, noteStates, parsed.notes, setNoteLayout, onMultiMove, pushSnapshot]);

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
          {[...parsed.groups]
            .sort((a, b) => getGroupDepth(a.id, groupById) - getGroupDepth(b.id, groupById))
            .map((g) => (
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
            ))}
          {parsed.notes.map((n) => (
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
          ))}
          {parsed.edges.map((edge, i) => (
            <EdgeLine
              key={`${edge.from}-${edge.to}-${i}`}
              edge={edge}
              fromNode={nodeById[edge.from]}
              toNode={nodeById[edge.to]}
              onMoveMouseDown={handleEdgeMoveMouseDown}
              onEndpointMouseDown={handleEdgeEndpointMouseDown}
              onDoubleClick={() => {
                const line = findCodeLine("edge", edge.to, edge.from);
                if (line) setFocusLine(line);
              }}
            />
          ))}
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
          {parsed.nodes.map((node) => (
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
          ))}
          {/* グループラベルをノードの上に再描画（ノードに隠れないようにする） */}
          {parsed.groups.map((g) => (
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
          ))}
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

  const existingIds = useMemo(() => [
    ...parsed.nodes.map((n) => n.id),
    ...parsed.groups.map((g) => g.id),
    ...parsed.notes.map((n) => n.id),
  ], [parsed.nodes, parsed.groups, parsed.notes]);

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
              onAddNode={addNode}
              onAddNote={addNote}
              onAddGroup={handleAddGroup}
              onExportSVG={exportSVG}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onFitView={() => fitView(parsed.nodes, parsed.groups)}
              onResetLayout={resetLayout}
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
              onAddNode={addNode}
              onAddNote={addNote}
              onAddGroup={handleAddGroup}
              onExportSVG={exportSVG}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onFitView={() => fitView(parsed.nodes, parsed.groups)}
              onResetLayout={resetLayout}
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
