import { useRef, useState, useEffect } from "react";
import { TEMPLATES } from "diagram-dsl-core";
import { SaveModal } from "./components/SaveModal.js";
import { useLocalDiagrams } from "./hooks/useLocalDiagrams.js";
import { ShapeNode } from "./components/ShapeNode.js";
import { EdgeLine } from "./components/EdgeLine.js";
import { GroupBox } from "./components/GroupBox.js";
import { NoteBox } from "./components/NoteBox.js";
import { CodeEditor } from "./components/CodeEditor.js";
import { Toolbar } from "./components/Toolbar.js";
import { Minimap } from "./components/Minimap.js";
import { SyntaxPanel } from "./components/SyntaxPanel.js";
import { useDiagramState } from "./hooks/useDiagramState.js";
import { useNodeDrag } from "./hooks/useNodeDrag.js";
import { useGroupDrag } from "./hooks/useGroupDrag.js";
import { useCanvasInteraction } from "./hooks/useCanvasInteraction.js";
import { useSplitPane } from "./hooks/useSplitPane.js";
import { DIAGRAM_EDITOR_STYLES } from "./styles.js";

interface DiagramEditorProps {
  initialCode?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function DiagramEditor({ initialCode, className, style }: DiagramEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSyntax, setShowSyntax] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showMyDiagrams, setShowMyDiagrams] = useState(false);
  const { savedDiagrams, saveDiagram, deleteDiagram } = useLocalDiagrams();

  const {
    code, setCode, parsed, nodeById, groupById, nodeStates,
    setNodeLayout, setGroupLayout, setGroupSize,
    addNode, exportSVG, formatCode, resetLayout, loadTemplate, loadSaved,
  } = useDiagramState(initialCode);

  const { zoom, pan, isPanning, handleCanvasMouseDown, handleWheel, zoomIn, zoomOut, fitView } =
    useCanvasInteraction(svgRef);

  const { selectedNodeId, setSelectedNodeId, handleNodeMouseDown } =
    useNodeDrag(nodeById, zoom, setNodeLayout);

  const { handleGroupMoveMouseDown, handleGroupResizeMouseDown } =
    useGroupDrag(groupById, zoom, setGroupLayout, setGroupSize);

  const { splitPos, isResizing, setIsResizing } = useSplitPane(containerRef);

  const canvasW = 1200;
  const canvasH = 800;

  // showMyDiagrams 外クリックで閉じる
  useEffect(() => {
    if (!showMyDiagrams) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-my-diagrams]")) setShowMyDiagrams(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showMyDiagrams]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100vw",
        height: "100vh",
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

      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          height: 48,
          background: "#0c0e14",
          borderBottom: "1px solid #1e293b",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ◈
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
            DiagramCraft
          </span>
          <span
            style={{
              fontSize: 9,
              background: "#312e81",
              color: "#a5b4fc",
              padding: "2px 6px",
              borderRadius: 4,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Code → Diagram
          </span>
        </div>

        <div style={{ display: "flex", gap: 4, marginLeft: 24, alignItems: "center" }}>
          <span
            style={{
              fontSize: 10,
              color: "#64748b",
              marginRight: 4,
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            テンプレート
          </span>
          {Object.entries(TEMPLATES)
            .filter(([k]) => k !== "empty")
            .map(([key, val]) => (
              <button
                key={key}
                className="tmpl-btn"
                onClick={() => loadTemplate(val)}
                style={{
                  background: "#131720",
                  border: "1px solid #2d3548",
                  color: "#94a3b8",
                  padding: "3px 10px",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {key === "flowchart" ? "フローチャート"
                  : key === "sequence" ? "シーケンス"
                  : key === "er" ? "ER図"
                  : key === "architecture" ? "アーキテクチャ"
                  : key === "mindmap" ? "マインドマップ"
                  : key === "state" ? "状態遷移"
                  : key}
              </button>
            ))}
          <button
            className="tmpl-btn"
            onClick={() => loadTemplate(TEMPLATES.empty)}
            style={{
              background: "#131720",
              border: "1px solid #2d3548",
              color: "#64748b",
              padding: "3px 10px",
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            + 新規
          </button>
        </div>

        {/* マイ作品ドロップダウン */}
        <div data-my-diagrams="" style={{ position: "relative", marginLeft: 12 }}>
          <button
            onClick={() => setShowMyDiagrams((v) => !v)}
            style={{
              background: showMyDiagrams ? "#1e2435" : "#131720",
              border: `1px solid ${showMyDiagrams ? "#4338ca" : "#2d3548"}`,
              color: showMyDiagrams ? "#a5b4fc" : "#94a3b8",
              padding: "3px 10px",
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            マイ作品 {savedDiagrams.length > 0 ? `(${savedDiagrams.length})` : ""} ▾
          </button>
          {showMyDiagrams && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                background: "#0f1219",
                border: "1px solid #2d3548",
                borderRadius: 8,
                minWidth: 220,
                zIndex: 100,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                overflow: "hidden",
              }}
            >
              {savedDiagrams.length === 0 ? (
                <div style={{ padding: "12px 16px", fontSize: 12, color: "#475569" }}>
                  保存済みの作品はありません
                </div>
              ) : (
                savedDiagrams.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderBottom: "1px solid #1e293b",
                      gap: 8,
                    }}
                  >
                    <div
                      onClick={() => {
                        loadSaved(d.code, d.nodeStates);
                        setShowMyDiagrams(false);
                      }}
                      style={{ flex: 1, cursor: "pointer" }}
                    >
                      <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{d.name}</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                        {new Date(d.savedAt).toLocaleDateString("ja-JP")}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteDiagram(d.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#475569",
                        cursor: "pointer",
                        fontSize: 14,
                        padding: "2px 4px",
                        borderRadius: 3,
                      }}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        <button
          onClick={() => setShowSaveModal(true)}
          style={{
            background: "#312e81",
            border: "1px solid #4338ca",
            color: "#c7d2fe",
            padding: "3px 12px",
            borderRadius: 5,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
            marginLeft: 8,
          }}
        >
          保存
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setShowSyntax(!showSyntax)}
          style={{
            background: showSyntax ? "#312e81" : "#131720",
            border: `1px solid ${showSyntax ? "#4338ca" : "#2d3548"}`,
            color: showSyntax ? "#c7d2fe" : "#94a3b8",
            padding: "4px 12px",
            borderRadius: 5,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          構文ヘルプ
        </button>
      </header>

      {/* Main content */}
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
            onExportSVG={exportSVG}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onFitView={() => fitView(parsed.nodes, parsed.groups)}
            onResetLayout={resetLayout}
          />

          <div
            style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0a0c12" }}
            onWheel={handleWheel}
            onMouseDown={(e) => handleCanvasMouseDown(e, () => setSelectedNodeId(null))}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              style={{ cursor: isPanning ? "grabbing" : "default" }}
            >
              <defs>
                <pattern
                  id="grid"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${pan.x},${pan.y}) scale(${zoom})`}
                >
                  <circle cx="12" cy="12" r="0.5" fill="#334155" />
                </pattern>
                <pattern
                  id="gridLarge"
                  width="120"
                  height="120"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${pan.x},${pan.y}) scale(${zoom})`}
                >
                  <rect width="120" height="120" fill="url(#grid)" />
                  <line x1="0" y1="0" x2="120" y2="0" stroke="#1e293b" strokeWidth="0.5" />
                  <line x1="0" y1="0" x2="0" y2="120" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gridLarge)" data-bg="true" />

              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {parsed.groups.map((g) => (
                  <GroupBox
                    key={g.id}
                    group={g}
                    onMoveMouseDown={(e) => handleGroupMoveMouseDown(e, g.id)}
                    onResizeMouseDown={(e, handle) => handleGroupResizeMouseDown(e, g.id, handle)}
                  />
                ))}
                {parsed.notes.map((n) => (
                  <NoteBox key={n.id} note={n} />
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
                    isSelected={selectedNodeId === node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  />
                ))}
              </g>
            </svg>

            <Minimap
              nodes={parsed.nodes}
              viewBox={{ x: -pan.x / zoom, y: -pan.y / zoom, w: canvasW / zoom, h: canvasH / zoom }}
              canvasW={canvasW}
              canvasH={canvasH}
            />

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
        </div>
      </div>

      {showSaveModal && (
        <SaveModal
          existingNames={savedDiagrams.map((d) => d.name)}
          onSave={(name) => saveDiagram(name, code, nodeStates)}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
