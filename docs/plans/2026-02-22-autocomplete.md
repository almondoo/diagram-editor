# DSL 予測変換（オートコンプリート）実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CodeEditor に DSL の予測変換（オートコンプリート）を追加する

**Architecture:** 補完コンテキスト解析と候補生成を `packages/core/src/autocomplete.ts` に配置し、ドロップダウンUIを `packages/react/src/components/AutocompleteDropdown.tsx` に配置。CodeEditor.tsx にキーハンドリングと状態管理を統合する。

**Tech Stack:** TypeScript, React, Vitest

---

### Task 1: autocomplete.ts - コンテキスト解析と候補生成（core）

**Files:**
- Create: `packages/core/src/autocomplete.ts`
- Create: `packages/core/src/__tests__/autocomplete.test.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: テストファイルを作成**

`packages/core/src/__tests__/autocomplete.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getCompletionContext, getCompletionItems } from "../autocomplete.js";

describe("getCompletionContext", () => {
  it("行頭の入力はkeywordコンテキスト", () => {
    const ctx = getCompletionContext("no", 2, "", []);
    expect(ctx).toEqual({ type: "keyword", prefix: "no" });
  });

  it("インデント付きの行頭もkeywordコンテキスト", () => {
    const ctx = getCompletionContext("  no", 4, "", []);
    expect(ctx).toEqual({ type: "keyword", prefix: "no" });
  });

  it("edge の後はnodeIdコンテキスト（from）", () => {
    const ctx = getCompletionContext("edge s", 6, "", []);
    expect(ctx).toEqual({ type: "nodeId", prefix: "s" });
  });

  it("edge from の後にオペレーター入力中はedgeOperatorコンテキスト", () => {
    const ctx = getCompletionContext("edge a1 -", 9, "", []);
    expect(ctx).toEqual({ type: "edgeOperator", prefix: "-" });
  });

  it("edge from OP の後はnodeIdコンテキスト（to）", () => {
    const ctx = getCompletionContext("edge a1 -> b", 12, "", []);
    expect(ctx).toEqual({ type: "nodeId", prefix: "b" });
  });

  it("style の後はnodeIdコンテキスト", () => {
    const ctx = getCompletionContext("style s", 7, "", []);
    expect(ctx).toEqual({ type: "nodeId", prefix: "s" });
  });

  it("{ } ブロック内のプロパティ入力はpropertyコンテキスト", () => {
    const ctx = getCompletionContext("  sh", 4, "node a1 \"test\" {", []);
    expect(ctx).toEqual({ type: "property", prefix: "sh", blockType: "node" });
  });

  it("プロパティ=の後はvalueコンテキスト", () => {
    const ctx = getCompletionContext("  shape=st", 10, "node a1 \"test\" {", []);
    expect(ctx).toEqual({ type: "value", prefix: "st", property: "shape", blockType: "node" });
  });

  it("コメント行では補完なし", () => {
    const ctx = getCompletionContext("// no", 5, "", []);
    expect(ctx).toBeNull();
  });

  it("空行では補完なし", () => {
    const ctx = getCompletionContext("", 0, "", []);
    expect(ctx).toBeNull();
  });

  it("node id \"label\" の後に { を入力済みはnullを返す", () => {
    const ctx = getCompletionContext('node a1 "test" {', 17, "", []);
    expect(ctx).toBeNull();
  });

  it("groupブロック内のnode行頭はkeywordコンテキスト", () => {
    const ctx = getCompletionContext("  no", 4, "group g1 \"test\" {", []);
    expect(ctx).toEqual({ type: "keyword", prefix: "no" });
  });
});

describe("getCompletionItems", () => {
  it("keywordコンテキストでnから始まる候補", () => {
    const items = getCompletionItems({ type: "keyword", prefix: "n" }, []);
    expect(items.map((i) => i.text)).toEqual(["node", "note"]);
  });

  it("nodeIdコンテキストで定義済みIDを候補にする", () => {
    const ids = ["server", "client", "db"];
    const items = getCompletionItems({ type: "nodeId", prefix: "s" }, ids);
    expect(items.map((i) => i.text)).toEqual(["server"]);
  });

  it("edgeOperatorコンテキストで->から始まる候補", () => {
    const items = getCompletionItems({ type: "edgeOperator", prefix: "-" }, []);
    expect(items.map((i) => i.text)).toContain("->");
    expect(items.map((i) => i.text)).toContain("--");
  });

  it("propertyコンテキストでnodeのshから始まるプロパティ", () => {
    const items = getCompletionItems({ type: "property", prefix: "sh", blockType: "node" }, []);
    expect(items.map((i) => i.text)).toEqual(["shape"]);
  });

  it("valueコンテキストでshape=の候補", () => {
    const items = getCompletionItems({ type: "value", prefix: "", property: "shape", blockType: "node" }, []);
    expect(items.map((i) => i.text)).toContain("rect");
    expect(items.map((i) => i.text)).toContain("circle");
  });

  it("プレフィックスが空のkeywordは全キーワードを返す", () => {
    const items = getCompletionItems({ type: "keyword", prefix: "" }, []);
    expect(items.map((i) => i.text)).toEqual(["node", "edge", "group", "note", "style"]);
  });

  it("valueコンテキストでanimate=の候補", () => {
    const items = getCompletionItems({ type: "value", prefix: "", property: "animate", blockType: "edge" }, []);
    expect(items.map((i) => i.text)).toEqual(["true", "false"]);
  });

  it("マッチしない場合は空配列", () => {
    const items = getCompletionItems({ type: "keyword", prefix: "xyz" }, []);
    expect(items).toEqual([]);
  });
});
```

**Step 2: テストを実行して失敗を確認**

Run: `docker compose exec app pnpm --filter diagram-dsl-core test`
Expected: FAIL - `../autocomplete.js` が見つからない

**Step 3: autocomplete.ts を実装**

`packages/core/src/autocomplete.ts`:

```typescript
/** 補完コンテキストの型 */
export type CompletionContext =
  | { type: "keyword"; prefix: string }
  | { type: "nodeId"; prefix: string }
  | { type: "edgeOperator"; prefix: string }
  | { type: "property"; prefix: string; blockType: string }
  | { type: "value"; prefix: string; property: string; blockType: string };

/** 補完候補 */
export interface CompletionItem {
  text: string;
  kind: "keyword" | "property" | "value" | "id" | "operator";
  suffix?: string; // 挿入時に追加する文字（例: " ", "="）
}

const KEYWORDS = ["node", "edge", "group", "note", "style"];

const EDGE_OPERATORS = ["->", "<-", "<->", "-->", "<--", "<-->", "--"];

const PROPERTY_MAP: Record<string, string[]> = {
  node: ["shape", "color", "text", "border", "borderWidth", "icon", "fontSize", "opacity", "dashed", "x", "y", "w", "h"],
  edge: ["label", "color", "animate", "thickness", "curve"],
  group: ["color", "x", "y", "w", "h"],
  note: ["color", "x", "y"],
  style: ["color", "shape", "border", "text"],
};

const SHAPES = ["rect", "stadium", "diamond", "ellipse", "circle", "cylinder", "hexagon", "parallelogram", "trapezoid"];

const BOOLEANS = ["true", "false"];
const CURVES = ["smooth", "straight"];

const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#10b981",
  "#06b6d4", "#0ea5e9", "#3b82f6",
];

const VALUE_MAP: Record<string, string[]> = {
  shape: SHAPES,
  animate: BOOLEANS,
  dashed: BOOLEANS,
  curve: CURVES,
  color: COLOR_PRESETS,
  text: COLOR_PRESETS,
  border: COLOR_PRESETS,
};

const EDGE_OP_RE = /^<-->|^<->|^<--|^-->|^<-|^->|^--/;

/**
 * カーソル行とカーソル位置からコンテキストを判定する。
 * @param line カーソルがある行のテキスト
 * @param col カーソルの行内オフセット（0-indexed）
 * @param blockHeaderLine このブロックのヘッダー行（{ } ブロック内にいる場合）。空文字 = トップレベル
 * @param allLines 全体の行テキスト配列（ブロック検出用）
 */
export function getCompletionContext(
  line: string,
  col: number,
  blockHeaderLine: string,
  allLines: string[],
): CompletionContext | null {
  const beforeCursor = line.slice(0, col);
  const trimmedBefore = beforeCursor.trimStart();

  // コメント行 → 補完なし
  if (trimmedBefore.startsWith("//") || trimmedBefore.startsWith("#")) return null;

  // 空入力 → 補完なし
  if (trimmedBefore.length === 0) return null;

  // ブロック内にいるか判定
  const inBlock = blockHeaderLine.length > 0;
  const blockType = inBlock ? (blockHeaderLine.match(/^\s*(node|edge|group|note|style)\b/)?.[1] ?? "") : "";

  // ブロック内: プロパティ or 値 or グループ内のキーワード
  if (inBlock) {
    // グループブロック内で行頭にキーワード入力 → keyword コンテキスト
    if (blockType === "group") {
      const kwMatch = trimmedBefore.match(/^(node|edge|group|note|style)\b/);
      if (!kwMatch) {
        // キーワードの途中の可能性
        const partialKw = trimmedBefore.match(/^([a-z]+)$/);
        if (partialKw && KEYWORDS.some((k) => k.startsWith(partialKw[1]))) {
          return { type: "keyword", prefix: partialKw[1] };
        }
      }
    }

    // プロパティ=値 の値部分
    const valueMatch = trimmedBefore.match(/(\w+)=(\S*)$/);
    if (valueMatch) {
      return { type: "value", prefix: valueMatch[2], property: valueMatch[1], blockType };
    }

    // プロパティ名の途中
    const propMatch = trimmedBefore.match(/(?:^|\s)(\w*)$/);
    if (propMatch) {
      return { type: "property", prefix: propMatch[1], blockType };
    }

    return null;
  }

  // トップレベル: edge行の解析
  const edgeLineMatch = trimmedBefore.match(/^edge\s+/);
  if (edgeLineMatch) {
    const afterEdge = trimmedBefore.slice(edgeLineMatch[0].length);

    // "edge " の直後 → nodeId (from)
    if (!afterEdge || /^\S*$/.test(afterEdge)) {
      return { type: "nodeId", prefix: afterEdge };
    }

    // "edge from " の後
    const fromMatch = afterEdge.match(/^(\S+)\s+/);
    if (fromMatch) {
      const afterFrom = afterEdge.slice(fromMatch[0].length);

      // オペレーターの途中
      if (!afterFrom.includes(" ")) {
        // 完全なオペレーター + スペース があるか
        const opMatch = afterFrom.match(EDGE_OP_RE);
        if (opMatch && opMatch[0] === afterFrom) {
          // オペレーターが完了しているがスペースがない
          return { type: "edgeOperator", prefix: afterFrom };
        }
        if (!opMatch || opMatch[0].length < afterFrom.length) {
          return { type: "edgeOperator", prefix: afterFrom };
        }
      }

      // "edge from OP " の後 → nodeId (to)
      const opMatch = afterFrom.match(/^(?:<-->|<->|<--|-->|<-|->|--)\s+/);
      if (opMatch) {
        const afterOp = afterFrom.slice(opMatch[0].length);
        return { type: "nodeId", prefix: afterOp };
      }
    }

    return null;
  }

  // style行の解析
  const styleLineMatch = trimmedBefore.match(/^style\s+/);
  if (styleLineMatch) {
    const afterStyle = trimmedBefore.slice(styleLineMatch[0].length);
    if (/^\S*$/.test(afterStyle)) {
      return { type: "nodeId", prefix: afterStyle };
    }
    return null;
  }

  // 完成済みの行（node id "label" { ... のような）→ 補完なし
  const completedLineMatch = trimmedBefore.match(/^(node|edge|group|note|style)\b.*\{/);
  if (completedLineMatch) return null;

  // トップレベルのキーワード入力
  const partialKw = trimmedBefore.match(/^([a-z]+)$/);
  if (partialKw) {
    return { type: "keyword", prefix: partialKw[1] };
  }

  return null;
}

/**
 * コンテキストに基づいて補完候補を生成する。
 */
export function getCompletionItems(
  context: CompletionContext,
  existingIds: string[],
): CompletionItem[] {
  const prefix = context.prefix.toLowerCase();

  switch (context.type) {
    case "keyword":
      return KEYWORDS
        .filter((k) => k.startsWith(prefix))
        .map((k) => ({ text: k, kind: "keyword" as const, suffix: " " }));

    case "nodeId":
      return existingIds
        .filter((id) => id.toLowerCase().startsWith(prefix))
        .map((id) => ({ text: id, kind: "id" as const, suffix: " " }));

    case "edgeOperator":
      return EDGE_OPERATORS
        .filter((op) => op.startsWith(context.prefix))
        .map((op) => ({ text: op, kind: "operator" as const, suffix: " " }));

    case "property": {
      const props = PROPERTY_MAP[context.blockType] ?? [];
      return props
        .filter((p) => p.startsWith(prefix))
        .map((p) => ({ text: p, kind: "property" as const, suffix: "=" }));
    }

    case "value": {
      const values = VALUE_MAP[context.property] ?? [];
      return values
        .filter((v) => v.toLowerCase().startsWith(prefix))
        .map((v) => ({ text: v, kind: "value" as const }));
    }
  }
}
```

**Step 4: core/index.ts にエクスポートを追加**

`packages/core/src/index.ts` に以下を追記:

```typescript
export { getCompletionContext, getCompletionItems } from "./autocomplete.js";
export type { CompletionContext, CompletionItem } from "./autocomplete.js";
```

**Step 5: テストを実行して全パスを確認**

Run: `docker compose exec app pnpm --filter diagram-dsl-core test`
Expected: PASS

**Step 6: typecheck + build**

Run: `docker compose exec app pnpm --filter diagram-dsl-core typecheck && docker compose exec app pnpm --filter diagram-dsl-core build`
Expected: PASS

**Step 7: コミット**

```bash
git add packages/core/src/autocomplete.ts packages/core/src/__tests__/autocomplete.test.ts packages/core/src/index.ts
git commit -m "feat: DSL予測変換のコンテキスト解析と候補生成を追加"
```

---

### Task 2: AutocompleteDropdown.tsx - ドロップダウンUIコンポーネント（react）

**Files:**
- Create: `packages/react/src/components/AutocompleteDropdown.tsx`

**Step 1: AutocompleteDropdown.tsx を作成**

`packages/react/src/components/AutocompleteDropdown.tsx`:

```tsx
import { useEffect, useRef } from "react";
import type { CompletionItem } from "diagram-dsl-core";

interface AutocompleteDropdownProps {
  items: CompletionItem[];
  selectedIndex: number;
  position: { top: number; left: number };
  onSelect: (item: CompletionItem) => void;
}

export function AutocompleteDropdown({ items, selectedIndex, position, onSelect }: AutocompleteDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const selected = el.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (items.length === 0) return null;

  const kindLabel: Record<string, string> = {
    keyword: "KW",
    property: "P",
    value: "V",
    id: "ID",
    operator: "OP",
  };

  const kindColor: Record<string, string> = {
    keyword: "#c084fc",
    property: "#60a5fa",
    value: "#34d399",
    id: "#fbbf24",
    operator: "#f97316",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 100,
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 6,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        maxHeight: 8 * 28 + 8,
        overflowY: "auto",
        padding: "4px 0",
        minWidth: 160,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
      }}
      ref={listRef}
    >
      {items.map((item, i) => (
        <div
          key={`${item.text}-${i}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          style={{
            padding: "4px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: i === selectedIndex ? "#334155" : "transparent",
            color: i === selectedIndex ? "#f1f5f9" : "#cbd5e1",
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: kindColor[item.kind] ?? "#94a3b8",
              background: "rgba(0,0,0,0.3)",
              padding: "1px 4px",
              borderRadius: 3,
              minWidth: 20,
              textAlign: "center",
            }}
          >
            {kindLabel[item.kind] ?? ""}
          </span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: typecheck**

Run: `docker compose exec app pnpm --filter diagram-dsl-react typecheck`
Expected: PASS

**Step 3: コミット**

```bash
git add packages/react/src/components/AutocompleteDropdown.tsx
git commit -m "feat: オートコンプリートのドロップダウンUIコンポーネントを追加"
```

---

### Task 3: CodeEditor.tsx - 補完機能を統合

**Files:**
- Modify: `packages/react/src/components/CodeEditor.tsx`

**Step 1: CodeEditor に補完機能を統合**

`CodeEditor.tsx` を以下のように変更:

1. **import追加**: `getCompletionContext`, `getCompletionItems`, `CompletionItem` を `diagram-dsl-core` から、`AutocompleteDropdown` をローカルからインポート。`useState`, `useCallback` を追加。
2. **props拡張**: `existingIds: string[]` を追加（定義済みのノード/グループ/ノートID）。
3. **補完state追加**: `completionItems`, `selectedIndex`, `completionPos`, `showCompletion`
4. **カーソル位置計算**: 不可視のミラー要素を使ってカーソルのピクセル座標を取得
5. **handleKeyDown修正**: 補完表示中は ArrowUp/ArrowDown/Tab/Enter/Escape をインターセプト
6. **handleInput追加**: 入力のたびに補完コンテキストを計算
7. **AutocompleteDropdown配置**: textarea の親要素内に配置

具体的なコード変更:

**imports を変更:**
```typescript
import { useRef, useMemo, useState, useCallback, memo } from "react";
import type { ParseError, CompletionItem } from "diagram-dsl-core";
import { highlightLine, getCompletionContext, getCompletionItems } from "diagram-dsl-core";
import { AutocompleteDropdown } from "./AutocompleteDropdown.js";
```

**interface を変更:**
```typescript
interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  errors: ParseError[];
  onFormat: () => void;
  existingIds?: string[];
}
```

**コンポーネントの先頭に補完stateを追加:**
```typescript
export const CodeEditor = memo(function CodeEditor({ code, onChange, errors, onFormat, existingIds = [] }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineCountRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const lines = code.split("\n");
  const errorLines = useMemo(() => new Set(errors.map((e) => e.line)), [errors]);

  // 補完state
  const [completionItems, setCompletionItems] = useState<CompletionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [completionPos, setCompletionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const showCompletion = completionItems.length > 0;
```

**カーソル位置を計算する関数を追加:**
```typescript
  const measureCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror) return { top: 0, left: 0 };

    const textBeforeCursor = code.slice(0, textarea.selectionStart);
    const lines = textBeforeCursor.split("\n");
    const currentLineIndex = lines.length - 1;
    const currentCol = lines[currentLineIndex].length;

    // 行の高さとパディングから計算
    const lineHeight = 21;
    const paddingTop = 12;
    const paddingLeft = 16;

    // ミラー要素を使ってテキスト幅を計測
    mirror.textContent = lines[currentLineIndex].slice(0, currentCol);
    const textWidth = mirror.scrollWidth;

    const top = paddingTop + (currentLineIndex + 1) * lineHeight - textarea.scrollTop;
    const left = paddingLeft + textWidth - textarea.scrollLeft;

    return { top, left };
  }, [code]);
```

**補完更新関数を追加:**
```typescript
  const updateCompletion = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const textBeforeCursor = code.slice(0, pos);
    const allLines = code.split("\n");
    const linesBeforeCursor = textBeforeCursor.split("\n");
    const currentLine = linesBeforeCursor[linesBeforeCursor.length - 1];
    const col = currentLine.length;
    const currentLineIndex = linesBeforeCursor.length - 1;

    // ブロックヘッダー行を検出（現在の行がブロック内かどうか）
    let blockHeaderLine = "";
    let depth = 0;
    for (let i = currentLineIndex - 1; i >= 0; i--) {
      const l = allLines[i];
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

    const items = getCompletionItems(context, existingIds);
    setCompletionItems(items);
    setSelectedIndex(0);
    if (items.length > 0) {
      setCompletionPos(measureCursorPosition());
    }
  }, [code, existingIds, measureCursorPosition]);
```

**handleKeyDown を修正（補完インターセプト追加）:**

既存の `handleKeyDown` の先頭（Tab判定の前）に以下を追加:

```typescript
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
        applyCompletion(completionItems[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setCompletionItems([]);
        return;
      }
    }
```

**補完適用関数を追加:**
```typescript
  const applyCompletion = useCallback((item: CompletionItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const textBeforeCursor = code.slice(0, pos);
    const linesBeforeCursor = textBeforeCursor.split("\n");
    const currentLine = linesBeforeCursor[linesBeforeCursor.length - 1];

    // プレフィックスの長さを計算
    // 現在の行の末尾から英数字/記号を遡る
    const prefixMatch = currentLine.match(/[\w#<>-]*$/);
    const prefixLen = prefixMatch ? prefixMatch[0].length : 0;

    const insertText = item.text + (item.suffix ?? "");
    const newCode = code.slice(0, pos - prefixLen) + insertText + code.slice(pos);
    onChange(newCode);

    const newPos = pos - prefixLen + insertText.length;
    requestAnimationFrame(() => {
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
    });

    setCompletionItems([]);
  }, [code, onChange]);
```

**onChange ハンドラを修正して補完更新を追加:**

textarea の onChange を以下に変更:
```tsx
onChange={(e) => {
  onChange(e.target.value);
  requestAnimationFrame(() => updateCompletion());
}}
```

**ミラー要素を追加（テキスト幅計測用）:**

textarea の直前に:
```tsx
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
```

**AutocompleteDropdown を追加:**

textarea の直後（同じ親要素内）に:
```tsx
{showCompletion && (
  <AutocompleteDropdown
    items={completionItems}
    selectedIndex={selectedIndex}
    position={completionPos}
    onSelect={applyCompletion}
  />
)}
```

**Step 2: typecheck + build**

Run: `docker compose exec app pnpm --filter diagram-dsl-react typecheck && docker compose exec app pnpm --filter diagram-dsl-react build`
Expected: PASS

**Step 3: コミット**

```bash
git add packages/react/src/components/CodeEditor.tsx
git commit -m "feat: CodeEditorにオートコンプリート機能を統合"
```

---

### Task 4: DiagramEditor.tsx - existingIds を CodeEditor に渡す

**Files:**
- Modify: `packages/react/src/DiagramEditor.tsx`

**Step 1: existingIds を計算して CodeEditor に渡す**

`DiagramEditor.tsx` の `renderCodePanel` 内の `<CodeEditor>` 呼び出しを修正。

`renderCodePanel` 関数の直前に `existingIds` の計算を追加:

```typescript
const existingIds = useMemo(() => {
  return [
    ...parsed.nodes.map((n) => n.id),
    ...parsed.groups.map((g) => g.id),
    ...parsed.notes.map((n) => n.id),
  ];
}, [parsed.nodes, parsed.groups, parsed.notes]);
```

`<CodeEditor>` の呼び出しを修正:

```tsx
<CodeEditor code={code} onChange={setCode} errors={parsed.errors} onFormat={formatCode} existingIds={existingIds} />
```

**Step 2: typecheck + build**

Run: `docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r build`
Expected: PASS

**Step 3: コミット**

```bash
git add packages/react/src/DiagramEditor.tsx
git commit -m "feat: DiagramEditorからCodeEditorにexistingIdsを渡す"
```

---

### Task 5: ブラウザでの動作確認

**Step 1: core テスト実行**

Run: `docker compose exec app pnpm --filter diagram-dsl-core test`
Expected: ALL PASS

**Step 2: 全体 typecheck + build**

Run: `docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r build`
Expected: PASS

**Step 3: ブラウザで動作確認**

http://localhost:5173 でエディタを開き、以下を確認:
- `n` を入力 → `node`, `note` が候補に出る
- `edge ` と入力 → 定義済みノードIDが候補に出る
- `edge a1 ` と入力 → `->`, `<-` 等のオペレーターが候補に出る
- `{ }` ブロック内で `sh` と入力 → `shape` が候補に出る
- `shape=` の後に → `rect`, `circle` 等が候補に出る
- 上下矢印で候補選択 → Tab/Enter で確定
- Escape で閉じる

---
