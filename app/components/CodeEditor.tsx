import { useRef, useMemo } from "react";
import type { ParseError } from "../types";
import { highlightLine } from "../utils/syntax-highlighting";

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  errors: ParseError[];
  onFormat: () => void;
}

export function CodeEditor({ code, onChange, errors, onFormat }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineCountRef = useRef<HTMLDivElement>(null);
  const lines = code.split("\n");
  const errorLines = new Set(errors.map((e) => e.line));

  const handleScroll = () => {
    if (textareaRef.current) {
      if (lineCountRef.current) lineCountRef.current.scrollTop = textareaRef.current.scrollTop;
      if (highlightRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop;
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    }
  };

  const highlighted = useMemo(() => {
    return lines.map((line) => highlightLine(line));
  }, [code]);

  return (
    <div style={{ display: "flex", height: "100%", position: "relative" }}>
      <div
        ref={lineCountRef}
        style={{
          width: 44,
          background: "#0c0e14",
          color: "#475569",
          fontSize: 12,
          fontFamily: "'IBM Plex Mono', monospace",
          lineHeight: "21px",
          paddingTop: 12,
          paddingRight: 8,
          textAlign: "right",
          overflow: "hidden",
          userSelect: "none",
          borderRight: "1px solid #1e293b",
          flexShrink: 0,
        }}
      >
        {lines.map((_, i) => (
          <div
            key={i}
            style={{
              color: errorLines.has(i + 1) ? "#f87171" : "#475569",
              fontWeight: errorLines.has(i + 1) ? 700 : 400,
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div
          ref={highlightRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: "12px 16px",
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: "21px",
            letterSpacing: "0.02em",
            whiteSpace: "pre",
            overflow: "hidden",
            pointerEvents: "none",
            color: "transparent",
          }}
        >
          {highlighted.map((tokens, i) => (
            <div key={i} style={{ height: 21 }}>
              {tokens.map((t, j) => (
                <span key={j} style={{ color: t.color }}>
                  {t.text}
                </span>
              ))}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: "transparent",
            color: "rgba(226,232,240,0.0)",
            caretColor: "#818cf8",
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: "21px",
            padding: "12px 16px",
            tabSize: 2,
            letterSpacing: "0.02em",
            zIndex: 1,
          }}
        />
      </div>
      <button
        onClick={onFormat}
        title="コードを整形"
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          zIndex: 5,
          background: "#1a1f2e",
          border: "1px solid #2d3548",
          borderRadius: 6,
          color: "#94a3b8",
          padding: "4px 10px",
          cursor: "pointer",
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          display: "flex",
          alignItems: "center",
          gap: 4,
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
        ⟐ 整形
      </button>
    </div>
  );
}
