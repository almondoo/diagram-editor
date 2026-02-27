import { useState, useRef, useEffect } from "react";
import type { ColorPreset, LayoutDirection } from "~/lib/core";
import { COLOR_PRESETS } from "~/lib/core";

interface ToolbarProps {
  onAddNode: (shape: string) => void;
  onAddNote: () => void;
  onAddGroup: () => void;
  onExportSVG: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetLayout: (dir?: LayoutDirection) => void;
  layoutDirection: LayoutDirection;
  colorPreset: ColorPreset;
  onSetColorPreset: (preset: ColorPreset) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isMobile?: boolean;
}

const PRESET_KEYS: ColorPreset[] = ["default", "pastel", "monochrome", "ocean", "neon"];

export function Toolbar({ onAddNode, onAddNote, onAddGroup, onExportSVG, onZoomIn, onZoomOut, onFitView, onResetLayout, layoutDirection, colorPreset, onSetColorPreset, canUndo, canRedo, onUndo, onRedo, isMobile }: ToolbarProps) {
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

  const [showPresets, setShowPresets] = useState(false);
  const presetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPresets) return;
    const handler = (e: MouseEvent) => {
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPresets]);

  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showLayoutMenu) return;
    const handler = (e: MouseEvent) => {
      if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLayoutMenu]);

  const layoutOptions: { key: LayoutDirection; label: string; desc: string }[] = [
    { key: "auto", label: "自動", desc: "フォース配置" },
    { key: "TB", label: "上→下", desc: "階層レイアウト" },
    { key: "LR", label: "左→右", desc: "階層レイアウト" },
  ];

  const currentColors = COLOR_PRESETS[colorPreset].colors;

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

      {/* カラープリセット */}
      <div ref={presetRef} className="relative">
        <button
          onClick={() => setShowPresets(!showPresets)}
          title="カラープリセット"
          className={btnCls}
          style={{ width: "auto", height: btnH, padding: "0 8px", gap: 3 }}
        >
          {currentColors.slice(0, 5).map((c, i) => (
            <span
              key={i}
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, backgroundColor: c }}
            />
          ))}
        </button>
        {showPresets && (
          <div className="absolute top-full left-0 mt-1 bg-bg-raised border border-border rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
            {PRESET_KEYS.map((key) => {
              const preset = COLOR_PRESETS[key];
              return (
                <button
                  key={key}
                  onClick={() => { onSetColorPreset(key); setShowPresets(false); }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs hover:bg-border transition-colors"
                  style={{ color: colorPreset === key ? "#a5b4fc" : "#94a3b8" }}
                >
                  <span className="flex gap-0.5">
                    {preset.colors.slice(0, 5).map((c, i) => (
                      <span
                        key={i}
                        className="inline-block rounded-full"
                        style={{ width: 8, height: 8, backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <span className="font-medium">{preset.label}</span>
                  {colorPreset === key && <span className="ml-auto">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="w-px h-5 bg-border mx-1" />

      {/* Undo/Redo */}
      {onUndo && (
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="元に戻す (Cmd+Z)"
          className={tbBtnCls}
          style={{ width: btnW, height: btnH, fontSize: tbIconFS, opacity: canUndo ? 1 : 0.35 }}
        >
          ↩
        </button>
      )}
      {onRedo && (
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="やり直す (Cmd+Shift+Z)"
          className={tbBtnCls}
          style={{ width: btnW, height: btnH, fontSize: tbIconFS, opacity: canRedo ? 1 : 0.35 }}
        >
          ↪
        </button>
      )}
      <div className="w-px h-5 bg-border mx-1" />

      <button onClick={onZoomIn} title="ズームイン" className={tbBtnCls} style={{ width: btnW, height: btnH, fontSize: tbIconFS }}>+</button>
      <button onClick={onZoomOut} title="ズームアウト" className={tbBtnCls} style={{ width: btnW, height: btnH, fontSize: tbIconFS }}>−</button>
      <button onClick={onFitView} title="全体表示" className={tbBtnCls} style={{ width: btnW, height: btnH, fontSize: tbIconFS }}>⊞</button>
      <div className="w-px h-5 bg-border mx-1" />
      <div ref={layoutRef} className="relative">
        <div className="flex">
          <button
            onClick={() => onResetLayout()}
            title="ノードを自動配置"
            className={`${tbBtnCls} font-mono rounded-r-none border-r-0`}
            style={{ width: "auto", height: btnH, padding: "0 8px", fontSize: 11 }}
          >
            {isMobile ? "⊞" : "⊞ 自動配置"}
          </button>
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            title="レイアウト方向"
            className={`${tbBtnCls} rounded-l-none`}
            style={{ width: btnW, height: btnH, fontSize: 10 }}
          >
            ▾
          </button>
        </div>
        {showLayoutMenu && (
          <div className="absolute top-full left-0 mt-1 bg-bg-raised border border-border rounded-lg shadow-lg z-50 py-1 min-w-[180px]">
            {layoutOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => { onResetLayout(opt.key); setShowLayoutMenu(false); }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs hover:bg-border transition-colors"
                style={{ color: layoutDirection === opt.key ? "#a5b4fc" : "#94a3b8" }}
              >
                <span className="w-4">{layoutDirection === opt.key ? "✓" : ""}</span>
                <span className="font-medium">{opt.label}</span>
                <span className="ml-auto" style={{ color: "#64748b" }}>{opt.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
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
