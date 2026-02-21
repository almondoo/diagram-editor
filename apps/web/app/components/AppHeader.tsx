import { useState, useEffect } from "react";
import { TEMPLATES } from "~/data/templates";
import type { SavedDiagram } from "~/hooks/useLocalDiagrams";

interface AppHeaderProps {
  onLoadTemplate: (code: string) => void;
  onSave: () => void;
  saveLabel: string;
  savedDiagrams: SavedDiagram[];
  currentDiagramId: string | null;
  onLoadSaved: (diagram: SavedDiagram) => void;
  onDeleteDiagram: (id: string) => void;
}

export function AppHeader({
  onLoadTemplate,
  onSave,
  saveLabel,
  savedDiagrams,
  currentDiagramId,
  onLoadSaved,
  onDeleteDiagram,
}: AppHeaderProps) {
  const [showMyDiagrams, setShowMyDiagrams] = useState(false);

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
      {/* ブランディング */}
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

      {/* テンプレートボタン */}
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
              onClick={() => onLoadTemplate(val)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#1e293b";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#475569";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#131720";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#2d3548";
              }}
              style={{
                background: "#131720",
                border: "1px solid #2d3548",
                color: "#94a3b8",
                padding: "3px 10px",
                borderRadius: 5,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 500,
                transition: "all 0.15s",
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
          onClick={() => onLoadTemplate(TEMPLATES.empty)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#1e293b";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#475569";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#131720";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#2d3548";
          }}
          style={{
            background: "#131720",
            border: "1px solid #2d3548",
            color: "#64748b",
            padding: "3px 10px",
            borderRadius: 5,
            cursor: "pointer",
            fontSize: 11,
            transition: "all 0.15s",
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
                      onLoadSaved(d);
                      setShowMyDiagrams(false);
                    }}
                    style={{ flex: 1, cursor: "pointer" }}
                  >
                    <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>
                      {d.id === currentDiagramId && (
                        <span style={{ color: "#6366f1", marginRight: 4 }}>✓</span>
                      )}
                      {d.name}
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                      {new Date(d.savedAt).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteDiagram(d.id)}
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

      <div style={{ flex: 1 }} />
    </header>
  );
}
