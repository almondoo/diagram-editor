import type { CSSProperties, MouseEvent } from "react";

const tbBtnStyle: CSSProperties = {
  width: 32,
  height: 28,
  background: "#1a1f2e",
  border: "1px solid #2d3548",
  borderRadius: 5,
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
};

const tbHover = (e: MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "#2d3548";
  e.currentTarget.style.color = "#e2e8f0";
};

const tbLeave = (e: MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "#1a1f2e";
  e.currentTarget.style.color = "#94a3b8";
};

interface ToolbarProps {
  onAddNode: (shape: string) => void;
  onExportSVG: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

export function Toolbar({ onAddNode, onExportSVG, onZoomIn, onZoomOut, onFitView }: ToolbarProps) {
  const shapes = [
    { shape: "rect", icon: "▭", tip: "矩形" },
    { shape: "stadium", icon: "⊂⊃", tip: "角丸" },
    { shape: "diamond", icon: "◇", tip: "ダイヤモンド" },
    { shape: "ellipse", icon: "○", tip: "楕円" },
    { shape: "cylinder", icon: "⊖", tip: "シリンダー" },
    { shape: "hexagon", icon: "⬡", tip: "六角形" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: "6px 10px",
        background: "#0f1219",
        borderBottom: "1px solid #1e293b",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginRight: 4,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        追加
      </span>
      {shapes.map((s) => (
        <button
          key={s.shape}
          onClick={() => onAddNode(s.shape)}
          title={s.tip}
          style={{
            width: 32,
            height: 28,
            background: "#1a1f2e",
            border: "1px solid #2d3548",
            borderRadius: 5,
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#2d3548";
            e.currentTarget.style.color = "#e2e8f0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#1a1f2e";
            e.currentTarget.style.color = "#94a3b8";
          }}
        >
          {s.icon}
        </button>
      ))}
      <div style={{ width: 1, height: 20, background: "#2d3548", margin: "0 6px" }} />
      <button onClick={onZoomIn} title="ズームイン" style={tbBtnStyle} onMouseEnter={tbHover} onMouseLeave={tbLeave}>+</button>
      <button onClick={onZoomOut} title="ズームアウト" style={tbBtnStyle} onMouseEnter={tbHover} onMouseLeave={tbLeave}>−</button>
      <button onClick={onFitView} title="全体表示" style={tbBtnStyle} onMouseEnter={tbHover} onMouseLeave={tbLeave}>⊞</button>
      <div style={{ flex: 1 }} />
      <button
        onClick={onExportSVG}
        style={{
          ...tbBtnStyle,
          width: "auto",
          padding: "0 12px",
          background: "#312e81",
          borderColor: "#4338ca",
          color: "#c7d2fe",
          fontSize: 11,
          fontWeight: 600,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#3730a3"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#312e81"; }}
      >
        SVG出力
      </button>
    </div>
  );
}
