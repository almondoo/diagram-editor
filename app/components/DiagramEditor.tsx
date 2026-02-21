import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { TEMPLATES } from "../data/templates";
import { parseDSL } from "../utils/dsl-parser";
import { autoLayout } from "../utils/layout";
import { formatDSLCode } from "../utils/formatter";
import { generateExportSVG } from "../utils/svg-export";
import { randomColor, randomPosition } from "../utils/colors";
import { ShapeNode } from "./ShapeNode";
import { EdgeLine } from "./EdgeLine";
import { GroupBox } from "./GroupBox";
import { NoteBox } from "./NoteBox";
import { CodeEditor } from "./CodeEditor";
import { Toolbar } from "./Toolbar";
import { Minimap } from "./Minimap";
import { SyntaxPanel } from "./SyntaxPanel";

export default function DiagramEditor() {
  const [code, setCode] = useState(TEMPLATES.architecture);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<{ nodeId: string; startX: number; startY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [showSyntax, setShowSyntax] = useState(false);
  const [splitPos, setSplitPos] = useState(42);
  const [isResizing, setIsResizing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    const p = parseDSL(code);
    p.nodes = autoLayout(p.nodes, p.edges);
    return p;
  }, [code]);

  const nodeById = useMemo(() => {
    const map: Record<string, (typeof parsed.nodes)[0]> = {};
    parsed.nodes.forEach((n) => (map[n.id] = n));
    return map;
  }, [parsed.nodes]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button === 1 || e.button === 2) return;
    setSelectedNodeId(nodeId);
    setDragInfo({ nodeId, startX: e.clientX, startY: e.clientY });
  }, []);

  useEffect(() => {
    if (!dragInfo) return;
    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragInfo.startX) / zoom;
      const dy = (e.clientY - dragInfo.startY) / zoom;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      const node = nodeById[dragInfo.nodeId];
      if (!node) return;
      const newX = Math.round(node.x + dx);
      const newY = Math.round(node.y + dy);

      setCode((prev) => {
        const lines = prev.split("\n");
        const updated = lines.map((line) => {
          const m = line.match(
            new RegExp(`^(node\\s+${dragInfo.nodeId}\\s+"[^"]*"\\s*\\{)(.*)\\}`)
          );
          if (!m) return line;
          let props = m[2];
          if (/x=/.test(props)) props = props.replace(/x=\S+/, `x=${newX}`);
          else props += ` x=${newX}`;
          if (/y=/.test(props)) props = props.replace(/y=\S+/, `y=${newY}`);
          else props += ` y=${newY}`;
          return `${m[1]}${props}}`;
        });
        return updated.join("\n");
      });

      setDragInfo((d) => (d ? { ...d, startX: e.clientX, startY: e.clientY } : null));
    };
    const handleUp = () => setDragInfo(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragInfo, nodeById, zoom]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.getAttribute("data-bg")) {
      setSelectedNodeId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  useEffect(() => {
    if (!isPanning || !panStart) return;
    const move = (e: MouseEvent) => setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    const up = () => setIsPanning(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [isPanning, panStart]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.2, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const move = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.max(20, Math.min(70, pct)));
    };
    const up = () => setIsResizing(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [isResizing]);

  const handleAddNode = (shape: string) => {
    const id = `n${Date.now().toString(36)}`;
    const col = randomColor();
    const pos = randomPosition(parsed.nodes);
    const newLine = `\nnode ${id} "新規ノード" { shape=${shape} color=${col} x=${pos.x} y=${pos.y} }`;
    setCode((c) => c + newLine);
  };

  const handleExportSVG = () => {
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

  const handleFormat = () => setCode((c) => formatDSLCode(c));
  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, z - 0.15));
  const handleFitView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const canvasW = 1200;
  const canvasH = 800;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#080a10",
        fontFamily: "'IBM Plex Sans', 'Noto Sans JP', system-ui",
        overflow: "hidden",
        color: "#e2e8f0",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0f1219; }
        ::-webkit-scrollbar-thumb { background: #2d3548; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
        .edge-animate { animation: edgeDash 1s linear infinite; stroke-dasharray: 8,4; }
        @keyframes edgeDash { to { stroke-dashoffset: -20; } }
        .sel-outline { animation: selPulse 1.5s ease-in-out infinite; }
        @keyframes selPulse { 0%,100% { opacity:0.5 } 50% { opacity:1 } }
        .tmpl-btn { transition: all 0.15s; }
        .tmpl-btn:hover { background: #1e293b !important; border-color: #475569 !important; }
        textarea::selection { background: #312e81; }
        .syntax-card { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

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
                onClick={() => setCode(val)}
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
            onClick={() => setCode(TEMPLATES.empty)}
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
            <CodeEditor code={code} onChange={setCode} errors={parsed.errors} onFormat={handleFormat} />
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
            onAddNode={handleAddNode}
            onExportSVG={handleExportSVG}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={handleFitView}
          />

          <div
            style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0a0c12" }}
            onWheel={handleWheel}
            onMouseDown={handleCanvasMouseDown}
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
                  <GroupBox key={g.id} group={g} />
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
    </div>
  );
}
