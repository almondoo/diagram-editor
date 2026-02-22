import { useRef, useState, useEffect, useCallback } from "react";
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
import { useSplitPane } from "./hooks/useSplitPane.js";
import { useViewport } from "./hooks/useViewport.js";
import { DIAGRAM_EDITOR_STYLES } from "./styles.js";
import type { DiagramState } from "./hooks/useDiagramState.js";

function getGroupDepth(groupId: string, groups: import("diagram-dsl-core").DiagramGroup[]): number {
  const group = groups.find((g) => g.id === groupId);
  if (!group?.parentGroup) return 0;
  return 1 + getGroupDepth(group.parentGroup, groups);
}

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

  // レスポンシブ
  const { isMobile } = useViewport();
  // ボトムシート
  const [bottomSheetNodeId, setBottomSheetNodeId] = useState<string | null>(null);

  // エッジ追加モード
  const [edgeFromId, setEdgeFromId] = useState<string | null>(null);

  const {
    code, setCode, parsed, nodeById, groupById, noteStates,
    setNodeLayout, setNodeSize, setGroupLayout, setGroupSize, setNoteLayout, multiMoveLayout,
    addNode, addNote, addEdge, updateNodeProp, deleteNode, exportSVG, formatCode, resetLayout,
  } = state;

  const { zoom, panRef, isPanning, isSpaceHeld, handleCanvasMouseDown, zoomIn, zoomOut, fitView } =
    useCanvasInteraction(svgRef, svgGroupRef, gridRef, gridLargeRef);

  const {
    selectedIds,
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
    const touch = e.touches[0];
    const isMulti = selectedIds.size > 1 && selectedIds.has(noteId);
    setNoteDragInfo({ noteId, startX: touch.clientX, startY: touch.clientY, isMulti });
  }, [selectedIds]);

  useEffect(() => {
    if (!noteDragInfo) return;
    const applyMove = (clientX: number, clientY: number) => {
      const dx = (clientX - noteDragInfo.startX) / zoom;
      const dy = (clientY - noteDragInfo.startY) / zoom;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      if (noteDragInfo.isMulti) {
        onMultiMove(dx, dy);
      } else {
        const note = noteStates[noteDragInfo.noteId] ?? parsed.notes.find((n) => n.id === noteDragInfo.noteId);
        if (!note) return;
        setNoteLayout(noteDragInfo.noteId, Math.round(note.x + dx), Math.round(note.y + dy));
      }
      setNoteDragInfo((d) => d ? { ...d, startX: clientX, startY: clientY } : null);
    };

    const handleMove = (e: MouseEvent) => applyMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      applyMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleUp = () => setNoteDragInfo(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    window.addEventListener("touchcancel", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [noteDragInfo, zoom, noteStates, parsed.notes, setNoteLayout, onMultiMove]);

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
    useNodeDrag(nodeById, zoom, selectedIds, setNodeLayout, setNodeSize, onMultiMove);

  const { handleGroupMoveMouseDown, handleGroupMoveTouchStart, handleGroupResizeMouseDown } =
    useGroupDrag(groupById, zoom, selectedIds, setGroupLayout, setGroupSize, onMultiMove);

  const { splitPos, isResizing, setIsResizing } = useSplitPane(containerRef);

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

  const canvasW = 1200;
  const canvasH = 800;

  // SVGキャンバス描画（モバイル・デスクトップ共通）
  const renderCanvas = () => (
    <div
      style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0a0c12", touchAction: "none" }}
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
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            background: "rgba(99,102,241,0.9)",
            color: "#fff",
            textAlign: "center",
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <span>接続先のノードをタップ</span>
          <button
            onClick={() => setEdgeFromId(null)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
            }}
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
        </defs>
        <rect width="100%" height="100%" fill="url(#gridLarge)" data-bg="true" />

        <g ref={svgGroupRef} transform={`translate(${panRef.current.x},${panRef.current.y}) scale(${zoom})`}>
          {[...parsed.groups]
            .sort((a, b) => getGroupDepth(a.id, parsed.groups) - getGroupDepth(b.id, parsed.groups))
            .map((g) => (
              <GroupBox
                key={g.id}
                group={g}
                isSelected={isSelected(g.id)}
                onMoveMouseDown={(e) => {
                  if (!isSelected(g.id)) selectSingle(g.id);
                  handleGroupMoveMouseDown(e, g.id);
                }}
                onMoveTouchStart={(e) => {
                  if (!isSelected(g.id)) selectSingle(g.id);
                  handleGroupMoveTouchStart(e, g.id);
                }}
                onResizeMouseDown={(e, handle) => handleGroupResizeMouseDown(e, g.id, handle)}
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
            />
          ))}
          {parsed.edges.map((edge, i) => (
            <EdgeLine
              key={`${edge.from}-${edge.to}-${i}`}
              edge={edge}
              fromNode={nodeById[edge.from]}
              toNode={nodeById[edge.to]}
            />
          ))}
          {parsed.nodes.map((node) => (
            <ShapeNode
              key={node.id}
              node={node}
              isSelected={isSelected(node.id) || edgeFromId === node.id}
              onMouseDown={(e) => {
                if (!isSelected(node.id)) selectSingle(node.id);
                handleNodeMouseDown(e, node.id);
              }}
              onTouchStart={(e) => {
                if (!isSelected(node.id)) selectSingle(node.id);
                handleNodeTouchStart(e, node.id);
              }}
              onTap={() => handleNodeTap(node.id)}
              onResizeMouseDown={(e) => handleNodeResizeMouseDown(e, node.id)}
            />
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
              style={{ pointerEvents: "none" }}
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

      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          background: "rgba(15,18,25,0.85)",
          border: "1px solid #2d3548",
          borderRadius: 5,
          padding: "3px 10px",
          fontSize: 10,
          color: "#64748b",
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );

  // コードパネル描画
  const renderCodePanel = () => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 14px",
          background: "#0c0e14",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#6366f1", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
            {"</>"}
          </span>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>コードエディタ</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {parsed.errors.length > 0 && (
            <span style={{ fontSize: 11, color: "#f87171", fontFamily: "'IBM Plex Mono', monospace" }}>
              ⚠ {parsed.errors.length}エラー
            </span>
          )}
          <span style={{ fontSize: 11, color: "#475569", fontFamily: "'IBM Plex Mono', monospace" }}>
            {parsed.nodes.length}ノード · {parsed.edges.length}エッジ
          </span>
          <button
            onClick={() => setShowSyntax(!showSyntax)}
            style={{
              background: showSyntax ? "#312e81" : "#131720",
              border: `1px solid ${showSyntax ? "#4338ca" : "#2d3548"}`,
              color: showSyntax ? "#c7d2fe" : "#94a3b8",
              padding: "3px 10px",
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            構文ヘルプ
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        <CodeEditor code={code} onChange={setCode} errors={parsed.errors} onFormat={formatCode} />
      </div>

      {parsed.errors.length > 0 && (
        <div
          style={{
            padding: "6px 14px",
            background: "#1a0a0a",
            borderTop: "1px solid #7f1d1d",
            maxHeight: 80,
            overflow: "auto",
          }}
        >
          {parsed.errors.map((err, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: "#fca5a5",
                fontFamily: "'IBM Plex Mono', monospace",
                padding: "2px 0",
              }}
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
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#080a10",
        fontFamily: "'IBM Plex Sans', 'Noto Sans JP', system-ui",
        overflow: "hidden",
        color: "#e2e8f0",
        ...style,
      }}
    >
      <style>{DIAGRAM_EDITOR_STYLES}</style>

      {isMobile ? (
        /* ─── モバイルレイアウト: キャンバスのみ（コードエディタ非表示） ─── */
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Toolbar
              onAddNode={addNode}
              onAddNote={addNote}
              onExportSVG={exportSVG}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onFitView={() => fitView(parsed.nodes, parsed.groups)}
              onResetLayout={resetLayout}
              isMobile={isMobile}
            />
            {renderCanvas()}
          </div>

          {/* ノード編集ボトムシート */}
          <NodeBottomSheet
            node={bottomSheetNodeId ? nodeById[bottomSheetNodeId] ?? null : null}
            open={bottomSheetNodeId !== null}
            onClose={() => setBottomSheetNodeId(null)}
            onUpdateProp={updateNodeProp}
            onDelete={deleteNode}
            onStartEdge={(fromId) => setEdgeFromId(fromId)}
          />
        </>
      ) : (
        /* ─── デスクトップレイアウト: 左右分割 ─── */
        <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
          {/* Code Panel */}
          <div
            style={{
              width: `${splitPos}%`,
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid #1e293b",
              flexShrink: 0,
              position: "relative",
            }}
          >
            {renderCodePanel()}
          </div>

          {/* Split handle */}
          <div
            onMouseDown={() => setIsResizing(true)}
            style={{
              width: 5,
              cursor: "col-resize",
              background: isResizing ? "#4338ca" : "transparent",
              zIndex: 10,
              transition: "background 0.2s",
              position: "relative",
              marginLeft: -3,
              marginRight: -2,
            }}
            onMouseEnter={(e) => { if (!isResizing) (e.currentTarget as HTMLDivElement).style.background = "#2d3548"; }}
            onMouseLeave={(e) => { if (!isResizing) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
          />

          {/* Canvas Panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Toolbar
              onAddNode={addNode}
              onAddNote={addNote}
              onExportSVG={exportSVG}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onFitView={() => fitView(parsed.nodes, parsed.groups)}
              onResetLayout={resetLayout}
            />
            {renderCanvas()}
          </div>
        </div>
      )}
    </div>
  );
}
