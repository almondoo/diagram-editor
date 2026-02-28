import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { TEMPLATES } from "~/data/templates";
import { useViewport } from "~/lib/react";

interface AppHeaderProps {
  onCreateFromTemplate: (code: string) => void;
  onSave: () => void;
  saveLabel: string;
  currentDiagramName?: string;
  onRenameDiagram?: (name: string) => void;
}

export function AppHeader({
  onCreateFromTemplate,
  onSave,
  saveLabel,
  currentDiagramName,
  onRenameDiagram,
}: AppHeaderProps) {
  const { isMobile } = useViewport();
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showTemplates) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-template-dropdown]")) setShowTemplates(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showTemplates]);

  return (
    <header
      className="flex items-center h-12 bg-bg-raised border-b border-border-subtle shrink-0 font-sans text-text-primary"
      style={{ padding: isMobile ? "0 12px" : "0 20px" }}
    >
      {/* ブランディング（ホームリンク） */}
      <Link
        to="/"
        className="flex items-center gap-2.5 no-underline text-inherit"
      >
        <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-primary to-purple flex items-center justify-center text-sm font-bold">
          ◈
        </div>
        {!isMobile && (
          <>
            <span className="text-[15px] font-bold tracking-tight">
              DiagramCraft
            </span>
            <span className="text-[9px] bg-primary-darker text-primary-pale px-1.5 py-0.5 rounded-[4px] font-semibold tracking-[0.05em] uppercase">
              Code → Diagram
            </span>
          </>
        )}
      </Link>

      {/* テンプレートドロップダウン */}
      <div
        data-template-dropdown=""
        className="relative"
        style={{ marginLeft: isMobile ? 10 : 24 }}
      >
        <button
          onClick={() => setShowTemplates((v) => !v)}
          style={{
            background: showTemplates ? "#1e2435" : "#131720",
            border: `1px solid ${showTemplates ? "#4338ca" : "#2d3548"}`,
            color: showTemplates ? "#a5b4fc" : "#94a3b8",
            padding: "3px 10px",
            borderRadius: 5,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          テンプレート
          <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
        </button>
        {showTemplates && (
          <div className="absolute top-[calc(100%+4px)] left-0 bg-bg-panel border border-border rounded-lg min-w-40 z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
            {TEMPLATES
              .filter((t) => t.id !== "empty")
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onCreateFromTemplate(t.code);
                    setShowTemplates(false);
                  }}
                  className="block w-full text-left bg-transparent border-none border-b border-border-subtle text-text-muted px-3.5 py-2 cursor-pointer text-xs font-sans hover:bg-surface-alt hover:text-text-primary"
                >
                  {t.name}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* 保存ボタン */}
      <button
        onClick={onSave}
        className="bg-primary-darker border border-primary-dark text-primary-lighter px-3 py-[3px] rounded-[5px] cursor-pointer text-[11px] font-semibold ml-2"
      >
        {saveLabel}
      </button>

      {/* ダイアグラム名 */}
      {currentDiagramName !== undefined && (
        <div className="flex items-center min-w-0" style={{ marginLeft: isMobile ? 8 : 16, flex: isMobile ? 1 : undefined }}>
          {editingName ? (
            <input
              ref={nameInputRef}
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onBlur={() => {
                const trimmed = editNameValue.trim();
                if (trimmed && trimmed !== currentDiagramName) {
                  onRenameDiagram?.(trimmed);
                }
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const trimmed = editNameValue.trim();
                  if (trimmed && trimmed !== currentDiagramName) {
                    onRenameDiagram?.(trimmed);
                  }
                  setEditingName(false);
                }
                if (e.key === "Escape") setEditingName(false);
              }}
              autoFocus
              className="bg-bg-overlay border border-primary-dark rounded-[4px] px-2 py-0.5 text-text-primary text-xs outline-none min-w-30 max-w-60"
            />
          ) : (
            <span
              onClick={() => {
                setEditNameValue(currentDiagramName);
                setEditingName(true);
              }}
              title="クリックで名前変更"
              className="text-xs text-text-muted cursor-pointer px-1.5 py-0.5 rounded-[4px] max-w-60 overflow-hidden text-ellipsis whitespace-nowrap inline-block hover:text-text-primary hover:bg-surface-alt"
            >
              {currentDiagramName}
            </span>
          )}
        </div>
      )}

      <div className="flex-1" />
    </header>
  );
}
