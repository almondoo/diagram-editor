import { useState, useRef } from "react";
import { Link } from "react-router";
import { useViewport } from "~/lib/react";

interface AppHeaderProps {
  onSave: () => void;
  saveLabel: string;
  currentDiagramName?: string;
  onRenameDiagram?: (name: string) => void;
}

export function AppHeader({
  onSave,
  saveLabel,
  currentDiagramName,
  onRenameDiagram,
}: AppHeaderProps) {
  const { isMobile } = useViewport();
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

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

      {/* 保存ボタン */}
      <button
        onClick={onSave}
        className="bg-primary-darker border border-primary-dark text-primary-lighter px-3 py-[3px] rounded-[5px] cursor-pointer text-[11px] font-semibold"
        style={{ marginLeft: isMobile ? 10 : 24 }}
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
