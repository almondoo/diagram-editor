import type { CSSProperties, MouseEvent } from "react";

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
  onAddNote: () => void;
  onAddGroup: () => void;
  onExportSVG: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetLayout: () => void;
  isMobile?: boolean;
}

export function Toolbar({ onAddNode, onAddNote, onAddGroup, onExportSVG, onZoomIn, onZoomOut, onFitView, onResetLayout, isMobile }: ToolbarProps) {
  const shapes = [
    { shape: "rect", icon: "▭", tip: "矩形" },
    { shape: "stadium", icon: "⊂⊃", tip: "角丸" },
    { shape: "diamond", icon: "◇", tip: "ダイヤモンド" },
    { shape: "ellipse", icon: "○", tip: "楕円" },
    { shape: "cylinder", icon: "⊖", tip: "シリンダー" },
    { shape: "hexagon", icon: "⬡", tip: "六角形" },
  ];

  const btnW = isMobile ? 40 : 32;
  const btnH = isMobile ? 36 : 28;
  const iconFS = isMobile ? 16 : 14;

  const btnStyle: CSSProperties = {
    width: btnW,
    height: btnH,
    background: "#1a1f2e",
    border: "1px solid #2d3548",
    borderRadius: 5,
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: iconFS,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  };

  const tbBtnStyle: CSSProperties = {
    ...btnStyle,
    fontSize: isMobile ? 17 : 15,
    fontWeight: 600,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 4 : 3,
        padding: isMobile ? "6px 8px" : "6px 10px",
        background: "#0f1219",
        borderBottom: "1px solid #1e293b",
        flexWrap: "wrap",
      }}
    >
      {!isMobile && (
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
      )}
      {shapes.map((s) => (
        <button
          key={s.shape}
          onClick={() => onAddNode(s.shape)}
          title={s.tip}
          style={btnStyle}
          onMouseEnter={tbHover}
          onMouseLeave={tbLeave}
        >
          {s.icon}
        </button>
      ))}
      <button
        onClick={onAddNote}
        title="ノート追加"
        style={btnStyle}
        onMouseEnter={tbHover}
        onMouseLeave={tbLeave}
      >
        ✎
      </button>
      <button
        onClick={onAddGroup}
        title="グループ追加"
        style={btnStyle}
        onMouseEnter={tbHover}
        onMouseLeave={tbLeave}
      >
        ▢
      </button>
      <div style={{ width: 1, height: 20, background: "#2d3548", margin: "0 4px" }} />
      <button onClick={onZoomIn} title="ズームイン" style={tbBtnStyle} onMouseEnter={tbHover} onMouseLeave={tbLeave}>+</button>
      <button onClick={onZoomOut} title="ズームアウト" style={tbBtnStyle} onMouseEnter={tbHover} onMouseLeave={tbLeave}>−</button>
      <button onClick={onFitView} title="全体表示" style={tbBtnStyle} onMouseEnter={tbHover} onMouseLeave={tbLeave}>⊞</button>
      <div style={{ width: 1, height: 20, background: "#2d3548", margin: "0 4px" }} />
      <button
        onClick={onResetLayout}
        title="ノードを自動配置"
        style={{ ...tbBtnStyle, width: "auto", padding: "0 10px", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
        onMouseEnter={tbHover}
        onMouseLeave={tbLeave}
      >
        {isMobile ? "⊞" : "⊞ 自動配置"}
      </button>
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
        {isMobile ? "SVG" : "SVG出力"}
      </button>
    </div>
  );
}
