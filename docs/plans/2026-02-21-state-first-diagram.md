# State-First Diagram Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** コードエディタから x/y/w/h を排除し、全ノードプロパティを State-First で管理。保存ボタン + localStorage + マイ作品リストを追加する。

**Architecture:**
- `nodeStates: Record<nodeId, DiagramNode>` が全ノードプロパティのソース・オブ・トゥルース
- コード変更時は parseDSL → syncNodes で nodeStates を更新（明示されたプロパティのみ上書き）
- ドラッグは nodeStates の x/y のみ更新（コードへの書き戻しなし）
- 保存は `{ name, code, nodeStates }` を localStorage に保存

**Tech Stack:** TypeScript, React hooks (useState/useEffect/useMemo), localStorage

---

## 現在のデータフロー（参考）

```
code string → parseDSL() → parsed.nodes (x/y/w/h を code から読む)
                         → autoLayout() → レンダリング
drag → setCode() で code の x= y= を正規表現で書き換え
```

## 新しいデータフロー

```
code string → parseDSL() → parsedRaw (構造情報 + _explicitProps)
                         ↓
                    syncNodes() → nodeStates (全プロパティ in state)
                         ↓
                  autoLayout() → displayNodes → レンダリング
drag → nodeStates.x/y を更新（code 変更なし）
```

---

## Task 1: types.ts に `_explicitProps` を追加

コードで明示されたプロパティを追跡するための一時フィールドを追加。レンダリングには使わない。

**Files:**
- Modify: `packages/core/src/types.ts`

**Step 1: DiagramNode に `_explicitProps` フィールドを追加**

```typescript
// packages/core/src/types.ts の DiagramNode interface に追加（最後の行の前）
export interface DiagramNode {
  id: string;
  label: string;
  shape: string;
  color: string;
  textColor: string;
  x: number;
  y: number;
  w: number;
  h: number;
  icon: string;
  group: string;
  fontSize: number;
  borderColor: string;
  borderWidth: number;
  opacity: number;
  dashed: boolean;
  _needsPosition?: boolean;
  _explicitProps?: Set<string>;  // ← 追加: コードで明示されたプロパティ名セット
}
```

**Step 2: 型チェック**

```bash
docker compose exec app pnpm -r typecheck
```

Expected: PASS（フィールド追加だけなので）

**Step 3: Commit**

```bash
git add packages/core/src/types.ts
git commit -m "feat: add _explicitProps tracking field to DiagramNode"
```

---

## Task 2: parser.ts で `_explicitProps` を記録

`parseProps` が返す props のキーを `_explicitProps` として node に記録する。`label` と `id` は常に明示扱い。

**Files:**
- Modify: `packages/core/src/parser.ts`
- Test: `packages/core/src/__tests__/parser.test.ts`

**Step 1: parser.test.ts に失敗テストを追加**

```typescript
// packages/core/src/__tests__/parser.test.ts の末尾に追加
describe("_explicitProps tracking", () => {
  it("tracks explicitly set props in node", () => {
    const result = parseDSL('node a "A" { shape=rect color=#ff0000 }');
    const node = result.nodes[0];
    expect(node._explicitProps).toBeDefined();
    expect(node._explicitProps!.has("shape")).toBe(true);
    expect(node._explicitProps!.has("color")).toBe(true);
    expect(node._explicitProps!.has("label")).toBe(true);
    expect(node._explicitProps!.has("x")).toBe(false);
    expect(node._explicitProps!.has("y")).toBe(false);
  });

  it("tracks label as always explicit", () => {
    const result = parseDSL('node b "B Label"');
    const node = result.nodes[0];
    expect(node._explicitProps!.has("label")).toBe(true);
    expect(node._explicitProps!.has("shape")).toBe(false);
  });

  it("tracks x and y when explicitly set", () => {
    const result = parseDSL('node c "C" { x=100 y=200 }');
    const node = result.nodes[0];
    expect(node._explicitProps!.has("x")).toBe(true);
    expect(node._explicitProps!.has("y")).toBe(true);
  });
});
```

**Step 2: テスト実行（失敗を確認）**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: FAIL（_explicitProps が undefined）

**Step 3: parser.ts を修正**

`parseDSL` の node パース部分（行 60〜87 付近）の `node: DiagramNode = {...}` の末尾に追加：

```typescript
// 変更箇所: node: DiagramNode = { ... } の末尾、} の直前
_explicitProps: new Set(['id', 'label', ...Object.keys(props)]),
```

例：
```typescript
const node: DiagramNode = {
  id,
  label: nodeMatch[2],
  shape: props.shape || "rect",
  color: props.color || "__RANDOM__",
  textColor: props.text || "#ffffff",
  x: hasX ? parseFloat(props.x) : NaN,
  y: hasY ? parseFloat(props.y) : NaN,
  w: parseFloat(props.w) || 150,
  h: parseFloat(props.h) || 60,
  icon: props.icon || "",
  group: props.group || "",
  fontSize: parseFloat(props.fontSize) || 13,
  borderColor: props.border || "",
  borderWidth: parseFloat(props.borderWidth) || 2,
  opacity: parseFloat(props.opacity) || 1,
  dashed: props.dashed === "true",
  _needsPosition: !hasX || !hasY,
  _explicitProps: new Set(['id', 'label', ...Object.keys(props)]),  // ← 追加
};
```

**Step 4: テスト実行（成功を確認）**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: PASS

**Step 5: 型チェック + lint**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r lint
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/core/src/parser.ts packages/core/src/__tests__/parser.test.ts
git commit -m "feat: track explicitly set properties in DSL parser"
```

---

## Task 3: formatter.ts から x/y/w/h を除外

`formatPropsString` が x, y, w, h を出力しないようにする。これによりフォーマット後のコードからレイアウト情報が除去される。

**Files:**
- Modify: `packages/core/src/formatter.ts`
- Test: `packages/core/src/__tests__/formatter.test.ts`

**Step 1: formatter.test.ts に失敗テストを追加**

```typescript
// packages/core/src/__tests__/formatter.test.ts に追加
describe("x/y/w/h exclusion", () => {
  it("formatPropsString excludes x, y, w, h", () => {
    const result = formatPropsString("shape=rect color=#fff x=100 y=200 w=150 h=60");
    expect(result).toBe("shape=rect color=#fff");
  });

  it("formatDSLCode strips x/y/w/h from node lines", () => {
    const code = 'node a "A" { shape=rect color=#6366f1 x=100 y=200 w=150 h=60 }';
    const result = formatDSLCode(code);
    expect(result).toBe('node a "A" { shape=rect color=#6366f1 }');
  });

  it("formatDSLCode preserves color in node lines", () => {
    const code = 'node a "A" { color=#ff0000 }';
    const result = formatDSLCode(code);
    expect(result).toContain("color=#ff0000");
  });
});
```

**Step 2: テスト実行（失敗を確認）**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: FAIL

**Step 3: formatter.ts の `order` 配列と除外ロジックを修正**

```typescript
// packages/core/src/formatter.ts の formatPropsString 関数
export function formatPropsString(str: string): string {
  if (!str.trim()) return "";
  const props: Record<string, string> = {};
  const LAYOUT_PROPS = new Set(["x", "y", "w", "h"]);  // ← 追加
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|(\S+))/g;
  const order = [
    "shape", "color", "text", "border", "borderWidth",
    // "x", "y", "w", "h" を削除
    "icon", "group", "fontSize", "opacity", "dashed",
    "label", "style", "animate", "thickness", "arrow", "curve",
  ];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(str)) !== null) {
    if (!LAYOUT_PROPS.has(m[1])) {  // ← x/y/w/h をスキップ
      props[m[1]] = m[2] !== undefined ? `"${m[2]}"` : m[3];
    }
  }
  const keys = Object.keys(props);
  keys.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return keys.map((k) => `${k}=${props[k]}`).join(" ");
}
```

**Step 4: テスト実行（成功を確認）**

```bash
docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: PASS（既存テストも含めて全部通ること）

**Step 5: 型チェック + lint**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r lint
```

**Step 6: Commit**

```bash
git add packages/core/src/formatter.ts packages/core/src/__tests__/formatter.test.ts
git commit -m "feat: exclude x/y/w/h from formatter output (layout managed by state)"
```

---

## Task 4: `syncNodes` ユーティリティ関数を作成

コード変更時に nodeStates を更新するための純粋関数。`packages/react` に追加。

**Files:**
- Create: `packages/react/src/hooks/syncNodes.ts`

**Step 1: syncNodes.ts を作成**

```typescript
// packages/react/src/hooks/syncNodes.ts
import type { DiagramNode } from "diagram-dsl-core";

const DEFAULT_NODE: Omit<DiagramNode, 'id' | 'label'> = {
  shape: "rect",
  color: "#6366f1",
  textColor: "#ffffff",
  x: NaN,
  y: NaN,
  w: 150,
  h: 60,
  icon: "",
  group: "",
  fontSize: 13,
  borderColor: "",
  borderWidth: 2,
  opacity: 1,
  dashed: false,
  _needsPosition: true,
};

/**
 * コード変更時に nodeStates を更新する純粋関数。
 * - 新規ノード: parsedNode の値で初期化（_needsPosition: true）
 * - 既存ノード: コードで明示されたプロパティのみ更新、それ以外（x/y/w/h 等）は維持
 * - 削除されたノード: result に含めない
 */
export function syncNodes(
  parsedNodes: DiagramNode[],
  prevStates: Record<string, DiagramNode>
): Record<string, DiagramNode> {
  const result: Record<string, DiagramNode> = {};

  for (const parsed of parsedNodes) {
    const explicit = parsed._explicitProps ?? new Set<string>();
    const prev = prevStates[parsed.id];

    if (!prev) {
      // 新規ノード: parsedNode の値（デフォルト含む）で初期化
      const { _explicitProps: _, ...nodeData } = parsed;
      result[parsed.id] = {
        ...DEFAULT_NODE,
        ...nodeData,
        _needsPosition: !Number.isFinite(nodeData.x) || !Number.isFinite(nodeData.y),
      };
    } else {
      // 既存ノード: 明示されたプロパティのみ上書き
      const updates: Partial<DiagramNode> = {};
      explicit.forEach((key) => {
        (updates as Record<string, unknown>)[key] = (parsed as Record<string, unknown>)[key];
      });
      const { _explicitProps: _, ...prevClean } = prev;
      result[parsed.id] = { ...prevClean, ...updates };
    }
  }

  return result;
}
```

**Step 2: 型チェック + lint**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r lint
```

Expected: PASS

**Step 3: Commit**

```bash
git add packages/react/src/hooks/syncNodes.ts
git commit -m "feat: add syncNodes utility for state-first node management"
```

---

## Task 5: `useDiagramState.ts` を State-First に全面改修

`nodeStates` を State として持ち、コード変更時に `syncNodes` を呼ぶ。ドラッグ用の `setNodeLayout` を公開。

**Files:**
- Modify: `packages/react/src/hooks/useDiagramState.ts`

**Step 1: useDiagramState.ts を全面書き換え**

```typescript
// packages/react/src/hooks/useDiagramState.ts
import { useState, useMemo, useEffect, useRef } from "react";
import {
  parseDSL,
  autoLayout,
  formatDSLCode,
  generateExportSVG,
  randomColor,
  TEMPLATES,
} from "diagram-dsl-core";
import type { ParseResult, DiagramNode } from "diagram-dsl-core";
import { syncNodes } from "./syncNodes.js";

export function useDiagramState(initialCode?: string) {
  const [code, setCode] = useState(initialCode ?? TEMPLATES.architecture);
  const [nodeStates, setNodeStates] = useState<Record<string, DiagramNode>>({});

  // コードをパース（構造情報のみ: edges, groups, notes + 明示プロパティを持つ nodes）
  const parsedRaw = useMemo(() => parseDSL(code), [code]);

  // コード変更時に nodeStates を同期
  useEffect(() => {
    setNodeStates((prev) => syncNodes(parsedRaw.nodes, prev));
  }, [parsedRaw]);

  // レンダリング用 displayNodes: nodeStates の値に autoLayout を適用
  const displayNodes = useMemo(() => {
    const nodes = parsedRaw.nodes
      .filter((n) => nodeStates[n.id] !== undefined)
      .map((n) => ({ ...nodeStates[n.id] }));
    return autoLayout(nodes, parsedRaw.edges);
  }, [parsedRaw, nodeStates]);

  // autoLayout が割り当てた位置を nodeStates に保存（_needsPosition のノードのみ）
  const prevDisplayNodesRef = useRef<DiagramNode[]>([]);
  useEffect(() => {
    const updates: Record<string, DiagramNode> = {};
    for (const node of displayNodes) {
      if (nodeStates[node.id]?._needsPosition) {
        updates[node.id] = { ...node, _needsPosition: false };
      }
    }
    if (Object.keys(updates).length > 0) {
      setNodeStates((prev) => ({ ...prev, ...updates }));
    }
    prevDisplayNodesRef.current = displayNodes;
  }, [displayNodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // 最終的な parsed（consumers はこれを使う）
  const parsed: ParseResult = useMemo(
    () => ({ ...parsedRaw, nodes: displayNodes }),
    [parsedRaw, displayNodes]
  );

  const nodeById = useMemo(() => {
    const map: Record<string, DiagramNode> = {};
    displayNodes.forEach((n) => (map[n.id] = n));
    return map;
  }, [displayNodes]);

  // ドラッグ用: nodeStates の x/y を更新（コード変更なし）
  const setNodeLayout = (nodeId: string, x: number, y: number) => {
    setNodeStates((prev) => {
      const node = prev[nodeId];
      if (!node) return prev;
      return { ...prev, [nodeId]: { ...node, x, y } };
    });
  };

  // ノード追加: コードには shape のみ、位置は nodeStates に追加（autoLayout 任せ）
  const addNode = (shape: string) => {
    const id = `n${Date.now().toString(36)}`;
    const col = randomColor();
    const newLine = `\nnode ${id} "新規ノード" { shape=${shape} color=${col} }`;
    setCode((c) => c + newLine);
    // nodeStates の初期化は syncNodes の effect で行われる
  };

  const exportSVG = () => {
    const svgData = generateExportSVG(parsed);
    if (!svgData) return;
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCode = () => setCode((c) => formatDSLCode(c));

  // テンプレート読み込み: コードをフォーマット（x/y/w/h 除去）してセット
  // nodeStates は parsedRaw の effect で自動的に x/y/w/h 付きで初期化される
  const loadTemplate = (templateCode: string) => {
    // テンプレートのコードをパースして x/y/w/h をシード値として nodeStates に設定
    const tempParsed = parseDSL(templateCode);
    const initialStates: Record<string, DiagramNode> = {};
    for (const node of tempParsed.nodes) {
      const { _explicitProps: _, ...nodeData } = node;
      initialStates[node.id] = {
        ...nodeData,
        _needsPosition: !Number.isFinite(nodeData.x) || !Number.isFinite(nodeData.y),
      };
    }
    // nodeStates を先に設定してから、フォーマット済みコード（x/y/w/h なし）をセット
    setNodeStates(initialStates);
    setCode(formatDSLCode(templateCode));
  };

  // 保存済みダイアグラムを読み込む
  const loadSaved = (savedCode: string, savedNodeStates: Record<string, DiagramNode>) => {
    setNodeStates(savedNodeStates);
    setCode(savedCode);
  };

  return {
    code,
    setCode,
    parsed,
    nodeById,
    nodeStates,
    setNodeLayout,
    addNode,
    exportSVG,
    formatCode,
    loadTemplate,
    loadSaved,
  };
}
```

**Step 2: 型チェック + lint**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r lint
```

Expected: 型エラーが出る可能性あり（useNodeDrag がまだ setCode を使っているため）。確認して次タスクで修正。

**Step 3: Commit（型エラーがなければ）**

```bash
git add packages/react/src/hooks/useDiagramState.ts
git commit -m "feat: rewrite useDiagramState with state-first node management"
```

---

## Task 6: `useNodeDrag.ts` を `setNodeLayout` ベースに変更

ドラッグ時に code を書き換える代わりに `setNodeLayout` を呼ぶ。

**Files:**
- Modify: `packages/react/src/hooks/useNodeDrag.ts`

**Step 1: useNodeDrag.ts を書き換え**

```typescript
// packages/react/src/hooks/useNodeDrag.ts
import { useState, useEffect } from "react";
import type { DiagramNode } from "diagram-dsl-core";

interface DragInfo {
  nodeId: string;
  startX: number;
  startY: number;
}

export function useNodeDrag(
  nodeById: Record<string, DiagramNode>,
  zoom: number,
  setNodeLayout: (nodeId: string, x: number, y: number) => void  // ← setCode から変更
) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button === 1 || e.button === 2) return;
    setSelectedNodeId(nodeId);
    setDragInfo({ nodeId, startX: e.clientX, startY: e.clientY });
  };

  useEffect(() => {
    if (!dragInfo) return;
    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragInfo.startX) / zoom;
      const dy = (e.clientY - dragInfo.startY) / zoom;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      const node = nodeById[dragInfo.nodeId];
      if (!node) return;
      const newX = Math.round(node.x + dx);
      const newY = Math.round(node.y + dy);

      setNodeLayout(dragInfo.nodeId, newX, newY);  // ← setCode の代わりに setNodeLayout
      setDragInfo((d) => (d ? { ...d, startX: e.clientX, startY: e.clientY } : null));
    };
    const handleUp = () => setDragInfo(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragInfo, nodeById, zoom, setNodeLayout]);

  return { selectedNodeId, setSelectedNodeId, handleNodeMouseDown };
}
```

**Step 2: 型チェック + lint**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r lint
```

Expected: PASS（DiagramEditor.tsx の useNodeDrag 呼び出し修正が必要な場合は次 task で対応）

**Step 3: Commit**

```bash
git add packages/react/src/hooks/useNodeDrag.ts
git commit -m "feat: update useNodeDrag to use setNodeLayout (no code write-back)"
```

---

## Task 7: `DiagramEditor.tsx` の useNodeDrag 呼び出しを更新

`setCode` → `setNodeLayout` に変更し、テンプレートボタンを `loadTemplate` を使うよう更新。

**Files:**
- Modify: `packages/react/src/DiagramEditor.tsx`

**Step 1: DiagramEditor.tsx の以下の部分を修正**

1. `useDiagramState` の戻り値に `setNodeLayout` と `loadTemplate` を追加:
```typescript
const { code, setCode, parsed, nodeById, setNodeLayout, addNode, exportSVG, formatCode, loadTemplate } =
  useDiagramState(initialCode);
```

2. `useNodeDrag` の呼び出しを `setCode` から `setNodeLayout` に変更:
```typescript
const { selectedNodeId, setSelectedNodeId, handleNodeMouseDown } =
  useNodeDrag(nodeById, zoom, setNodeLayout);
```

3. テンプレートボタンの `onClick` を `loadTemplate` に変更:
```typescript
// 変更前:
onClick={() => setCode(val)}
// 変更後:
onClick={() => loadTemplate(val)}
```

4. `+ 新規` ボタンも同様:
```typescript
// 変更前:
onClick={() => setCode(TEMPLATES.empty)}
// 変更後:
onClick={() => loadTemplate(TEMPLATES.empty)}
```

**Step 2: 型チェック + lint + ビルド**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r lint && docker compose exec app pnpm -r build
```

Expected: PASS

**Step 3: 動作確認（ブラウザで http://localhost:5173 を確認）**
- テンプレートをクリック → 表示されること
- ノードをドラッグ → コードが変わらず位置だけ動くこと
- コードを編集（color= など）→ ダイアグラムに反映されること

**Step 4: Commit**

```bash
git add packages/react/src/DiagramEditor.tsx
git commit -m "feat: update DiagramEditor to use loadTemplate and setNodeLayout"
```

---

## Task 8: `useLocalDiagrams.ts` フックを作成

localStorage への保存・読み込み・削除を管理する hook。

**Files:**
- Create: `packages/react/src/hooks/useLocalDiagrams.ts`

**Step 1: useLocalDiagrams.ts を作成**

```typescript
// packages/react/src/hooks/useLocalDiagrams.ts
import { useState, useCallback } from "react";
import type { DiagramNode } from "diagram-dsl-core";

const STORAGE_KEY = "diagramcraft_saved_diagrams";

export interface SavedDiagram {
  id: string;
  name: string;
  code: string;
  nodeStates: Record<string, DiagramNode>;
  savedAt: number;
}

function loadFromStorage(): SavedDiagram[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedDiagram[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(diagrams: SavedDiagram[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
}

export function useLocalDiagrams() {
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>(loadFromStorage);

  const saveDiagram = useCallback(
    (name: string, code: string, nodeStates: Record<string, DiagramNode>) => {
      setSavedDiagrams((prev) => {
        const existing = prev.findIndex((d) => d.name === name);
        const entry: SavedDiagram = {
          id: existing >= 0 ? prev[existing].id : `d${Date.now()}`,
          name,
          code,
          nodeStates,
          savedAt: Date.now(),
        };
        const next = existing >= 0
          ? prev.map((d, i) => (i === existing ? entry : d))
          : [...prev, entry];
        saveToStorage(next);
        return next;
      });
    },
    []
  );

  const deleteDiagram = useCallback((id: string) => {
    setSavedDiagrams((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  return { savedDiagrams, saveDiagram, deleteDiagram };
}
```

**Step 2: 型チェック + lint**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r lint
```

Expected: PASS

**Step 3: Commit**

```bash
git add packages/react/src/hooks/useLocalDiagrams.ts
git commit -m "feat: add useLocalDiagrams hook for localStorage persistence"
```

---

## Task 9: `SaveModal.tsx` コンポーネントを作成

保存名入力ダイアログ。同名上書き確認あり。インラインスタイルのみ使用（Tailwind 不可）。

**Files:**
- Create: `packages/react/src/components/SaveModal.tsx`

**Step 1: SaveModal.tsx を作成**

```typescript
// packages/react/src/components/SaveModal.tsx
import { useState, useEffect, useRef } from "react";

interface SaveModalProps {
  existingNames: string[];
  onSave: (name: string) => void;
  onClose: () => void;
}

export function SaveModal({ existingNames, onSave, onClose }: SaveModalProps) {
  const [name, setName] = useState("");
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.includes(trimmed) && !showOverwriteWarning) {
      setShowOverwriteWarning(true);
      return;
    }
    onSave(trimmed);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#0f1219", border: "1px solid #2d3548",
          borderRadius: 10, padding: "24px 28px", minWidth: 320,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>
          ダイアグラムを保存
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => { setName(e.target.value); setShowOverwriteWarning(false); }}
          onKeyDown={handleKeyDown}
          placeholder="名前を入力"
          style={{
            width: "100%", background: "#131720", border: "1px solid #2d3548",
            borderRadius: 6, padding: "8px 12px", color: "#e2e8f0",
            fontSize: 13, outline: "none", boxSizing: "border-box",
          }}
        />
        {showOverwriteWarning && (
          <div style={{ fontSize: 11, color: "#f87171", marginTop: 8 }}>
            「{name}」はすでに存在します。上書きしますか？
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid #2d3548",
              color: "#64748b", padding: "6px 14px", borderRadius: 5,
              cursor: "pointer", fontSize: 12,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            style={{
              background: name.trim() ? "#4338ca" : "#1e293b",
              border: "none", color: name.trim() ? "#e0e7ff" : "#475569",
              padding: "6px 14px", borderRadius: 5, cursor: name.trim() ? "pointer" : "default",
              fontSize: 12, fontWeight: 600,
            }}
          >
            {showOverwriteWarning ? "上書き保存" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 型チェック + lint**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r lint
```

**Step 3: Commit**

```bash
git add packages/react/src/components/SaveModal.tsx
git commit -m "feat: add SaveModal component for diagram naming"
```

---

## Task 10: DiagramEditor に保存・マイ作品 UI を統合

ヘッダーに「保存」ボタンと「マイ作品 ▼」ドロップダウンを追加。

**Files:**
- Modify: `packages/react/src/DiagramEditor.tsx`

**Step 1: DiagramEditor.tsx に以下のインポートと state を追加**

```typescript
// 既存のインポートに追加
import { SaveModal } from "./components/SaveModal.js";
import { useLocalDiagrams } from "./hooks/useLocalDiagrams.js";
```

`DiagramEditor` 関数内に追加：
```typescript
// 既存の state 群の後ろに追加
const [showSaveModal, setShowSaveModal] = useState(false);
const [showMyDiagrams, setShowMyDiagrams] = useState(false);
const { savedDiagrams, saveDiagram, deleteDiagram } = useLocalDiagrams();

// useDiagramState の戻り値に nodeStates と loadSaved を追加
const { code, setCode, parsed, nodeById, nodeStates, setNodeLayout, addNode, exportSVG, formatCode, loadTemplate, loadSaved } =
  useDiagramState(initialCode);
```

**Step 2: ヘッダーに「保存」ボタンと「マイ作品」ドロップダウンを追加**

ヘッダーの `<div style={{ flex: 1 }} />` の直前（テンプレートリストの直後）に追加：

```typescript
{/* マイ作品ドロップダウン */}
<div style={{ position: "relative" }}>
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
        position: "absolute", top: "calc(100% + 4px)", left: 0,
        background: "#0f1219", border: "1px solid #2d3548",
        borderRadius: 8, minWidth: 220, zIndex: 100,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)", overflow: "hidden",
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
              display: "flex", alignItems: "center",
              padding: "8px 12px", borderBottom: "1px solid #1e293b",
              gap: 8,
            }}
          >
            <div
              onClick={() => { loadSaved(d.code, d.nodeStates); setShowMyDiagrams(false); }}
              style={{
                flex: 1, cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{d.name}</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                {new Date(d.savedAt).toLocaleDateString("ja-JP")}
              </div>
            </div>
            <button
              onClick={() => deleteDiagram(d.id)}
              style={{
                background: "transparent", border: "none",
                color: "#475569", cursor: "pointer", fontSize: 14,
                padding: "2px 4px", borderRadius: 3,
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
  onClick={() => setShowSaveModal(true)}
  style={{
    background: "#312e81", border: "1px solid #4338ca",
    color: "#c7d2fe", padding: "3px 12px",
    borderRadius: 5, cursor: "pointer",
    fontSize: 11, fontWeight: 600,
  }}
>
  保存
</button>
```

**Step 3: 「構文ヘルプ」ボタンの前に `<div style={{ flex: 1 }} />` が来るよう確認（レイアウト調整）**

**Step 4: `SaveModal` を `DiagramEditor` の return 末尾に追加**

```typescript
{/* 既存の </div> の直後（return の閉じタグ直前）に追加 */}
{showSaveModal && (
  <SaveModal
    existingNames={savedDiagrams.map((d) => d.name)}
    onSave={(name) => saveDiagram(name, code, nodeStates)}
    onClose={() => setShowSaveModal(false)}
  />
)}
```

**Step 5: ドロップダウン外クリックで閉じる処理を追加**

`DiagramEditor` 関数内に追加：
```typescript
// showMyDiagrams 外クリックで閉じる
useEffect(() => {
  if (!showMyDiagrams) return;
  const handle = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-my-diagrams]")) setShowMyDiagrams(false);
  };
  document.addEventListener("mousedown", handle);
  return () => document.removeEventListener("mousedown", handle);
}, [showMyDiagrams]);
```

マイ作品ドロップダウンの `<div style={{ position: "relative" }}>` に `data-my-diagrams=""` 属性を追加。

**Step 6: 型チェック + lint + ビルド**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r lint && docker compose exec app pnpm -r build
```

Expected: PASS

**Step 7: 動作確認**
1. 「保存」ボタン → 名前入力ダイアログが出る
2. 名前を入力して保存 → 「マイ作品 (1)」になる
3. 「マイ作品 ▾」クリック → 保存したものが表示される
4. 保存したものをクリック → ダイアグラムが復元される
5. 同名で保存 → 「上書き保存」確認が出る
6. × ボタン → 削除される

**Step 8: Commit**

```bash
git add packages/react/src/DiagramEditor.tsx
git commit -m "feat: add save button and my diagrams list to DiagramEditor"
```

---

## Task 11: index.ts を更新して新しい hooks/types を公開

新しく追加したフックや型を export する。

**Files:**
- Modify: `packages/react/src/index.ts`

**Step 1: index.ts を確認・更新**

```typescript
// packages/react/src/index.ts を確認して、以下が export されていることを確認
export type { SavedDiagram } from "./hooks/useLocalDiagrams.js";
export { useLocalDiagrams } from "./hooks/useLocalDiagrams.js";
```

必要なら追加する。

**Step 2: 最終ビルドと型チェック**

```bash
docker compose exec app pnpm -r typecheck && docker compose exec app pnpm -r lint && docker compose exec app pnpm -r build && docker compose exec app pnpm --filter diagram-dsl-core test
```

Expected: ALL PASS

**Step 3: Final Commit**

```bash
git add packages/react/src/index.ts
git commit -m "feat: export SavedDiagram type and useLocalDiagrams from react package"
```

---

## 完了チェックリスト

- [ ] コードエディタに x/y/w/h が表示されない（テンプレート含む）
- [ ] color= はコードに残り編集可能
- [ ] ドラッグで位置が変わってもコードが変わらない
- [ ] 「保存」ボタンが機能する（名前入力 → localStorage 保存）
- [ ] 同名上書き確認が動作する
- [ ] 「マイ作品」リストに保存済みが表示される
- [ ] マイ作品から読み込みできる
- [ ] 削除できる
- [ ] 全テスト PASS
- [ ] 型チェック PASS
- [ ] lint PASS
- [ ] ビルド PASS
