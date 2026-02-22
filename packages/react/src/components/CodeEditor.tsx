import { useRef, useMemo, useState, useCallback, memo } from "react";
import type { ParseError, CompletionItem } from "diagram-dsl-core";
import { highlightLine, getCompletionContext, getCompletionItems } from "diagram-dsl-core";
import { AutocompleteDropdown } from "./AutocompleteDropdown.js";

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  errors: ParseError[];
  onFormat: () => void;
  existingIds?: string[];
}

const UNDO_MERGE_INTERVAL = 300;

export const CodeEditor = memo(function CodeEditor({ code, onChange, errors, onFormat, existingIds = [] }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineCountRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const lines = code.split("\n");
  const errorLines = useMemo(() => new Set(errors.map((e) => e.line)), [errors]);

  const composingRef = useRef(false);

  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastPushTimeRef = useRef(0);

  const pushUndo = useCallback((prevCode: string) => {
    const now = Date.now();
    const shouldMerge = now - lastPushTimeRef.current < UNDO_MERGE_INTERVAL && undoStackRef.current.length > 0;
    if (!shouldMerge) {
      undoStackRef.current.push(prevCode);
    }
    lastPushTimeRef.current = now;
    redoStackRef.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(code);
    onChange(prev);
  }, [code, onChange]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(code);
    onChange(next);
  }, [code, onChange]);

  // 補完state
  const [completionItems, setCompletionItems] = useState<CompletionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [completionPos, setCompletionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const showCompletion = completionItems.length > 0;

  const measureCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror) return { top: 0, left: 0 };

    const textBeforeCursor = textarea.value.slice(0, textarea.selectionStart);
    const lines = textBeforeCursor.split("\n");
    const currentLineIndex = lines.length - 1;
    const currentCol = lines[currentLineIndex]!.length;

    // 行の高さとパディングから計算
    const lineHeight = 21;
    const paddingTop = 12;
    const paddingLeft = 16;

    // ミラー要素を使ってテキスト幅を計測
    mirror.textContent = lines[currentLineIndex]!.slice(0, currentCol);
    const textWidth = mirror.scrollWidth;

    const top = paddingTop + (currentLineIndex + 1) * lineHeight - textarea.scrollTop;
    const left = paddingLeft + textWidth - textarea.scrollLeft;

    return { top, left };
  }, []);

  const existingIdsRef = useRef(existingIds);
  existingIdsRef.current = existingIds;

  const updateCompletion = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentCode = textarea.value;
    const pos = textarea.selectionStart;
    const textBeforeCursor = currentCode.slice(0, pos);
    const allLines = currentCode.split("\n");
    const linesBeforeCursor = textBeforeCursor.split("\n");
    const currentLine = linesBeforeCursor[linesBeforeCursor.length - 1]!;
    const col = currentLine.length;
    const currentLineIndex = linesBeforeCursor.length - 1;

    // ブロックヘッダー行を検出（現在の行がブロック内かどうか）
    let blockHeaderLine = "";
    let depth = 0;
    for (let i = currentLineIndex - 1; i >= 0; i--) {
      const l = allLines[i]!;
      const opens = (l.match(/\{/g) ?? []).length;
      const closes = (l.match(/\}/g) ?? []).length;
      depth += closes - opens;
      if (depth < 0) {
        blockHeaderLine = l;
        break;
      }
    }

    const context = getCompletionContext(currentLine, col, blockHeaderLine, allLines);
    if (!context) {
      setCompletionItems([]);
      return;
    }

    const items = getCompletionItems(context, existingIdsRef.current);
    setCompletionItems(items);
    setSelectedIndex(0);
    if (items.length > 0) {
      setCompletionPos(measureCursorPosition());
    }
  }, [measureCursorPosition]);

  const applyCompletion = useCallback((item: CompletionItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const textBeforeCursor = code.slice(0, pos);
    const linesBeforeCursor = textBeforeCursor.split("\n");
    const currentLine = linesBeforeCursor[linesBeforeCursor.length - 1]!;

    // プレフィックスの長さを計算
    const prefixMatch = currentLine.match(/[\w#<>-]*$/);
    const prefixLen = prefixMatch ? prefixMatch[0].length : 0;

    pushUndo(code);
    const insertText = item.text + (item.suffix ?? "");
    const newCode = code.slice(0, pos - prefixLen) + insertText + code.slice(pos);
    onChange(newCode);

    const newPos = pos - prefixLen + insertText.length;
    requestAnimationFrame(() => {
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
    });

    setCompletionItems([]);
  }, [code, onChange, pushUndo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換中は全てのキー処理をスキップ
    if (composingRef.current) return;

    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Cmd+Z / Cmd+Shift+Z (undo/redo)
    if ((e.metaKey || e.ctrlKey) && e.key === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }

    // 補完表示中のキーインターセプト
    if (showCompletion) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % completionItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + completionItems.length) % completionItems.length);
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        applyCompletion(completionItems[selectedIndex]!);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setCompletionItems([]);
        return;
      }
    }

    if (e.key === "Tab") {
      e.preventDefault();
      pushUndo(code);
      const newCode = `${code.slice(0, start)  }  ${  code.slice(end)}`;
      onChange(newCode);
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + 2;
      });
      return;
    }

    if (e.key === "{") {
      e.preventDefault();
      pushUndo(code);
      const newCode = `${code.slice(0, start)  }{}${  code.slice(end)}`;
      onChange(newCode);
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = start + 1;
      });
      return;
    }

    if (e.key === '"') {
      e.preventDefault();
      pushUndo(code);
      const newCode = `${code.slice(0, start)  }""${  code.slice(end)}`;
      onChange(newCode);
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = start + 1;
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      pushUndo(code);
      const before = code.slice(0, start);
      const lineStart = before.lastIndexOf("\n") + 1;
      const currentLineContent = before.slice(lineStart);
      const indent = currentLineContent.match(/^(\s*)/)?.[1] ?? "";
      const charBefore = code[start - 1];
      const charAfter = code[end];

      if (charBefore === "{" && charAfter === "}") {
        // { } の間で改行 → インデント付きで展開し、} も下へ
        const newCode =
          `${code.slice(0, start)  }\n${  indent  }  ` + `\n${  indent  }${code.slice(end)}`;
        onChange(newCode);
        requestAnimationFrame(() => {
          const newPos = start + 1 + indent.length + 2;
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
        });
      } else if (currentLineContent.trimEnd().endsWith("{")) {
        // 行末が { → 次行はインデント + 2スペース
        const newCode = `${code.slice(0, start)  }\n${  indent  }  ${  code.slice(end)}`;
        onChange(newCode);
        requestAnimationFrame(() => {
          const newPos = start + 1 + indent.length + 2;
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
        });
      } else {
        // 通常の改行 → 現在行のインデントを引き継ぐ
        const newCode = `${code.slice(0, start)  }\n${  indent  }${code.slice(end)}`;
        onChange(newCode);
        requestAnimationFrame(() => {
          const newPos = start + 1 + indent.length;
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
        });
      }
      return;
    }
  };

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
    return code.split("\n").map((line) => highlightLine(line));
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
        <div
          ref={mirrorRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -9999,
            left: -9999,
            visibility: "hidden",
            whiteSpace: "pre",
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: "0.02em",
          }}
        />
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => {
            pushUndo(code);
            onChange(e.target.value);
            requestAnimationFrame(() => updateCompletion());
          }}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
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
        {showCompletion && (
          <AutocompleteDropdown
            items={completionItems}
            selectedIndex={selectedIndex}
            position={completionPos}
            onSelect={applyCompletion}
          />
        )}
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
});
