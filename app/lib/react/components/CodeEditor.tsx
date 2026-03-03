import { useRef, useMemo, useState, useCallback, useEffect, memo } from "react";
import type { ParseError, CompletionItem } from "~/lib/core";
import { highlightLine, getCompletionContext, getCompletionItems } from "~/lib/core";
import { AutocompleteDropdown } from "./AutocompleteDropdown";

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  errors: ParseError[];
  onFormat: () => void;
  existingIds?: string[];
  focusLine?: number | null;
  scrollOnly?: boolean;
  onCursorLineChange?: (line: number) => void;
}

const UNDO_MERGE_INTERVAL = 300;

export const CodeEditor = memo(function CodeEditor({ code, onChange, errors, onFormat, existingIds = [], focusLine, scrollOnly, onCursorLineChange }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineCountRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const lines = code.split("\n");
  const errorLines = useMemo(() => new Set(errors.map((e) => e.line)), [errors]);

  const composingRef = useRef(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // カーソル行追跡 (0-indexed)
  const [cursorLine, setCursorLine] = useState(0);

  const onCursorLineChangeRef = useRef(onCursorLineChange);
  onCursorLineChangeRef.current = onCursorLineChange;

  const updateCursorLine = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const textBefore = textarea.value.slice(0, textarea.selectionStart);
    const line = textBefore.split("\n").length - 1;
    setCursorLine(line);
    onCursorLineChangeRef.current?.(line);
  }, []);

  // focusLine による外部からのフォーカス (1-indexed)
  useEffect(() => {
    if (!focusLine || focusLine < 1) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const codeLines = textarea.value.split("\n");
    const targetIndex = Math.min(focusLine - 1, codeLines.length - 1);
    let pos = 0;
    for (let i = 0; i < targetIndex; i++) {
      pos += codeLines[i]!.length + 1;
    }
    if (!scrollOnly) {
      textarea.focus();
      textarea.selectionStart = pos;
      textarea.selectionEnd = pos;
    }
    setCursorLine(targetIndex);
    // スクロールして対象行を表示
    const lineHeight = 21;
    const scrollTarget = targetIndex * lineHeight - textarea.clientHeight / 2 + lineHeight;
    textarea.scrollTop = Math.max(0, scrollTarget);
    if (lineCountRef.current) lineCountRef.current.scrollTop = textarea.scrollTop;
    if (highlightRef.current) highlightRef.current.scrollTop = textarea.scrollTop;
  }, [focusLine, scrollOnly]);

  useEffect(() => () => {
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
  }, []);

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
    const prefixMatch = currentLine.match(/[\w#<>.-]*$/);
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

    // Cmd+X (行切り取り / 選択範囲切り取り)
    if ((e.metaKey || e.ctrlKey) && e.key === "x") {
      if (start === end) {
        // 選択なし → 現在行をコピー＆切り取り
        e.preventDefault();
        const codeLines = code.split("\n");
        const textBefore = code.slice(0, start);
        const lineIndex = textBefore.split("\n").length - 1;
        const cutLine = codeLines[lineIndex]!;
        void navigator.clipboard.writeText(`${cutLine}\n`);
        pushUndo(code);
        // 行を削除: splice して再結合
        codeLines.splice(lineIndex, 1);
        const newCode = codeLines.join("\n");
        onChange(newCode);
        // カーソルを削除後の同じ行頭に配置
        let newPos = 0;
        for (let i = 0; i < lineIndex; i++) newPos += codeLines[i]!.length + 1;
        newPos = Math.min(newPos, newCode.length);
        requestAnimationFrame(() => {
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
          updateCursorLine();
        });
      }
      // 選択ありの場合はブラウザのデフォルト動作（選択範囲のcut）に任せる
      return;
    }

    // Alt+Arrow (行移動)
    if (e.altKey && !e.metaKey && !e.ctrlKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const codeLines = code.split("\n");
      const textBefore = code.slice(0, start);
      const lineIndex = textBefore.split("\n").length - 1;
      const targetIndex = e.key === "ArrowUp" ? lineIndex - 1 : lineIndex + 1;

      if (targetIndex >= 0 && targetIndex < codeLines.length) {
        pushUndo(code);
        const colInLine = start - textBefore.lastIndexOf("\n") - 1;
        // 隣接行と入れ替え
        const temp = codeLines[targetIndex]!;
        codeLines[targetIndex] = codeLines[lineIndex]!;
        codeLines[lineIndex] = temp;
        const newCode = codeLines.join("\n");
        onChange(newCode);
        // カーソル位置を移動先の行に合わせる
        let newPos = 0;
        for (let i = 0; i < targetIndex; i++) newPos += codeLines[i]!.length + 1;
        newPos += Math.min(colInLine, codeLines[targetIndex].length);
        requestAnimationFrame(() => {
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
          updateCursorLine();
        });
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
      const newCode = `${code.slice(0, start)}  ${code.slice(end)}`;
      onChange(newCode);
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + 2;
      });
      return;
    }

    if (e.key === "{") {
      e.preventDefault();
      setCompletionItems([]);
      pushUndo(code);
      const newCode = `${code.slice(0, start)}{}${code.slice(end)}`;
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
      const newCode = `${code.slice(0, start)}""${code.slice(end)}`;
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
        const newCode = `${code.slice(0, start)}\n${indent}  \n${indent}${code.slice(end)}`;
        onChange(newCode);
        requestAnimationFrame(() => {
          const newPos = start + 1 + indent.length + 2;
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
        });
      } else if (currentLineContent.trimEnd().endsWith("{")) {
        // 行末が { → 次行はインデント + 2スペース
        const newCode = `${code.slice(0, start)}\n${indent}  ${code.slice(end)}`;
        onChange(newCode);
        requestAnimationFrame(() => {
          const newPos = start + 1 + indent.length + 2;
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
        });
      } else {
        // 通常の改行 → 現在行のインデントを引き継ぐ
        const newCode = `${code.slice(0, start)}\n${indent}${code.slice(end)}`;
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

  const highlighted = useMemo(() => code.split("\n").map(highlightLine), [code]);

  return (
    <div className="flex h-full relative">
      <div
        ref={lineCountRef}
        className="w-11 bg-bg-raised text-text-dimmed text-[12px] font-mono leading-[21px] pt-3 pr-2 text-right overflow-hidden select-none border-r border-border-subtle shrink-0"
      >
        {lines.map((_, i) => (
          <div
            key={i}
            style={{
              color: errorLines.has(i + 1) ? "#f87171" : i === cursorLine ? "#e2e8f0" : "#475569",
              fontWeight: errorLines.has(i + 1) ? 700 : 400,
              background: i === cursorLine ? "rgba(99,102,241,0.15)" : "transparent",
              borderRadius: 2,
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={highlightRef}
          aria-hidden="true"
          className="absolute inset-0 px-4 py-3 text-[13px] font-mono leading-[21px] tracking-[0.02em] whitespace-pre overflow-hidden pointer-events-none text-transparent"
        >
          {highlighted.map((tokens, i) => (
            <div key={i} className="h-[21px]">
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
          className="absolute -top-[9999px] -left-[9999px] invisible whitespace-pre text-[13px] font-mono tracking-[0.02em]"
        />
        <textarea
          ref={textareaRef}
          value={code}
          wrap="off"
          onChange={(e) => {
            pushUndo(code);
            onChange(e.target.value);
            if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
            completionTimerRef.current = setTimeout(() => updateCompletion(), 50);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorLine}
          onClick={updateCursorLine}
          onSelect={updateCursorLine}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
          onScroll={handleScroll}
          spellCheck={false}
          className="relative w-full h-full bg-transparent border-none outline-none resize-none text-[13px] font-mono leading-[21px] px-4 py-3 z-[1] tracking-[0.02em] overflow-auto"
          style={{ color: "rgba(226,232,240,0.0)", caretColor: "#818cf8", tabSize: 2 }}
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
        className="absolute bottom-2.5 right-2.5 z-5 bg-surface border border-border rounded-md text-text-muted px-2.5 py-1 cursor-pointer text-[11px] font-mono flex items-center gap-1 transition-all duration-150 hover:bg-border hover:text-text-primary"
      >
        ⟐ 整形
      </button>
    </div>
  );
});
