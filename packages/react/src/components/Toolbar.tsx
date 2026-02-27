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
  const tbIconFS = isMobile ? 17 : 15;

  const btnCls = "tb-btn bg-surface border border-border rounded-[5px] text-text-muted cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-border hover:text-text-primary";
  const tbBtnCls = `${btnCls} font-semibold`;

  return (
    <div
      className="flex items-center flex-wrap bg-bg-panel border-b border-border-subtle"
      style={{ gap: isMobile ? 4 : 3, padding: isMobile ? "6px 8px" : "6px 10px" }}
    >
      {!isMobile && (
        <span className="text-[10px] text-text-faint uppercase tracking-[0.1em] mr-1 font-mono">
          追加
        </span>
      )}
      {shapes.map((s) => (
        <button
          key={s.shape}
          onClick={() => onAddNode(s.shape)}
          title={s.tip}
          className={btnCls}
          style={{ width: btnW, height: btnH, fontSize: iconFS }}
        >
          {s.icon}
        </button>
      ))}
      <button
        onClick={onAddNote}
        title="ノート追加"
        className={btnCls}
        style={{ width: btnW, height: btnH, fontSize: iconFS }}
      >
        ✎
      </button>
      <button
        onClick={onAddGroup}
        title="グループ追加"
        className={btnCls}
        style={{ width: btnW, height: btnH, fontSize: iconFS }}
      >
        ▢
      </button>
      <div className="w-px h-5 bg-border mx-1" />
      <button onClick={onZoomIn} title="ズームイン" className={tbBtnCls} style={{ width: btnW, height: btnH, fontSize: tbIconFS }}>+</button>
      <button onClick={onZoomOut} title="ズームアウト" className={tbBtnCls} style={{ width: btnW, height: btnH, fontSize: tbIconFS }}>−</button>
      <button onClick={onFitView} title="全体表示" className={tbBtnCls} style={{ width: btnW, height: btnH, fontSize: tbIconFS }}>⊞</button>
      <div className="w-px h-5 bg-border mx-1" />
      <button
        onClick={onResetLayout}
        title="ノードを自動配置"
        className={`${tbBtnCls} font-mono`}
        style={{ width: "auto", height: btnH, padding: "0 10px", fontSize: 11 }}
      >
        {isMobile ? "⊞" : "⊞ 自動配置"}
      </button>
      <div className="flex-1" />
      <button
        onClick={onExportSVG}
        className="tb-btn bg-primary-darker hover:bg-primary-bg border border-primary-dark text-primary-lighter font-semibold cursor-pointer flex items-center justify-center transition-all duration-150 rounded-[5px]"
        style={{ width: "auto", height: btnH, padding: "0 12px", fontSize: 11 }}
      >
        {isMobile ? "SVG" : "SVG出力"}
      </button>
    </div>
  );
}
