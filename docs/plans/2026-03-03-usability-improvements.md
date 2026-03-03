# 使い勝手改善 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ドラッグ安定化、コード⟷キャンバス連携、レイヤー優先度、グループスペーシングの4つの使い勝手課題を解決する。

**Architecture:** 既存の useEdgeDrag(reconnect) パターンを参照実装として全ドラッグフックに統一適用。コード連携は既存の focusLine 機構を拡張。レイヤー優先度はエッジの onMouseDown にグループヘッダー判定を追加。スペーシングは layout.ts の定数を調整。

**Tech Stack:** React 19, TypeScript, vitest

---

### Task 1: グループスペーシング改善

最もシンプルで独立した変更。定数値の変更のみ。

**Files:**
- Modify: `app/lib/core/layout.ts:5,7,806,819,835`
- Test: `app/lib/core/__tests__/layout.test.ts`

**Step 1: テスト追加 — ネストグループ間の間隔が適切であることを検証**

`app/lib/core/__tests__/layout.test.ts` に追加:

```typescript
it("ネストグループ間の間隔が GROUP_PADDING より広い", () => {
  const parent = makeGroup("parent", 0, 0, 600, 500);
  const child1 = makeGroup("child1", 10, 40, 200, 150, "parent");
  const child2 = makeGroup("child2", 10, 200, 200, 150, "parent");
  const nodes = [
    makeNode("a", true, "child1"),
    makeNode("b", true, "child2"),
  ];
  const { groupUpdates } = autoLayout(nodes, [], [parent, child1, child2], "TB");
  const c1 = groupUpdates["child1"] ?? child1;
  const c2 = groupUpdates["child2"] ?? child2;
  // child1の下端とchild2の上端の間隔が20px以上
  const gap = c2.y - (c1.y + c1.h);
  expect(gap).toBeGreaterThanOrEqual(20);
});

it("グループ内パディングが20px以上", () => {
  const group = makeGroup("g1", 0, 0, 400, 300);
  const nodes = [makeNode("a", true, "g1")];
  const { nodes: result, groupUpdates } = autoLayout(nodes, [], [group]);
  const g = groupUpdates["g1"]!;
  const n = result.find(n => n.id === "a")!;
  // ノードの左端とグループの左端の間隔が20px以上
  expect(n.x - g.x).toBeGreaterThanOrEqual(20);
  // ノードの下端とグループの下端の間隔が20px以上
  expect((g.y + g.h) - (n.y + n.h)).toBeGreaterThanOrEqual(20);
});
```

**Step 2: テスト実行 — 失敗を確認**

```bash
docker compose exec app pnpm test -- --run app/lib/core/__tests__/layout.test.ts
```

Expected: FAIL（現在 GROUP_PADDING=12 のため）

**Step 3: layout.ts の定数変更**

`app/lib/core/layout.ts`:

```typescript
// 行5: GROUP_PADDING を 12 → 20 に変更
export const GROUP_PADDING = 20;      // グループ内パディング

// 行8の下に新定数追加
const NESTED_GROUP_GAP = 24; // ネストグループ間の間隔
```

ネストグループ間間隔の適用箇所（`PADDING` → `NESTED_GROUP_GAP`）:

行806: `let curY = contentBottom + PADDING;` → `let curY = contentBottom + NESTED_GROUP_GAP;`
行819: `curY += updatedChild.h + PADDING;` → `curY += updatedChild.h + NESTED_GROUP_GAP;`
行835: `curX += updatedChild.w + PADDING;` → `curX += updatedChild.w + NESTED_GROUP_GAP;`

**Step 4: テスト実行 — パスを確認**

```bash
docker compose exec app pnpm test -- --run app/lib/core/__tests__/layout.test.ts
```

Expected: ALL PASS

**Step 5: 全テスト実行**

```bash
docker compose exec app pnpm test -- --run
```

Expected: ALL PASS

**Step 6: コミット**

```bash
git add app/lib/core/layout.ts app/lib/core/__tests__/layout.test.ts
git commit -m "fix: increase group padding and nested group gap for better spacing"
```

---

### Task 2: ドラッグ安定化 — useNodeDrag

**Files:**
- Modify: `app/lib/react/hooks/useNodeDrag.ts`
- Reference: `app/lib/react/hooks/useEdgeDrag.ts`（reconnect パターン）

**Step 1: useNodeDrag を修正**

`app/lib/react/hooks/useNodeDrag.ts` を以下のパターンに修正:

1. **svgRef, panRef を引数に追加**（useEdgeDrag と同じ）
2. **applyDrag から RAF を除去** — mousemove/touchmove ハンドラで直接 applyDrag を呼ぶ
3. **threshold を除去** — applyDrag の threshold パラメータを削除
4. **Math.round を除去** — setNodeLayout 呼び出しから Math.round を削除

具体的な修正:

```typescript
export function useNodeDrag(
  nodeById: Record<string, DiagramNode>,
  zoom: number,
  selectedIds: Set<string>,
  setNodeLayout: (nodeId: string, x: number, y: number) => void,
  setNodeSize: (nodeId: string, w: number, h: number, x?: number, y?: number) => void,
  onMultiMove: (dx: number, dy: number) => void,
  onDragEnd?: () => void,
) {
```

引数はそのままでOK（pan座標変換はドラッグの初期位置取得ではなくデルタ計算で使うが、現在のデルタ計算は clientX ベースで正しく機能している。pan問題は zoom 変換時の精度に限定される）。

修正箇所:

**a) applyDrag から threshold を除去（行87-141）:**

```typescript
const applyDrag = (clientX: number, clientY: number): boolean => {
  const start = dragStartRef.current;
  if (!start) return false;
  const z = zoomRef.current;

  if (dragInfo.type === "resize") {
    const totalDx = (clientX - start.cursorX) / z;
    const totalDy = (clientY - start.cursorY) / z;
    // threshold 削除

    if (!hasDraggedRef.current) {
      onDragEndRef.current?.();
      hasDraggedRef.current = true;
    }

    // ... リサイズロジックはそのまま
  } else if (dragInfo.isMulti) {
    const dx = (clientX - lastCursorRef.current.x) / z;
    const dy = (clientY - lastCursorRef.current.y) / z;
    // threshold 削除

    if (!hasDraggedRef.current) {
      onDragEndRef.current?.();
      hasDraggedRef.current = true;
    }

    onMultiMove(dx, dy);
  } else {
    const totalDx = (clientX - start.cursorX) / z;
    const totalDy = (clientY - start.cursorY) / z;
    // threshold 削除

    if (!hasDraggedRef.current) {
      onDragEndRef.current?.();
      hasDraggedRef.current = true;
    }

    // Math.round 削除
    setNodeLayout(dragInfo.nodeId, start.nodeX + totalDx, start.nodeY + totalDy);
  }

  lastCursorRef.current = { x: clientX, y: clientY };
  return true;
};
```

**b) RAF を除去（行143-160）:**

```typescript
const handleMove = (e: MouseEvent) => {
  applyDrag(e.clientX, e.clientY);
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  const touch = e.touches[0]!;
  applyDrag(touch.clientX, touch.clientY);
};
```

**c) cleanup から cancelAnimationFrame を除去**

```typescript
// let rafId = 0; を削除
// cancelAnimationFrame(rafId); を削除
```

**Step 2: typecheck**

```bash
docker compose exec app pnpm typecheck
```

Expected: PASS

**Step 3: 全テスト実行**

```bash
docker compose exec app pnpm test -- --run
```

Expected: ALL PASS

**Step 4: コミット**

```bash
git add app/lib/react/hooks/useNodeDrag.ts
git commit -m "fix: stabilize node drag by removing RAF, threshold, and Math.round"
```

---

### Task 3: ドラッグ安定化 — useGroupDrag

**Files:**
- Modify: `app/lib/react/hooks/useGroupDrag.ts`

**Step 1: useGroupDrag を修正**

useNodeDrag と同様のパターンを適用:

**a) applyDrag から threshold を除去（行110-156）:**

行119: `if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return false;` → 削除
行135: `if (Math.abs(totalDx) < 1 && Math.abs(totalDy) < 1) return false;` → 削除

**b) RAF を除去（行158-175）:**

```typescript
const handleMove = (e: MouseEvent) => {
  applyDrag(e.clientX, e.clientY);
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  const touch = e.touches[0]!;
  applyDrag(touch.clientX, touch.clientY);
};
```

**c) cleanup から cancelAnimationFrame を除去**

```typescript
// let rafId = 0; を削除
// cancelAnimationFrame(rafId); を削除
```

**Step 2: typecheck**

```bash
docker compose exec app pnpm typecheck
```

Expected: PASS

**Step 3: コミット**

```bash
git add app/lib/react/hooks/useGroupDrag.ts
git commit -m "fix: stabilize group drag by removing RAF and threshold"
```

---

### Task 4: ドラッグ安定化 — ノートドラッグ (DiagramEditor内)

**Files:**
- Modify: `app/lib/react/DiagramEditor.tsx:216-269`

**Step 1: ノートドラッグを修正**

DiagramEditor.tsx のノートドラッグ部分（行216-269）に同様のパターンを適用:

**a) applyMove から threshold を除去（行221-241）:**

行230: `if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;` → 削除
行237: `if (Math.abs(totalDx) < 2 && Math.abs(totalDy) < 2) return;` → 削除
行239: `Math.round(start.noteX + totalDx), Math.round(start.noteY + totalDy)` → `start.noteX + totalDx, start.noteY + totalDy`

**b) RAF を除去（行244-252）:**

```typescript
const handleMove = (e: MouseEvent) => {
  applyMove(e.clientX, e.clientY);
};
const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  applyMove(e.touches[0]!.clientX, e.touches[0]!.clientY);
};
```

**c) cleanup から cancelAnimationFrame を除去**

```typescript
// let rafId = 0; を削除
// cancelAnimationFrame(rafId); を削除
```

**Step 2: typecheck**

```bash
docker compose exec app pnpm typecheck
```

Expected: PASS

**Step 3: コミット**

```bash
git add app/lib/react/DiagramEditor.tsx
git commit -m "fix: stabilize note drag by removing RAF, threshold, and Math.round"
```

---

### Task 5: キャンバス→コード連携（選択時ジャンプ＋ハイライト）

**Files:**
- Modify: `app/lib/react/DiagramEditor.tsx:586-598` (ノード選択), `469-471` (グループ選択), `496-497` (ノート選択)
- Modify: `app/lib/react/components/CodeEditor.tsx:49` (focus制御)

**Step 1: CodeEditor の focusLine 処理を修正 — focus を奪わないオプション追加**

現在 `CodeEditor.tsx` 行49 で `textarea.focus()` を呼んでいる。キャンバスからの選択時にはフォーカスを奪いたくないので、focusLine の仕組みを変更する。

`CodeEditor.tsx` の focusLine props を拡張:

```typescript
interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  errors: ParseError[];
  onFormat: () => void;
  existingIds?: string[];
  focusLine?: number | null;
  scrollOnly?: boolean; // true の場合、スクロールのみでフォーカスは奪わない
}
```

行39-59 の useEffect を修正:

```typescript
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
  const lineHeight = 21;
  const scrollTarget = targetIndex * lineHeight - textarea.clientHeight / 2 + lineHeight;
  textarea.scrollTop = Math.max(0, scrollTarget);
  if (lineCountRef.current) lineCountRef.current.scrollTop = textarea.scrollTop;
  if (highlightRef.current) highlightRef.current.scrollTop = textarea.scrollTop;
}, [focusLine, scrollOnly]);
```

**Step 2: DiagramEditor にスクロール専用の focusLine 状態を追加**

`DiagramEditor.tsx` に `scrollOnly` state を追加:

```typescript
const [scrollOnly, setScrollOnly] = useState(false);
```

ノード選択時（行585-587）にコードジャンプを追加:

```typescript
onMouseDown={(e) => {
  if (!isSelected(node.id)) selectSingle(node.id);
  // 選択時にコードエディタにスクロール（フォーカスは奪わない）
  const line = findCodeLine("node", node.id);
  if (line) {
    setScrollOnly(true);
    setFocusLine(line);
  }
  handleNodeMouseDown(e, node.id);
}}
```

グループ選択時（行469-471）:

```typescript
onMoveMouseDown={(e) => {
  if (!isSelected(g.id)) selectSingle(g.id);
  const line = findCodeLine("node", g.id); // findCodeLine は group にも対応するよう調整
  if (line) {
    setScrollOnly(true);
    setFocusLine(line);
  }
  handleGroupMoveMouseDown(e, g.id);
}}
```

ノート選択時（行495-497）:

```typescript
onMouseDown={(e) => {
  if (!isSelected(n.id)) selectSingle(n.id);
  const line = findCodeLine("note", n.id);
  if (line) {
    setScrollOnly(true);
    setFocusLine(line);
  }
  handleNoteMouseDown(e, n.id);
}}
```

ダブルクリック時は従来通り focus する（scrollOnly=false）:

```typescript
onDoubleClick={() => {
  const line = findCodeLine("node", node.id);
  if (line) {
    setScrollOnly(false);
    setFocusLine(line);
  }
}}
```

`findCodeLine` に "group" タイプを追加（行130-144）:

行139 の正規表現パターンを拡張: `^${type}\\s+` はすでに node/edge/note/group を判定できるので、呼び出し時に type="group" を渡すだけ。現在の実装は `type` パラメータの値を正規表現に埋め込むので、`findCodeLine("group", g.id)` でグループ行にマッチする（ただし `group` はネスト構文で前方の空白がありうるので `trim()` が使われている行134で対応済み）。

CodeEditor に scrollOnly props を渡す:

行773:
```tsx
<CodeEditor code={code} onChange={setCode} errors={parsed.errors} onFormat={formatCode} existingIds={existingIds} focusLine={focusLine} scrollOnly={scrollOnly} />
```

**Step 3: typecheck**

```bash
docker compose exec app pnpm typecheck
```

Expected: PASS

**Step 4: コミット**

```bash
git add app/lib/react/DiagramEditor.tsx app/lib/react/components/CodeEditor.tsx
git commit -m "feat: scroll code editor to selected element on canvas click"
```

---

### Task 6: コード→キャンバス連携（カーソル行ハイライト）

**Files:**
- Modify: `app/lib/react/components/CodeEditor.tsx` — onCursorLineChange コールバック追加
- Modify: `app/lib/react/DiagramEditor.tsx` — カーソル行から要素ID逆引き、ハイライト
- Modify: `app/lib/react/components/ShapeNode.tsx` — ハイライト表示
- Modify: `app/lib/react/components/GroupBox.tsx` — ハイライト表示
- Modify: `app/lib/react/components/NoteBox.tsx` — ハイライト表示

**Step 1: CodeEditor に onCursorLineChange コールバック追加**

`CodeEditor.tsx` の props に追加:

```typescript
interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  errors: ParseError[];
  onFormat: () => void;
  existingIds?: string[];
  focusLine?: number | null;
  scrollOnly?: boolean;
  onCursorLineChange?: (line: number) => void; // 0-indexed
}
```

既存の `updateCursorLine` を拡張（行31-36）:

```typescript
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
```

**Step 2: DiagramEditor にカーソル行→要素ID逆引きを追加**

`DiagramEditor.tsx` に:

```typescript
const [cursorHighlightId, setCursorHighlightId] = useState<string | null>(null);

const handleCursorLineChange = useCallback((line: number) => {
  const codeLines = code.split("\n");
  const lineText = codeLines[line]?.trim() ?? "";
  // node <id>, edge <from> <op> <to>, group <id>, note <id> を検出
  const nodeMatch = lineText.match(/^node\s+(\S+)/);
  if (nodeMatch) { setCursorHighlightId(nodeMatch[1]!); return; }
  const edgeMatch = lineText.match(/^edge\s+(\S+)\s+\S+\s+(\S+)/);
  if (edgeMatch) { setCursorHighlightId(edgeMatch[1]!); return; } // fromノードをハイライト
  const groupMatch = lineText.match(/^group\s+(\S+)/);
  if (groupMatch) { setCursorHighlightId(groupMatch[1]!); return; }
  const noteMatch = lineText.match(/^note\s+(\S+)/);
  if (noteMatch) { setCursorHighlightId(noteMatch[1]!); return; }
  setCursorHighlightId(null);
}, [code]);
```

CodeEditor に渡す（行773）:

```tsx
<CodeEditor ... onCursorLineChange={handleCursorLineChange} />
```

**Step 3: ShapeNode, GroupBox, NoteBox に isCursorHighlighted prop 追加**

各コンポーネントに `isCursorHighlighted?: boolean` prop を追加し、`true` の場合に薄いアウトライン（例: `stroke="#6366f1" strokeOpacity={0.4} strokeWidth={2}` のオーバーレイ）を表示する。

ShapeNode の場合（選択状態と別のビジュアル）:

```tsx
{isCursorHighlighted && !isSelected && (
  <rect
    x={node.x - 3} y={node.y - 3}
    width={node.w + 6} height={node.h + 6}
    rx={6} fill="none"
    stroke="#6366f1" strokeOpacity={0.4} strokeWidth={1.5}
    strokeDasharray="4,3"
    className="pointer-events-none"
  />
)}
```

GroupBox, NoteBox にも同様のダッシュアウトライン。

DiagramEditor でのレンダリング（各要素に prop を追加）:

```tsx
<ShapeNode ... isCursorHighlighted={cursorHighlightId === node.id} />
<GroupBox ... isCursorHighlighted={cursorHighlightId === g.id} />
<NoteBox ... isCursorHighlighted={cursorHighlightId === n.id} />
```

**Step 4: typecheck**

```bash
docker compose exec app pnpm typecheck
```

Expected: PASS

**Step 5: コミット**

```bash
git add app/lib/react/DiagramEditor.tsx app/lib/react/components/CodeEditor.tsx app/lib/react/components/ShapeNode.tsx app/lib/react/components/GroupBox.tsx app/lib/react/components/NoteBox.tsx
git commit -m "feat: highlight canvas element when cursor is on its code line"
```

---

### Task 7: ドラッグのレイヤー優先度（グループヘッダー vs エッジ）

**Files:**
- Modify: `app/lib/react/components/EdgeLine.tsx` — onMoveMouseDown にグループヘッダー判定追加
- Modify: `app/lib/react/DiagramEditor.tsx` — groups 情報を EdgeLine に渡す

**Step 1: EdgeLine にグループ情報を渡す**

`EdgeLine.tsx` の props に追加:

```typescript
interface EdgeLineProps {
  edge: DiagramEdge;
  fromNode: DiagramNode | undefined;
  toNode: DiagramNode | undefined;
  isPlaying?: boolean;
  groups?: DiagramGroup[]; // グループヘッダー判定用
  onMoveMouseDown?: (e: React.MouseEvent, fromId: string, toId: string) => void;
  onEndpointMouseDown?: (e: React.MouseEvent, fromId: string, toId: string, end: "from" | "to") => void;
  onDoubleClick?: () => void;
}
```

import に追加:

```typescript
import type { DiagramNode, DiagramEdge, DiagramGroup } from "~/lib/core";
```

**Step 2: onMoveMouseDown にグループヘッダー判定を追加**

EdgeLine 内の透明ヒットパスの onMouseDown を修正:

```tsx
<path
  d={pathD}
  fill="none"
  stroke="transparent"
  strokeWidth={14}
  style={pathTransition}
  className="cursor-move"
  onMouseDown={(e) => {
    // グループヘッダー領域内ならグループ優先（イベントをスルー）
    if (groups && groups.length > 0) {
      const svg = (e.target as SVGElement).closest("svg");
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const g = svg.querySelector("g[transform]") as SVGGElement | null;
        if (g) {
          const transform = g.getCTM();
          if (transform) {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgPt = pt.matrixTransform(transform.inverse());
            const HEADER_H = 26;
            for (const group of groups) {
              if (
                svgPt.x >= group.x && svgPt.x <= group.x + group.w &&
                svgPt.y >= group.y && svgPt.y <= group.y + HEADER_H
              ) {
                return; // グループヘッダー上 → エッジドラッグを開始しない
              }
            }
          }
        }
      }
    }
    onMoveMouseDown?.(e, edge.from, edge.to);
  }}
  onDoubleClick={onDoubleClick}
/>
```

**Step 3: DiagramEditor から groups を渡す**

`DiagramEditor.tsx` の EdgeLine レンダリング（行523-536）に groups prop を追加:

```tsx
<EdgeLine
  key={`${edge.from}-${edge.to}-${i}`}
  edge={edge}
  fromNode={fromNode}
  toNode={toNode}
  isPlaying={isPlaying}
  groups={parsed.groups}
  onMoveMouseDown={handleEdgeMoveMouseDown}
  onEndpointMouseDown={handleEdgeEndpointMouseDown}
  onDoubleClick={() => {
    const line = findCodeLine("edge", edge.to, edge.from);
    if (line) setFocusLine(line);
  }}
/>
```

**Step 4: EdgeLine の memo 比較関数を更新**

行108-123 の比較関数に groups を追加:

```typescript
(prev, next) =>
  prev.edge === next.edge &&
  // ... existing comparisons ...
  prev.groups === next.groups &&
  prev.onMoveMouseDown === next.onMoveMouseDown &&
  prev.onEndpointMouseDown === next.onEndpointMouseDown &&
  prev.onDoubleClick === next.onDoubleClick,
```

**Step 5: typecheck**

```bash
docker compose exec app pnpm typecheck
```

Expected: PASS

**Step 6: コミット**

```bash
git add app/lib/react/components/EdgeLine.tsx app/lib/react/DiagramEditor.tsx
git commit -m "fix: prioritize group header drag over edge drag"
```

---

### Task 8: 全体検証

**Step 1: typecheck**

```bash
docker compose exec app pnpm typecheck
```

Expected: PASS

**Step 2: lint**

```bash
docker compose exec app pnpm lint
```

Expected: PASS（警告は許容）

**Step 3: 全テスト**

```bash
docker compose exec app pnpm test -- --run
```

Expected: ALL PASS

**Step 4: E2Eテスト**

```bash
docker compose exec app pnpm e2e
```

Expected: ALL PASS

**Step 5: ビルド**

```bash
docker compose exec app pnpm build
```

Expected: PASS
