import { useState } from "react";
import { Link } from "react-router";
import { TEMPLATES } from "~/data/templates";

interface AppHeaderProps {
  onLoadTemplate: (code: string) => void;
  onSave: () => void;
  saveLabel: string;
}

export function AppHeader({
  onLoadTemplate,
  onSave,
  saveLabel,
}: AppHeaderProps) {
  const [templateHovered, setTemplateHovered] = useState<string | null>(null);

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
              onMouseEnter={() => setTemplateHovered(key)}
              onMouseLeave={() => setTemplateHovered(null)}
              style={{
                background: templateHovered === key ? "#1e293b" : "#131720",
                border: `1px solid ${templateHovered === key ? "#475569" : "#2d3548"}`,
                color: "#94a3b8",
                padding: "3px 10px",
                borderRadius: 5,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 500,
                transition: "all 0.15s",
              }}
            >
              {key === "flowchart"
                ? "フローチャート"
                : key === "sequence"
                  ? "シーケンス"
                  : key === "er"
                    ? "ER図"
                    : key === "architecture"
                      ? "アーキテクチャ"
                      : key === "mindmap"
                        ? "マインドマップ"
                        : key === "state"
                          ? "状態遷移"
                          : key}
            </button>
          ))}
        <button
          onClick={() => onLoadTemplate(TEMPLATES.empty)}
          onMouseEnter={() => setTemplateHovered("empty")}
          onMouseLeave={() => setTemplateHovered(null)}
          style={{
            background: templateHovered === "empty" ? "#1e293b" : "#131720",
            border: `1px solid ${templateHovered === "empty" ? "#475569" : "#2d3548"}`,
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
