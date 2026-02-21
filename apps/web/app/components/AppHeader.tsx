import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { TEMPLATES } from "~/data/templates";

interface AppHeaderProps {
  onLoadTemplate: (code: string) => void;
  onSave: () => void;
  saveLabel: string;
  currentDiagramName?: string;
  onRenameDiagram?: (name: string) => void;
}

const TEMPLATE_LABELS: Record<string, string> = {
  flowchart: "フローチャート",
  sequence: "シーケンス",
  er: "ER図",
  architecture: "アーキテクチャ",
  mindmap: "マインドマップ",
  state: "状態遷移",
};

export function AppHeader({
  onLoadTemplate,
  onSave,
  saveLabel,
  currentDiagramName,
  onRenameDiagram,
}: AppHeaderProps) {
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
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        height: 48,
        background: "#0c0e14",
        borderBottom: "1px solid #1e293b",
        flexShrink: 0,
        fontFamily: "'IBM Plex Sans', 'Noto Sans JP', system-ui",
        color: "#e2e8f0",
      }}
    >
      {/* ブランディング（ホームリンク） */}
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          color: "inherit",
        }}
      >
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
      </Link>

      {/* テンプレートドロップダウン */}
      <div
        data-template-dropdown=""
        style={{ position: "relative", marginLeft: 24 }}
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
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              background: "#0f1219",
              border: "1px solid #2d3548",
              borderRadius: 8,
              minWidth: 160,
              zIndex: 100,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            {Object.entries(TEMPLATES)
              .filter(([k]) => k !== "empty")
              .map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => {
                    onLoadTemplate(val);
                    setShowTemplates(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid #1e293b",
                    color: "#94a3b8",
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "'IBM Plex Sans', 'Noto Sans JP', system-ui",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#1e293b";
                    (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                  }}
                >
                  {TEMPLATE_LABELS[key] ?? key}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* 保存ボタン */}
      <button
        onClick={onSave}
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
        {saveLabel}
      </button>

      {/* ダイアグラム名 */}
      {currentDiagramName !== undefined && (
        <div style={{ marginLeft: 16, display: "flex", alignItems: "center" }}>
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
              style={{
                background: "#131720",
                border: "1px solid #4338ca",
                borderRadius: 4,
                padding: "2px 8px",
                color: "#e2e8f0",
                fontSize: 12,
                outline: "none",
                minWidth: 120,
                maxWidth: 240,
              }}
            />
          ) : (
            <span
              onClick={() => {
                setEditNameValue(currentDiagramName);
                setEditingName(true);
              }}
              title="クリックで名前変更"
              style={{
                fontSize: 12,
                color: "#94a3b8",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 4,
                maxWidth: 240,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLSpanElement).style.color = "#e2e8f0";
                (e.currentTarget as HTMLSpanElement).style.background = "#1e293b";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLSpanElement).style.color = "#94a3b8";
                (e.currentTarget as HTMLSpanElement).style.background = "transparent";
              }}
            >
              {currentDiagramName}
            </span>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />
    </header>
  );
}
